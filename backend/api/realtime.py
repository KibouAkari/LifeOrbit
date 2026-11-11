"""Server-authorized Liveblocks rooms and idempotent Yjs notebook migration.

All room permissions are derived from MongoDB membership. The external secret
never leaves the backend. Realtime remains disabled unless explicitly enabled.
"""
from datetime import datetime, timedelta, timezone
from urllib.parse import quote
import logging
import os
import uuid

import requests
from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel, Field
from pymongo import ReturnDocument
from pymongo.errors import DuplicateKeyError

from backend.api.database import get_db
from backend.api.routes.auth import find_user, get_current_user
from backend.api.security import enforce_limit

router = APIRouter()
logger = logging.getLogger(__name__)
BASE = "https://api.liveblocks.io/v2"


def configured() -> bool:
    return os.getenv("ENABLE_REALTIME") == "true" and bool(os.getenv("LIVEBLOCKS_SECRET_KEY"))


def require_enabled():
    if not configured():
        raise HTTPException(503, "Realtime collaboration is not configured")


def api(method, endpoint, *, data=None, binary=None, not_found=False):
    """Only requests against the fixed Liveblocks host; never user-supplied URLs."""
    require_enabled()
    headers = {"Authorization": "Bearer " + os.environ["LIVEBLOCKS_SECRET_KEY"]}
    if binary is not None:
        headers["Content-Type"] = "application/octet-stream"
    else:
        headers["Content-Type"] = "application/json"
    try:
        result = requests.request(
            method, BASE + endpoint, headers=headers, json=data if binary is None else None,
            data=binary, timeout=(3, 9), allow_redirects=False)
        if not_found and result.status_code == 404:
            return None
        if not 200 <= result.status_code < 300:
            logger.warning("Realtime provider returned HTTP %d for %s", result.status_code, method)
            raise HTTPException(503, "Realtime service is temporarily unavailable")
        return result.json() if result.content and binary is None else {}
    except requests.RequestException as exc:
        logger.warning("Realtime provider is unavailable (%s)", type(exc).__name__)
        raise HTTPException(503, "Realtime service is temporarily unavailable")


def encoded(room_id: str):
    return quote(room_id, safe="")


def account_room(user: str):
    return "lo:account:" + user


def notebook_room(notebook: str):
    return "lo:notebook:" + str(ObjectId(notebook))


def _authorized_members(db, book):
    owner = book["owner"]
    members = {owner}
    for user in book.get("members", []):
        if not ObjectId.is_valid(user):
            continue
        pair = "-".join(sorted((owner, user)))
        if db.friendships.find_one({"pair": pair, "status": "accepted"}):
            members.add(user)
    return members


def _update_permissions(room_id: str, members: set[str], *, create: bool):
    """Private by default. Revoke every stale user explicitly."""
    endpoint = "/rooms/" + encoded(room_id)
    current = api("GET", endpoint, not_found=True)
    allowed = {uid: ["*:write"] for uid in members}
    if current is None:
        if not create:
            raise HTTPException(503, "Realtime notebook has not been initialized")
        api("POST", "/rooms?idempotent=true",
            data={"id": room_id, "defaultAccesses": [], "usersAccesses": allowed})
        current = api("GET", endpoint)
    old = current.get("usersAccesses") or {}
    change = {uid: None for uid in old if uid not in members}
    change.update(allowed)
    api("POST", endpoint, data={"defaultAccesses": [], "usersAccesses": change})


def ensure_account_room(user: str):
    _update_permissions(account_room(user), {user}, create=True)


def sync_book_access(db, book):
    room_id = notebook_room(str(book["_id"]))
    _update_permissions(room_id, _authorized_members(db, book), create=False)


def revoke_book_access(book):
    if not configured():
        return
    room_id = notebook_room(str(book["_id"]))
    existing = api("GET", "/rooms/" + encoded(room_id), not_found=True)
    if existing is not None:
        current = existing.get("usersAccesses") or {}
        api("POST", "/rooms/" + encoded(room_id), data={
            "defaultAccesses": [],
            "usersAccesses": {uid: None for uid in current},
        })


def publish_to_users(users, kind: str):
    """Best-effort invalidation after DB commits, never transmit private content."""
    if not configured():
        return
    if kind not in {"friends", "calendar", "notebooks", "notes", "notifications", "challenges", "access-revoked"}:
        return
    for user in set(users):
        if not isinstance(user, str) or not ObjectId.is_valid(user):
            continue
        try:
            api("POST", "/rooms/" + encoded(account_room(user)) + "/broadcast-event",
                data={"type": "INVALIDATE", "kind": kind})
        except HTTPException:
            # The room might not exist yet when a user is offline. Polling and
            # initial hydration are the durable recovery path.
            logger.warning("Could not deliver realtime invalidation for %s", kind)


class RoomAuth(BaseModel):
    room: str = Field(min_length=1, max_length=140)


@router.post("/authorize")
def authorize(payload: RoomAuth, request: Request, user: str = Depends(get_current_user)):
    require_enabled()
    enforce_limit(request, "realtime-authorize", maximum=300,
                  window_seconds=900, identity=user)
    db = get_db()
    if payload.room == account_room(user):
        ensure_account_room(user)
    elif payload.room.startswith("lo:notebook:"):
        raw_id = payload.room[len("lo:notebook:"):]
        if not ObjectId.is_valid(raw_id):
            raise HTTPException(403, "Notebook access denied")
        from backend.api.routes.shared_notebooks import locate
        book = locate(db, raw_id, user)
        state = db.realtime_notebooks.find_one({"_id": payload.room})
        if not state or state.get("status") != "ready":
            raise HTTPException(409, "Notebook is not ready for collaboration")
        sync_book_access(db, book)
    else:
        raise HTTPException(403, "Room access denied")
    person = find_user(user)
    # Liveblocks ID token: room access is defined by private server-side ACLs.
    reply = api("POST", "/identify-user", data={
        "userId": user, "userInfo": {"name": person.get("name", "Member")[:70]}})
    return {"token": reply["token"]}


