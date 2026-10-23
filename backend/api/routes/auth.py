# Authentication Routes (Google OAuth).
#
# This module handles Google Single Sign-On (SSO). It verifies the Google ID token,
# creates a user in MongoDB if they don't exist, and issues our own internal JWT.

import os
import jwt
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel
from google.oauth2 import id_token
from google.auth.transport import requests as google_requests

from api.database import users_collection

router = APIRouter()
security = HTTPBearer()

class GoogleAuthRequest(BaseModel):
    # Schema for the token React sends us after a successful Google login.
    token: str

def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    # Dependency to protect your other routes. Verifies YOUR internal JWT.
    token = credentials.credentials
    secret_key = os.getenv("JWT_SECRET_KEY")
    
    try:
        payload = jwt.decode(token, secret_key, algorithms=["HS256"])
        return payload.get("sub")
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid or expired token")

@router.post("/google")
def google_auth(request: GoogleAuthRequest):
    google_client_id = os.getenv("GOOGLE_CLIENT_ID")
    
    try:
        # 1. Verify the token with Google
        idinfo = id_token.verify_oauth2_token(
            request.token, 
            google_requests.Request(), 
            google_client_id
        )
        
        user_email = idinfo['email']
        user_name = idinfo.get('name', 'Unknown User')
        google_id = idinfo['sub']
        
    except ValueError:
        raise HTTPException(status_code=401, detail="Invalid Google token")

    # 2. Database Logic: Check if user exists in MongoDB
    user = users_collection.find_one({"email": user_email})
    
    if not user:
        # User is new -> Register them in MongoDB
        new_user = {
            "email": user_email,
            "name": user_name,
            "google_id": google_id,
            "created_at": datetime.utcnow()
        }
        users_collection.insert_one(new_user)

    # 3. Generate our own JWT
    secret_key = os.getenv("JWT_SECRET_KEY")
    expiration = datetime.utcnow() + timedelta(hours=24)
    payload = {"sub": user_email, "exp": expiration}
    
    our_token = jwt.encode(payload, secret_key, algorithm="HS256")
    
    return {
        "access_token": our_token, 
        "token_type": "bearer",
        "user_email": user_email,
        "user_name": user_name
    }