"""Privacy retention and pending account deletion.

All operations run on the server. Scheduled purge is bounded and idempotent,
and never removes a user record before owned resources have been cleaned.
"""
from datetime import datetime, timedelta, timezone
from contextlib import ExitStack
import hmac
import os

from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException, Request, Response
from pydantic import BaseModel, Field
from pymongo.errors import PyMongoError

from backend.api.database import get_db, database_error
from backend.api.routes.auth import get_current_user, find_user, passwords
from backend.api.security import enforce_limit
from backend.api.realtime import (
    assert_realtime_access_lock, notebook_lock, notebook_room, realtime_access_lock,
)

router = APIRouter()
RETENTION_CHOICES = (5, 15, 30)
ACCOUNT_GRACE_DAYS = 30


def require_cleanup_scheduler() -> None:
    # Never accept irreversible account requests when no worker can run.
    if not os.getenv("CRON_SECRET", "").strip():
        raise HTTPException(503, "Scheduled privacy cleanup is not configured")


class RetentionChoice(BaseModel):
    days: int | None = Field(default=None)


class AccountDeletionRequest(BaseModel):
    confirmation: str
    current_password: str | None = None


def retention_days(user: dict) -> int | None:
    # Legacy accounts are opt-in: never delete their existing history on deployment.
    days = user.get("retention_days")
    return days if type(days) is int and days in RETENTION_CHOICES else None


def now_utc() -> datetime:
    return datetime.now(timezone.utc)


@router.get("/retention")
def get_retention(user_id: str = Depends(get_current_user)):
    user = find_user(user_id)
    return {"days": retention_days(user), "choices": list(RETENTION_CHOICES),
            "available": bool(os.getenv("CRON_SECRET", "").strip())}


@router.patch("/retention")
def update_retention(data: RetentionChoice, user_id: str = Depends(get_current_user)):
    require_cleanup_scheduler()
    if data.days is not None and data.days not in RETENTION_CHOICES:
        raise HTTPException(422, "Choose 5, 15 or 30 days")
    get_db().users.update_one({"_id": ObjectId(user_id), "deletion_due_at": {"$exists": False}},
                              {"$set": {"retention_days": data.days}})
    return {"days": data.days, "choices": list(RETENTION_CHOICES)}


@router.post("/account/delete", status_code=202)
def request_account_deletion(payload: AccountDeletionRequest, response: Response,
                             request: Request, user_id: str = Depends(get_current_user)):
    """Disable account immediately and queue permanent removal after 30 days."""
    require_cleanup_scheduler()
    enforce_limit(request, "account-deletion", maximum=3,
                  account_maximum=3, window_seconds=3600, identity=user_id)
    if payload.confirmation != "DELETE":
        raise HTTPException(422, "Type DELETE to confirm")
    user = find_user(user_id)
    if user.get("password_hash"):
        if not payload.current_password or not passwords.verify(
                payload.current_password, user["password_hash"]):
            raise HTTPException(403, "Current password required")
    elif not user.get("google_id"):
        raise HTTPException(403, "Account identity must be verified")
    now = now_utc()
    due = now + timedelta(days=ACCOUNT_GRACE_DAYS)
    updated = get_db().users.update_one(
        {"_id": user["_id"], "deletion_due_at": {"$exists": False}},
        {"$set": {"deletion_requested_at": now, "deletion_due_at": due},
         "$inc": {"session_version": 1}})
    if not updated.modified_count:
        raise HTTPException(409, "Account deletion was already requested")
    response.delete_cookie("lifeorbital_auth", path="/api", secure=True,
                           httponly=True, samesite=os.getenv("AUTH_COOKIE_SAMESITE", "strict").lower())
    return {"scheduled": True, "days": 30, "due_at": due.isoformat()}


def purge_expired_items(db, now: datetime, max_users: int = 200) -> dict:
    """Bounded daily sweep; never auto-delete incomplete or undated tasks."""
    today = now.date()
    counts = {"tasks": 0, "events": 0, "users_checked": 0}
    checkpoint = db.privacy_jobs.find_one({"_id": "retention"}) or {}
    scope = {"deletion_due_at": {"$exists": False}}
    if checkpoint.get("cursor"):
        scope["_id"] = {"$gt": checkpoint["cursor"]}
    batch = list(db.users.find(scope, {"_id": 1, "retention_days": 1})
                 .sort("_id", 1).limit(max_users))
    if not batch:
        db.privacy_jobs.update_one({"_id": "retention"},
                                   {"$unset": {"cursor": ""}}, upsert=True)
    for user in batch:
        uid = str(user["_id"])
        days = retention_days(user)
        if days is None:
            continue
        cutoff = now - timedelta(days=days)
        # Backward-compatible only for tasks completed after the timestamp
        # tracking change; old done tasks are preserved rather than guessed.
        result = db.tasks.delete_many(
            {"user_id": uid, "done": True, "completed_at": {"$lte": cutoff}})
        counts["tasks"] += result.deleted_count
        # ISO calendar date strings are sortable. Delete only dates strictly
        # before the complete retention window in UTC, conservatively.
        date_limit = (today - timedelta(days=days)).isoformat()
        expired = list(db.events.find(
            {"user_id": uid, "date": {"$lt": date_limit}},
            {"_id": 1}).limit(1000))
        if expired:
            for event in expired:
                with db.client.start_session() as session:
                    with session.start_transaction():
                        deleted = db.events.find_one_and_delete(
                            {"_id": event["_id"], "user_id": uid, "date": {"$lt": date_limit}},
                            session=session)
                        if deleted:
                            db.shares.delete_many({"owner": uid, "kind": "event",
                                                   "resource_id": str(event["_id"])}, session=session)
                if deleted:
                    counts["events"] += 1
        counts["users_checked"] += 1
    if batch:
        remaining = db.users.find_one(
            {"deletion_due_at": {"$exists": False},
             "_id": {"$gt": batch[-1]["_id"]}}, {"_id": 1})
        progress = ({"$set": {"cursor": batch[-1]["_id"]}} if remaining
                    else {"$unset": {"cursor": ""}})
        db.privacy_jobs.update_one({"_id": "retention"}, progress, upsert=True)
    return counts


