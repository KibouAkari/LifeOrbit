"""Single-use email password recovery. No token or email secret is logged."""
import hashlib
import hmac
import logging
import os
import secrets
from datetime import datetime, timedelta, timezone
from urllib.parse import urlsplit

import requests
from bson import ObjectId
from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel, EmailStr, Field

from backend.api.database import get_db
from backend.api.routes.auth import passwords, secret_key
from backend.api.security import enforce_limit

router = APIRouter()
logger = logging.getLogger(__name__)
GENERIC_REPLY = "If this address has a password account, a reset link will be emailed."
TOKEN_TTL_MINUTES = 30


class ForgotPassword(BaseModel):
    email: EmailStr


class ResetPassword(BaseModel):
    token: str = Field(min_length=40, max_length=100, pattern=r"^[A-Za-z0-9_-]+$")
    new_password: str = Field(min_length=12, max_length=72)


def _delivery_settings():
    key = os.getenv("RESEND_API_KEY", "").strip()
    sender = os.getenv("PASSWORD_RESET_FROM_EMAIL", "").strip()
    origin = os.getenv("PUBLIC_APP_URL", "").strip().rstrip("/")
    try:
        parsed = urlsplit(origin)
    except ValueError:
        parsed = None
    if (not key or not sender or not parsed or parsed.scheme != "https" or
        not parsed.netloc or parsed.username or parsed.password or
        parsed.path or parsed.query or parsed.fragment or "@" not in sender):
        raise HTTPException(503, "Password recovery email is not configured")
    return key, sender, origin


def _token_digest(raw):
    return hmac.new(secret_key().encode(), ("lifeorbit:reset:v1:" + raw).encode(),
                    hashlib.sha256).hexdigest()


def _send_reset_email(email: str, link: str):
    key, sender, _ = _delivery_settings()
    try:
        result = requests.post(
            "https://api.resend.com/emails",
            headers={"Authorization": "Bearer " + key,
                     "Content-Type": "application/json"},
            json={"from": sender, "to": [email],
                  "subject": "Reset your LifeOrbit password",
                  "text": (
                      "We received a request to reset your LifeOrbit password.\n\n"
                      "Open this link within 30 minutes to choose a new password:\n"
                      + link + "\n\nIf you did not request this, ignore the message. "
                      "Your existing password will remain unchanged.\n"
                  )},
            timeout=(3, 7), allow_redirects=False,
        )
        if result.status_code not in (200, 201, 202):
            logger.warning("Password recovery provider returned HTTP %s", result.status_code)
            return False
        return True
    except requests.RequestException:
        logger.warning("Password recovery delivery is unavailable")
        return False


@router.post("/password/forgot", status_code=202)
def forgot_password(payload: ForgotPassword, request: Request):
    # Configuration is checked for every address, so missing provider settings
    # cannot be used to distinguish existing accounts.
    _, _, origin = _delivery_settings()
    enforce_limit(request, "password-reset-email", maximum=8,
                  account_maximum=3, window_seconds=3600, identity=payload.email)
    db = get_db()
    email = payload.email.strip().lower()
    user = db.users.find_one({"email": email})
    if not user or not user.get("password_hash"):
        return {"message": GENERIC_REPLY}

    token = secrets.token_urlsafe(32)
    digest = _token_digest(token)
    now = datetime.now(timezone.utc)
    user_id = str(user["_id"])
    db.password_reset_tokens.delete_many({"user_id": user_id})
    db.password_reset_tokens.insert_one({
        "_id": digest, "user_id": user_id, "email": email,
        "expires_at": now + timedelta(minutes=TOKEN_TTL_MINUTES),
        "created_at": now,
    })
    # Fragment tokens are not sent to the web server in HTTP requests.
    link = origin + "/#/reset-password?token=" + token
    if not _send_reset_email(email, link):
        db.password_reset_tokens.delete_one({"_id": digest})
        # Return an intentionally generic response. Mail provider errors do not
        # allow a caller to determine whether an account exists.
    return {"message": GENERIC_REPLY}


@router.post("/password/reset")
def reset_password(payload: ResetPassword, request: Request):
    enforce_limit(request, "password-reset-consume", maximum=20,
                  window_seconds=3600)
    db = get_db()
    now = datetime.now(timezone.utc)
    digest = _token_digest(payload.token)
    # Atomic consumption prevents a token from being replayed by a second user.
    entry = db.password_reset_tokens.find_one_and_delete({
        "_id": digest, "expires_at": {"$gt": now}
    })
    if not entry or not ObjectId.is_valid(entry.get("user_id", "")):
        raise HTTPException(400, "Invalid or expired reset link")
    user_id = ObjectId(entry["user_id"])
    record = db.users.find_one({"_id": user_id, "email": entry["email"],
                               "password_hash": {"$exists": True}})
    if not record:
        raise HTTPException(400, "Invalid or expired reset link")
    result = db.users.update_one(
        {"_id": user_id, "email": entry["email"]},
        {"$set": {"password_hash": passwords.hash(payload.new_password),
                  "updated_at": now},
         "$inc": {"session_version": 1}},
    )
    if result.matched_count != 1:
        raise HTTPException(409, "Account changed. Request another reset link")
    db.password_reset_tokens.delete_many({"user_id": entry["user_id"]})
    return {"updated": True}
