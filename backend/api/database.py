"""MongoDB client shared by API routes. Connections are opened lazily."""
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
    name = os.getenv("MONGODB_DATABASE", "lifeorbit")
    return get_client()[name]