def purge_account(db, user: dict) -> bool:
    """Clean all known owned data first; deletion can be retried safely."""
    uid = str(user["_id"])
    # Provider-authoritative external rooms need an explicit provider cleanup.
    # Refuse to promise complete deletion when such rooms still exist.
    owned = list(db.shared_notebooks.find({"owner": uid}, {"_id": 1}).limit(1000))
    for row in owned:
        notebook_id = str(row["_id"])
        with notebook_lock(db, notebook_id):
            if db.realtime_notebooks.find_one({"_id": notebook_room(notebook_id)}):
                return False
            db.notebook_crdts.delete_one({"_id": notebook_id})
            db.shared_notebooks.delete_one({"_id": row["_id"], "owner": uid})
    if db.shared_notebooks.find_one({"owner": uid}, {"_id": 1}):
        return False
    # Lock each friendship pair before scanning memberships so no invitation
    # can add a new notebook membership during the final cleanup check.
    friendships = list(db.friendships.find(
        {"$or": [{"sender": uid}, {"recipient": uid}]},
        {"sender": 1, "recipient": 1}).limit(1000))
    memberships = list(db.shared_notebooks.find(
        {"members": uid}, {"owner": 1}).limit(1000))
    friends = {
        row["recipient"] if row["sender"] == uid else row["sender"]
        for row in friendships if row.get("sender") != row.get("recipient")
    }
    friends.update(book["owner"] for book in memberships if book.get("owner") != uid)
    for other in sorted(friends):
        pair = "-".join(sorted((uid, other)))
        with realtime_access_lock(db, uid, other):
            impacted = list(db.shared_notebooks.find(
                {"owner": other, "members": uid}, {"_id": 1}).limit(1000))
            with ExitStack() as locks:
                for book in sorted(impacted, key=lambda item: str(item["_id"])):
                    locks.enter_context(notebook_lock(db, str(book["_id"])))
                impacted = list(db.shared_notebooks.find(
                    {"owner": other, "members": uid}, {"_id": 1}).limit(1000))
                if any(db.realtime_notebooks.find_one(
                        {"_id": notebook_room(str(book["_id"]))}) for book in impacted):
                    return False
                assert_realtime_access_lock(db, uid, other)
                db.friendships.delete_many({"$or": [
                    {"pair": pair}, {"sender": uid, "recipient": other},
                    {"sender": other, "recipient": uid},
                ]})
                db.shares.delete_many({"$or": [
                    {"owner": uid, "recipient": other},
                    {"owner": other, "recipient": uid},
                ]})
                for book in impacted:
                    db.shared_notebooks.update_one(
                        {"_id": book["_id"], "owner": other},
                        {"$pull": {"members": uid}})
    if db.shared_notebooks.find_one({"members": uid}, {"_id": 1}):
        return False
    if db.friendships.find_one(
            {"$or": [{"sender": uid}, {"recipient": uid}]}, {"_id": 1}):
        return False
    db.shares.delete_many({"$or": [{"owner": uid}, {"recipient": uid}]})
    for collection in ("tasks", "events", "workspaces", "calendar_feeds",
                       "notification_state", "password_reset_tokens"):
        db[collection].delete_many({"user_id": uid})
    # Some token records use user_id in ObjectId form; remove both types.
    db.password_reset_tokens.delete_many({"user_id": user["_id"]})
    result = db.users.delete_one({"_id": user["_id"], "deletion_due_at": {"$lte": now_utc()}})
    return result.deleted_count == 1


def purge_due_accounts(db, now: datetime, max_accounts: int = 30) -> dict:
    counts = {"deleted": 0, "blocked": 0}
    scope = {"deletion_due_at": {"$lte": now},
             "$or": [{"deletion_retry_after": {"$exists": False}},
                     {"deletion_retry_after": {"$lte": now}}]}
    for account in db.users.find(scope).sort([("deletion_retry_after", 1),
                                             ("deletion_due_at", 1)]).limit(max_accounts):
        try:
            if purge_account(db, account):
                counts["deleted"] += 1
                continue
        except HTTPException as exc:
            if exc.status_code != 409:
                raise
        except PyMongoError:
            pass
        counts["blocked"] += 1
        db.users.update_one({"_id": account["_id"]}, {"$set": {
            "deletion_retry_after": now + timedelta(hours=24)}})
    return counts


@router.get("/cron/retention")
def retention_cron(request: Request):
    """Vercel Cron authenticated with an independent server-side bearer secret."""
    token = os.getenv("CRON_SECRET", "")
    received = request.headers.get("authorization", "")
    if not token:
        raise HTTPException(503, "Retention scheduler not configured")
    if not hmac.compare_digest(received, "Bearer " + token):
        raise HTTPException(401, "Unauthorized")
    try:
        db = get_db()
        now = now_utc()
        items = purge_expired_items(db, now)
        accounts = purge_due_accounts(db, now)
        return {"ok": True, "retention": items, "accounts": accounts}
    except PyMongoError as exc:
        database_error(exc)
