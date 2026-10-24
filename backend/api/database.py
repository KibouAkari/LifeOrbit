"""One reusable MongoDB client and explicit index provisioning."""
import os
from functools import lru_cache
from fastapi import HTTPException
from pymongo import MongoClient

@lru_cache
def get_client():
    uri = os.getenv("MONGODB_URI")
    if not uri:
        raise HTTPException(503, "Database is not configured")
    return MongoClient(uri, serverSelectionTimeoutMS=4000, connectTimeoutMS=4000)

def get_db():
    return get_client()[os.getenv("MONGODB_DATABASE", "lifeorbit")]

def ensure_indexes():
    """Run once during setup; never rebuild indexes on incoming requests."""
    db = get_db()
    db.users.create_index("email", unique=True)
    db.users.create_index("google_id", unique=True, sparse=True)
    db.tasks.create_index([("user_id", 1), ("order", 1)])
    db.events.create_index([("user_id", 1), ("date", 1)])
