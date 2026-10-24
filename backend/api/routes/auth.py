"""Account registration, password sign-in and Google identity verification."""
import os
import secrets
from datetime import datetime, timedelta, timezone

import jwt
from fastapi import APIRouter, Depends, HTTPException, Request, Response
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from google.auth.transport import requests as google_requests
from google.oauth2 import id_token
from passlib.context import CryptContext
from pydantic import BaseModel, EmailStr, Field
from pymongo import ReturnDocument
from pymongo.errors import DuplicateKeyError

from backend.api.database import get_db

router = APIRouter()
bearer = HTTPBearer(auto_error=False)
passwords = CryptContext(schemes=["bcrypt_sha256", "bcrypt"], deprecated="auto")


class RegisterRequest(BaseModel):
    name: str = Field(min_length=2, max_length=70)
    email: EmailStr
    password: str = Field(min_length=12, max_length=72)


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class GoogleAuthRequest(BaseModel):
    token: str = Field(min_length=20, max_length=8192)


def secret_key():
    secret = os.getenv("JWT_SECRET_KEY", "")
    if len(secret) < 32:
        raise HTTPException(status_code=503, detail="Authentication is not configured")
    return secret


def issue_token(user, response: Response):
    now = datetime.now(timezone.utc)
    access_token = jwt.encode({
        "sub": str(user["_id"]), "iss": "lifeorbital",
        "aud": "lifeorbital-api", "iat": now,
        "exp": now + timedelta(hours=2),
    }, secret_key(), algorithm="HS256")
    response.set_cookie("lifeorbital_auth", access_token, httponly=True, secure=True, samesite=os.getenv("AUTH_COOKIE_SAMESITE", "strict").lower(), max_age=7200, path="/api")
    return {"user": public_user(user), "expires_in": 7200}


def public_user(user):
    return {
        "id": str(user["_id"]), "name": user.get("name", ""),
        "email": user.get("email", ""), "picture": user.get("picture"),
    }


def get_current_user(request: Request, credentials: HTTPAuthorizationCredentials | None = Depends(bearer)):
    token = request.cookies.get("lifeorbital_auth") or (credentials.credentials if credentials else None)
    if not token:
        raise HTTPException(status_code=401, detail="Sign in required")
    try:
        claims = jwt.decode(
            token, secret_key(), algorithms=["HS256"],
            issuer="lifeorbital", audience="lifeorbital-api",
            options={"require": ["sub", "iat", "exp", "aud", "iss"]},
        )
        return claims["sub"]
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid or expired session")


def find_user(user_id: str):
    from bson import ObjectId
    if not ObjectId.is_valid(user_id):
        raise HTTPException(status_code=401, detail="Invalid session")
    user = get_db().users.find_one({"_id": ObjectId(user_id)})
    if not user:
        raise HTTPException(status_code=401, detail="Account not found")
    return user


@router.post("/register", status_code=201)
def register(payload: RegisterRequest, response: Response):
    secret_key()
    db = get_db()
    email = payload.email.strip().lower()
    if db.users.find_one({"email": email}):
        raise HTTPException(status_code=409, detail="Email already registered")
    user = {
        "name": payload.name.strip(), "email": email,
        "password_hash": passwords.hash(payload.password),
        "created_at": datetime.now(timezone.utc), "picture": None,
    }
    try:
        outcome = db.users.insert_one(user)
    except DuplicateKeyError:
        raise HTTPException(status_code=409, detail="Email already registered")
    user["_id"] = outcome.inserted_id
    return issue_token(user, response)


@router.post("/login")
def password_login(payload: LoginRequest, response: Response):
    user = get_db().users.find_one({"email": payload.email.strip().lower()})
    # Do not disclose whether an email exists.
    if not user or not user.get("password_hash") or not passwords.verify(payload.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Incorrect email or password")
    return issue_token(user, response)


@router.post("/google")
def google_login(payload: GoogleAuthRequest, response: Response):
    client_id = os.getenv("GOOGLE_CLIENT_ID")
    if not client_id:
        raise HTTPException(status_code=503, detail="Google login is not configured")
    try:
        info = id_token.verify_oauth2_token(payload.token, google_requests.Request(), client_id)
        if info.get("iss") not in ("accounts.google.com", "https://accounts.google.com") or not info.get("email_verified"):
            raise ValueError("Unverified identity")
        google_id = info["sub"]
        email = info["email"].strip().lower()
    except (ValueError, KeyError):
        raise HTTPException(status_code=401, detail="Invalid Google credential")

    db = get_db()
    user = db.users.find_one({"google_id": google_id})
    if user is None:
        existing = db.users.find_one({"email": email})
        if existing:
            # Never silently connect a Google identity to a password account.
            raise HTTPException(status_code=409, detail="An account already uses this email. Sign in with your password.")
        record = {"google_id": google_id, "email": email,
                  "name": info.get("name", "User"), "picture": info.get("picture"),
                  "created_at": datetime.now(timezone.utc)}
        try:
            outcome = db.users.insert_one(record)
        except DuplicateKeyError:
            raise HTTPException(status_code=409, detail="Account already exists")
        record["_id"] = outcome.inserted_id
        user = record
    else:
        profile = {
            "email": email,
            "name": info.get("name", user.get("name", "User")),
            "picture": info.get("picture"),
        }
        if db.users.find_one({"email": email, "_id": {"$ne": user["_id"]}}):
            raise HTTPException(status_code=409, detail="An account already uses this email.")
        try:
            db.users.update_one({"_id": user["_id"]}, {"$set": profile})
        except DuplicateKeyError:
            raise HTTPException(status_code=409, detail="An account already uses this email.")
        user.update(profile)
    return issue_token(user, response)


@router.get("/me")
def me(user_id: str = Depends(get_current_user)):
    return public_user(find_user(user_id))


@router.post("/logout")
def logout(response: Response):
    response.delete_cookie("lifeorbital_auth", path="/api", secure=True, httponly=True, samesite=os.getenv("AUTH_COOKIE_SAMESITE", "strict").lower())
    return {"signed_out": True}

class ProfileUpdate(BaseModel):
    name: str = Field(min_length=2, max_length=70)


@router.patch("/me")
def update_profile(payload: ProfileUpdate, user_id: str = Depends(get_current_user)):
    """Change only the current account's display name."""
    user = find_user(user_id)
    updated = get_db().users.find_one_and_update(
        {"_id": user["_id"]},
        {"$set": {"name": payload.name.strip(), "updated_at": datetime.now(timezone.utc)}},
        return_document=ReturnDocument.AFTER,
    )
    if updated is None:
        raise HTTPException(status_code=404, detail="Account not found")
    return public_user(updated)


@router.get("/export")
def export_user_data(user_id: str = Depends(get_current_user)):
    """Downloadable personal data; never include secrets or password hashes."""
    user = find_user(user_id)
    db = get_db()
    def clean(rows):
        return [{key: value for key, value in row.items()
                 if key not in ("_id", "user_id", "password_hash")} for row in rows]
    return {
        "profile": public_user(user),
        "tasks": clean(db.tasks.find({"user_id": user_id})),
        "events": clean(db.events.find({"user_id": user_id})),
        "workspace": db.workspaces.find_one(
            {"user_id": user_id}, {"_id": 0, "user_id": 0}
        ) or {},
    }