@router.post("/notebooks/{book_id}/prepare")
def prepare_notebook(book_id: str, request: Request, user: str = Depends(get_current_user)):
    """Migrate a complete legacy Mongo notebook once, before granting room access."""
    require_enabled()
    enforce_limit(request, "realtime-prepare", maximum=90,
                  window_seconds=900, identity=user)
    from backend.api.routes.shared_notebooks import locate
    db = get_db()
    book = locate(db, book_id, user)
    room_id = notebook_room(book_id)
    state = db.realtime_notebooks.find_one({"_id": room_id})
    if state and state.get("status") == "ready":
        sync_book_access(db, book)
        return {"room": room_id, "ready": True}
    now = datetime.now(timezone.utc)
    lease = now + timedelta(seconds=45)
    nonce = uuid.uuid4().hex
    if not state:
        try:
            db.realtime_notebooks.insert_one({
                "_id": room_id, "status": "initializing",
                "lease_until": lease, "nonce": nonce})
        except DuplicateKeyError:
            raise HTTPException(409, "Another editor is preparing this notebook")
    else:
        until = state.get("lease_until")
        if until and until.tzinfo is None:
            until = until.replace(tzinfo=timezone.utc)
        if until and until >= now:
            raise HTTPException(409, "Another editor is preparing this notebook")
        result = db.realtime_notebooks.find_one_and_update(
            {"_id": room_id, "status": "initializing", "nonce": state.get("nonce")},
            {"$set": {"lease_until": lease, "nonce": nonce}},
            return_document=ReturnDocument.AFTER)
        if not result:
            raise HTTPException(409, "Notebook migration has changed")

    try:
        endpoint = "/rooms/" + encoded(room_id)
        if api("GET", endpoint, not_found=True) is None:
            # Do NOT grant access until legacy text is safely seeded.
            api("POST", "/rooms?idempotent=true",
                data={"id": room_id, "defaultAccesses": []})
        existing = api("GET", endpoint + "/ydoc", not_found=True) or {}
        # A prior initialization might have failed partway through. Never
        # declare a partly seeded room ready and silently hide historic notes.
        # Investigate and reconcile provider state manually if incomplete.
        expected = {
            key
            for page in book.get("pages", [])
            for key in ("page:" + str(page.get("id", "")) + ":title",
                        "page:" + str(page.get("id", "")) + ":body")
            if page.get("id")
        }
        if existing and (not isinstance(existing, dict) or expected - set(existing)):
            raise HTTPException(
                409, "Notebook migration requires manual recovery; original notes are safe"
            )
        if not existing:
            from pycrdt import Doc, Text
            doc = Doc()
            for page in book.get("pages", []):
                pid = str(page.get("id", ""))
                if not pid or len(pid) > 80:
                    continue
                doc["page:" + pid + ":title"] = Text(str(page.get("title", ""))[:120])
                doc["page:" + pid + ":body"] = Text(str(page.get("body", ""))[:50000])
            if book.get("pages"):
                api("PUT", endpoint + "/ydoc", binary=doc.get_update())
        # Do not grant access to a book that was deleted during migration.
        book=locate(db, book_id, user)
        db.realtime_notebooks.update_one(
            {"_id": room_id, "nonce": nonce, "status": "initializing"},
            {"$set": {"status": "ready", "updated_at": datetime.now(timezone.utc)},
             "$unset": {"lease_until": "", "nonce": ""}})
        sync_book_access(db, book)
        return {"room": room_id, "ready": True}
    except Exception:
        # Do not discard a seeded Yjs room or any MongoDB content. A retry
        # reconciles existing provider data before allowing editors to enter.
        db.realtime_notebooks.update_one(
            {"_id": room_id, "nonce": nonce, "status": "initializing"},
            {"$set": {"lease_until": datetime.now(timezone.utc) - timedelta(seconds=1)}})
        raise


@router.post("/notebooks/{book_id}/snapshot")
def snapshot_notebook(book_id: str, user: str = Depends(get_current_user)):
    """Refresh the legacy Mongo preview from the *server* Yjs document.

    Never accept a client-submitted full-text snapshot; that would reintroduce
    last-writer-wins loss of concurrent edits.
    """
    require_enabled()
    from backend.api.routes.shared_notebooks import locate
    db = get_db()
    book = locate(db, book_id, user)
    room_id = notebook_room(book_id)
    if not (db.realtime_notebooks.find_one({"_id": room_id}) or {}).get("status") == "ready":
        raise HTTPException(409, "Notebook is not ready")
    live = api("GET", "/rooms/" + encoded(room_id) + "/ydoc")
    updated = 0
    for page in book.get("pages", []):
        pid = str(page.get("id", ""))
        title = live.get("page:" + pid + ":title")
        body = live.get("page:" + pid + ":body")
        if not isinstance(title, str) or not isinstance(body, str):
            continue
        if page.get("title")==title[:120] and page.get("body")==body[:50000]:
            continue
        db.shared_notebooks.update_one(
            {"_id": book["_id"], "pages.id": pid},
            {"$set": {"pages.$.title": title[:120],
                      "pages.$.body": body[:50000]}})
        updated += 1
    return {"snapshotted": updated}
