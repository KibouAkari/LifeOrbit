"""Shared, MongoDB-backed abuse limits; safe across serverless instances."""
import hashlib
import hmac
import ipaddress
import os
import time
from datetime import datetime, timedelta, timezone

from fastapi import HTTPException, Request
from pymongo import ReturnDocument
from pymongo.errors import DuplicateKeyError
from backend.api.database import get_db


def _client_address(request: Request) -> str:
    # Only Vercel's platform-set header is trusted. Direct/local clients use
    # the socket peer, never a caller-supplied X-Forwarded-For value.
    candidate = (request.headers.get("x-vercel-forwarded-for", "").split(",")[-1].strip()
                 if os.getenv("VERCEL") == "1" else "")
    candidate = candidate or (request.client.host if request.client else "unknown")
    try:
        return str(ipaddress.ip_address(candidate))
    except ValueError:
        return "unknown"


def enforce_limit(request: Request, category: str, *, maximum: int,
                  window_seconds: int, identity: str = "") -> None:
    """Atomically account for attempts without storing raw IPs or email."""
    secret = os.getenv("JWT_SECRET_KEY", "")
    if len(secret) < 32:
        raise HTTPException(503, "Authentication is not configured")
    slot = int(time.time()) // window_seconds
    for dimension, value in (("ip", _client_address(request)),
                             ("account", identity.strip().casefold())):
        if dimension == "account" and not value:
            continue
        raw = f"{category}:{dimension}:{value}:{slot}".encode()
        key = hmac.new(secret.encode(), raw, hashlib.sha256).hexdigest()
        collection = get_db().rate_limits
        expiry = datetime.now(timezone.utc) + timedelta(seconds=window_seconds * 3)
        try:
            row = collection.find_one_and_update(
                {"_id": key},
                {"$inc": {"hits": 1}, "$setOnInsert": {"expires_at": expiry}},
                upsert=True, return_document=ReturnDocument.AFTER,
            )
        except DuplicateKeyError:
            row = collection.find_one_and_update(
                {"_id": key}, {"$inc": {"hits": 1}},
                return_document=ReturnDocument.AFTER,
            )
        # Both buckets are deliberately checked, even when the first exceeds
        # its allowance. This prevents bypasses across account and IP changes.
        threshold = maximum if dimension == "ip" else max(4, maximum // 3)
        if row and row.get("hits", 0) > threshold:
            retry_after = window_seconds - (int(time.time()) % window_seconds)
            raise HTTPException(
                status_code=429, detail="Too many requests. Please try again later.",
                headers={"Retry-After": str(retry_after)},
            )
