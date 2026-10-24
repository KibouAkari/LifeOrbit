"""MongoDB connection and per-user collection indexes."""
import os
from functools import lru_cache

from fastapi import HTTPException
from pymongo import MongoClient


@lru_cache
def get_client():
    uri = os.getenv("MONGODB_URI")
    if not uri:
        raise HTTPException(status_code=503, detail="Database not configured")
    return MongoClient(uri, serverSelectionTimeoutMS=5000)


def get_db():
    database = get_client()[os.getenv("MONGODB_DATABASE", "lifeorbital")]
    return database


def ensure_indexes():
    """Run this on deployment as a controlled setup operation, not per request."""
    db = get_db()
    db.users.create_index("email", unique=True)
    db.users.create_index("google_id", unique=True, sparse=True)
    db.tasks.create_index([("user_id", 1), ("order", 1)])
    db.events.create_index([("user_id", 1), ("date", 1)])
