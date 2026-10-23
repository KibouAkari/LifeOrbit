"""Google sign-in and signed access tokens.

Google's subject is the user identifier. Emails can change and must not be
used as a permanent database key.
"""
import os
from datetime import datetime, timedelta, timezone

import jwt
from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from google.auth.transport import requests as google_requests
from google.oauth2 import id_token
from pydantic import BaseModel, Field

from api.database import get_db

router = APIRouter()
bearer = HTTPBearer(auto_error=False)


class GoogleAuthRequest(BaseModel):
    token: str = Field(min_length=20, max_length=8192)


def signing_key():
    secret = os.getenv("JWT_SECRET_KEY")
    if not secret or len(secret) < 32:
        raise HTTPException(status_code=503, detail="Authentication is not configured")
    return secret


def get_current_user(credentials: HTTPAuthorizationCredentials | None = Depends(bearer)):
    if not credentials:
        raise HTTPException(status_code=401, detail="Sign in required")
    try:
        payload = jwt.decode(
            credentials.credentials, signing_key(),
            algorithms=["HS256"], audience="lifeorbit-api", issuer="lifeorbit",
            options={"require": ["sub", "exp", "iat", "aud", "iss"]},
        )
        return payload["sub"]
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Session expired or invalid")


@router.post("/google")
def google_auth(request: GoogleAuthRequest):
    client_id = os.getenv("GOOGLE_CLIENT_ID")
    if not client_id:
        raise HTTPException(status_code=503, detail="Google sign-in is not configured")
    try:
        identity = id_token.verify_oauth2_token(
            request.token, google_requests.Request(), client_id
        )
        if identity.get("iss") not in ("accounts.google.com", "https://accounts.google.com"):
            raise ValueError("Unknown issuer")
        if not identity.get("email_verified"):
            raise ValueError("Email is not verified")
        subject = identity["sub"]
    except (ValueError, KeyError):
        raise HTTPException(status_code=401, detail="Invalid Google credential")

    db = get_db()
    profile = {
        "google_id": subject,
        "email": identity.get("email", ""),
        "name": identity.get("name", "User"),
        "picture": identity.get("picture"),
        "updated_at": datetime.now(timezone.utc),
    }
    db.users.update_one(
        {"google_id": subject},
        {"$set": profile, "$setOnInsert": {"created_at": datetime.now(timezone.utc)}},
        upsert=True,
    )
    now = datetime.now(timezone.utc)
    token = jwt.encode(
        {"sub": subject, "iss": "lifeorbit", "aud": "lifeorbit-api",
         "iat": now, "exp": now + timedelta(hours=2)},
        signing_key(), algorithm="HS256",
    )
    return {
        "access_token": token, "token_type": "bearer", "expires_in": 7200,
        "user": {"id": subject, "name": profile["name"], "email": profile["email"], "picture": profile["picture"]},
    }


@router.get("/me")
def me(current_user: str = Depends(get_current_user)):
    user = get_db().users.find_one({"google_id": current_user}, {"_id": 0, "google_id": 0, "updated_at": 0, "created_at": 0})
    if not user:
        raise HTTPException(status_code=401, detail="Account not found")
    return {"id": current_user, **user}
