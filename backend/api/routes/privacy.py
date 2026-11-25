"""Privacy retention and pending account deletion.

All operations run on the server. Scheduled purge is bounded and idempotent,
and never removes a user record before owned resources have been cleaned.
"""
from datetime import datetime, timedelta, timezone
import hmac
import os

from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException, Request, Response
from pydantic import BaseModel, Field
from pymongo.errors import PyMongoError

from backend.api.database import get_db, database_error
from backend.api.routes.auth import get_current_user, find_user, passwords
from backend.api.security import enforce_limit

router = APIRouter()
RETENTION_CHOICES = (5, 15, 30)
ACCOUNT_GRACE_DAYS = 30


class RetentionChoice(BaseModel):
    days: int = Field(ge=5, le=30)


class AccountDeletionRequest(BaseModel):
    confirmation: str
    current_password: str | None = None


def retention_days(user: dict) -> int:
    days = user.get("retention_days", 30)
    return days if type(days) is int and days in RETENTION_CHOICES else 30


def now_utc() -> datetime:
    return datetime.now(timezone.utc)


@router.get("/retention")
def get_retention(user_id: str = Depends(get_current_user)):
    user = find_user(user_id)
    return {"days": retention_days(user), "choices": list(RETENTION_CHOICES)}


@router.patch("/retention")
def update_retention(data: RetentionChoice, user_id: str = Depends(get_current_user)):
    if data.days not in RETENTION_CHOICES:
        raise HTTPException(422, "Choose 5, 15 or 30 days")
    get_db().users.update_one({"_id": ObjectId(user_id), "deletion_due_at": {"$exists": False}},
                              {"$set": {"retention_days": data.days}})
    return {"days": data.days, "choices": list(RETENTION_CHOICES)}


@router.post("/account/delete", status_code=202)
def request_account_deletion(payload: AccountDeletionRequest, response: Response,
                             request: Request, user_id: str = Depends(get_current_user)):
    """Disable account immediately and queue permanent removal after 30 days."""
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
    for user in db.users.find(
        {"deletion_due_at": {"$exists": False}},
        {"_id": 1, "retention_days": 1},
    ).limit(max_users):
        uid = str(user["_id"])
        days = retention_days(user)
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
            ids = [str(e["_id"]) for e in expired]
            db.shares.delete_many({"owner": uid, "kind": "event", "resource_id": {"$in": ids}})
            counts["events"] += db.events.delete_many(
                {"user_id": uid, "_id": {"$in": [e["_id"] for e in expired]}}).deleted_count
        counts["users_checked"] += 1
    return counts


def purge_account(db, user: dict) -> bool:
    """Clean all known owned data first; deletion can be retried safely."""
    uid = str(user["_id"])
    owned = list(db.shared_notebooks.find({"owner": uid}, {"_id": 1}).limit(1000))
    owned_ids = [str(row["_id"]) for row in owned]
    # Provider-authoritative external rooms need an explicit provider cleanup.
    # Refuse to promise complete deletion when such rooms still exist.
    for notebook_id in owned_ids:
        room = db.realtime_notebooks.find_one({"_id": f"notebook:{notebook_id}"})
        if room and room.get("status") == "ready":
            return False
    for notebook_id in owned_ids:
        db.notebook_crdts.delete_one({"_id": notebook_id})
        db.realtime_notebooks.delete_one({"_id": f"notebook:{notebook_id}"})
    db.shared_notebooks.delete_many({"owner": uid})
    db.shared_notebooks.update_many({"members": uid}, {"$pull": {"members": uid}})
    db.shares.delete_many({"$or": [{"owner": uid}, {"recipient": uid}]})
    db.friendships.delete_many({"$or": [{"sender": uid}, {"recipient": uid}]})
    for collection in ("tasks", "events", "workspaces", "calendar_feeds",
                       "notification_state", "password_reset_tokens"):
        db[collection].delete_many({"user_id": uid})
    # Some token records use user_id in ObjectId form; remove both types.
    db.password_reset_tokens.delete_many({"user_id": user["_id"]})
    db.users.delete_one({"_id": user["_id"], "deletion_due_at": {"$lte": now_utc()}})
    return True


def purge_due_accounts(db, now: datetime, max_accounts: int = 30) -> dict:
    counts = {"deleted": 0, "blocked": 0}
    for account in db.users.find({"deletion_due_at": {"$lte": now}}).limit(max_accounts):
        try:
            if purge_account(db, account):
                counts["deleted"] += 1
            else:
                counts["blocked"] += 1
        except PyMongoError:
            counts["blocked"] += 1
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
