"""Built-in Yjs sync for shared notebooks when hosted Liveblocks is not configured.

HTTP sync has near-live polling rather than server-push latency. Yjs updates
are merged under the existing distributed notebook lock; users never replace
the current text with a stale full-page document.
"""
import base64
import binascii
from contextlib import nullcontext
from datetime import datetime, timezone

from bson import Binary, ObjectId
from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Query, Request
from pydantic import BaseModel, Field
from pycrdt import Doc, Text

from backend.api.database import get_db
from backend.api.realtime import (
    _assert_lock, configured, notebook_lock, notebook_room,
    publish_to_users, realtime_access_lock,
)
from backend.api.routes.auth import get_current_user
from backend.api.security import enforce_limit

router = APIRouter()
MAX_DOCUMENT_BYTES = 1500000
MAX_UPDATE_BYTES = MAX_DOCUMENT_BYTES


class SyncUpdate(BaseModel):
    update: str = Field(min_length=1, max_length=MAX_UPDATE_BYTES * 2)


def _allow_native(db, book_id):
    # A Liveblocks-migrated room has a different authoritative document.
    # Never overwrite it with a second, independent Yjs source.
    if db.realtime_notebooks.find_one({"_id": notebook_room(book_id)}):
        raise HTTPException(409, "This notebook uses hosted collaboration")


def _from_database(db, book):
    key = str(book["_id"])
    existing = db.notebook_crdts.find_one({"_id": key})
    doc = Doc()
    if existing:
        try:
            doc.apply_update(bytes(existing["state"]))
        except Exception:
            # Preserve the stored bytes for manual recovery; never overwrite
            # a potentially recoverable collaborative document.
            raise HTTPException(503, "The collaborative notebook needs recovery")
        return doc, existing
    for page in book.get("pages", []):
        pid = str(page.get("id", ""))
        if not pid or len(pid) > 80:
            continue
        doc["page:" + pid + ":title"] = Text(str(page.get("title", ""))[:120])
        doc["page:" + pid + ":body"] = Text(str(page.get("body", ""))[:50000])
    state = doc.get_update()
    if len(state) > MAX_DOCUMENT_BYTES:
        raise HTTPException(413, "Notebook is too large for built-in collaboration")
    record = {"_id": key, "state": Binary(state), "version": 0,
              "updated_at": datetime.now(timezone.utc)}
    # All writes and initialization use notebook_lock, so only one instance
    # initializes this document. MongoDB's unique _id is a second safeguard.
    db.notebook_crdts.insert_one(record)
    return doc, record


def _update_preview(db, book, doc):
    pages = []
    for page in book.get("pages", []):
        pid = str(page.get("id", ""))
        title = doc.get("page:" + pid + ":title", type=Text)
        body = doc.get("page:" + pid + ":body", type=Text)
        next_title = str(title) if title is not None else str(page.get("title", ""))
        next_body = str(body) if body is not None else str(page.get("body", ""))
        if len(next_title) > 120 or len(next_body) > 50000:
            raise HTTPException(413, "Notebook page exceeds content limits")
        pages.append({**page, "title": next_title, "body": next_body})
    return pages


def _clear_deleted_pages(doc, page_ids):
    for pid in page_ids:
        for field in ("title", "body"):
            text = doc.get(f"page:{pid}:{field}", type=Text)
            if text is not None and len(text):
                text.clear()


def _serialize(book, record, since):
    state = bytes(record["state"])
    return {"version": record["version"],
            "update": base64.b64encode(state).decode() if since < record["version"] else None,
            "pages": [{"id": p["id"], "title": p.get("title", "")}
                      for p in book.get("pages", [])]}


@router.get("/{book_id}/sync")
def read_sync(book_id: str, since: int = Query(default=-1, ge=-1),
              user: str = Depends(get_current_user)):
    from backend.api.routes.shared_notebooks import locate
    db = get_db()
    if not ObjectId.is_valid(book_id):
        raise HTTPException(400, "Invalid notebook")
    raw = db.shared_notebooks.find_one({"_id": ObjectId(book_id)}, {"owner": 1})
    if not raw:
        raise HTTPException(404, "Notebook not found")
    owner = raw["owner"]
    gate = realtime_access_lock(db, owner, user) if owner != user else nullcontext()
    with gate, notebook_lock(db, book_id):
        # Recheck accepted friendship *after* the revocation lock is acquired.
        book = locate(db, book_id, user)
        _allow_native(db, book_id)
        _, record = _from_database(db, book)
        return _serialize(book, record, since)


@router.post("/{book_id}/sync")
def write_sync(book_id: str, payload: SyncUpdate, request: Request,
               background_tasks: BackgroundTasks,
               user: str = Depends(get_current_user)):
    from backend.api.routes.shared_notebooks import locate
    enforce_limit(request, "notebook-sync", maximum=12000,
                  account_maximum=8000, window_seconds=3600, identity=user)
    try:
        update = base64.b64decode(payload.update, validate=True)
    except (binascii.Error, ValueError):
        raise HTTPException(400, "Invalid collaborative update")
    if not update or len(update) > MAX_UPDATE_BYTES:
        raise HTTPException(413, "Collaborative update is too large")
    db = get_db()
    # Match the lock ordering of friendship revocation (friendship then room)
    # so a removed member cannot save a stale document afterward.
    raw = db.shared_notebooks.find_one(
        {"_id": ObjectId(book_id)} if ObjectId.is_valid(book_id) else {"_id": None},
        {"owner": 1})
    if not raw:
        raise HTTPException(404, "Notebook not found")
    owner = raw["owner"]
    gate = realtime_access_lock(db, owner, user) if owner != user else nullcontext()
    with gate, notebook_lock(db, book_id):
        book = locate(db, book_id, user)
        _allow_native(db, book_id)
        doc, record = _from_database(db, book)
        try:
            doc.apply_update(update)
        except Exception:
            raise HTTPException(400, "Invalid collaborative update")
        _clear_deleted_pages(doc, record.get("deleted_pages", []))
        pages = _update_preview(db, book, doc)
        state = doc.get_update()
        if len(state) > MAX_DOCUMENT_BYTES:
            raise HTTPException(413, "Notebook is too large for built-in collaboration")
        _assert_lock(db, notebook_room(book_id))
        match = {"_id": str(book["_id"]), "version": record["version"]}
        changed = db.notebook_crdts.update_one(
            match, {"$set": {"state": Binary(state), "updated_at": datetime.now(timezone.utc)},
                    "$inc": {"version": 1}})
        if changed.matched_count != 1:
            raise HTTPException(409, "Notebook changed; reconnect and retry")
        # Persist a legacy preview, but never use it to overwrite CRDT history.
        db.shared_notebooks.update_one(
            {"_id": book["_id"]},
            {"$set": {"pages": pages, "updated_at": datetime.now(timezone.utc)}})
        new_record = {**record, "state": state, "version": record["version"] + 1}
        response = _serialize({**book, "pages": pages}, new_record, since=-1)
    publish_to_users([book["owner"], *book.get("members", [])],
                     "notebooks", background_tasks)
    return response
