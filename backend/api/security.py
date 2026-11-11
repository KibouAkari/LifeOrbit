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
    peer = request.client.host if request.client else "unknown"
    candidate = peer
    if os.getenv("VERCEL") == "1":
        # Vercel overwrites this platform header. Never trust arbitrary
        # X-Forwarded-For headers when the app is run outside Vercel.
        forwarded = request.headers.get("x-vercel-forwarded-for", "")
        if forwarded:
            candidate = forwarded.split(",", 1)[0].strip()
    try:
        return str(ipaddress.ip_address(candidate))
    except ValueError:
        # A malformed forwarded header must not create one attacker-selected
        # bucket for every other client. Prefer the socket peer if available.
        try:
            return str(ipaddress.ip_address(peer))
        except ValueError:
            return "unknown"


def enforce_limit(request: Request, category: str, *, maximum: int,
                  window_seconds: int, identity: str = "",
                  account_maximum: int | None = None) -> None:
    """Atomically account for attempts without storing raw IPs or email."""
    secret = os.getenv("JWT_SECRET_KEY", "")
    if len(secret) < 32:
        raise HTTPException(503, "Authentication is not configured")
    if maximum < 1 or window_seconds < 1 or (account_maximum is not None and account_maximum < 1):
        raise RuntimeError("Invalid server-side abuse policy")
    slot = int(time.time()) // window_seconds
    exceeded = False
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
        if not row or not isinstance(row.get("hits"), int):
            # Fail closed if the database cannot confirm that an attempt was
            # counted, instead of silently bypassing the limiter.
            raise HTTPException(503, "Rate limiting is temporarily unavailable")
        threshold = (maximum if dimension == "ip" else
                     account_maximum if account_maximum is not None else
                     max(4, maximum // 3))
        exceeded = exceeded or row["hits"] > threshold
    if exceeded:
        retry_after = window_seconds - (int(time.time()) % window_seconds)
        raise HTTPException(
            status_code=429, detail="Too many requests. Please try again later.",
            headers={"Retry-After": str(retry_after)},
        )
