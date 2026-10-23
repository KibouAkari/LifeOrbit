# Authentication Routes and Security.

# This module handles user registration, login operations, and JWT (JSON Web Token) 
# generation. It includes password hashing logic (using bcrypt) for secure storage. 
# It also provides the `get_current_user` dependency function used to protect 
# other API endpoints by verifying the authorization token.
# ==================================================================================

import os
import jwt
from datetime import datetime, timedelta
from fastapi import APIRouter, HTTPException, status, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from passlib.context import CryptContext
from api.database import users_collection
from api.models import UserRegistrationRequest, UserLoginRequest

router = APIRouter()
security = HTTPBearer()
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """
    Dependency function to protect routes. 
    Verifies the JWT token and returns the user's email or ID.
    """
    token = credentials.credentials
    secret_key = os.getenv("JWT_SECRET_KEY")
    try:
        payload = jwt.decode(token, secret_key, algorithms=["HS256"])
        return payload.get("sub") # Returns the user identifier (e.g., email)
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token has expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

@router.post("/register", status_code=status.HTTP_201_CREATED)
def register_user(user: UserRegistrationRequest):
    """
    Creates a new user account.
    """
    # Check if user already exists
    if users_collection.find_one({"email": user.email}):
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Hash the password for security
    hashed_password = pwd_context.hash(user.password)
    
    # Save to MongoDB Atlas
    new_user = {
        "username": user.username,
        "email": user.email,
        "password": hashed_password,
        "created_at": datetime.utcnow()
    }
    users_collection.insert_one(new_user)
    
    return {"message": "User registered successfully"}

@router.post("/login")
def login_user(user: UserLoginRequest):
    """
    Authenticates a user and returns a JWT access token.
    """
    # Find user in database
    db_user = users_collection.find_one({"email": user.email})
    if not db_user or not pwd_context.verify(user.password, db_user["password"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    # Generate JWT Token
    secret_key = os.getenv("JWT_SECRET_KEY")
    expiration = datetime.utcnow() + timedelta(hours=24)
    payload = {"sub": db_user["email"], "exp": expiration}
    token = jwt.encode(payload, secret_key, algorithm="HS256")
    
    return {"access_token": token, "token_type": "bearer"}