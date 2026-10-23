"""MongoDB connection configuration.

Connection is intentionally lazy: importing the API must not require Atlas.
Do not connect from the frontend or expose MONGODB_URI in browser builds.
"""
import os
from functools import lru_cache
from pymongo import AsyncMongoClient


@lru_cache
def get_client() -> AsyncMongoClient:
    uri = os.getenv("MONGODB_URI")
    if not uri:
        raise RuntimeError("MONGODB_URI has not been configured")
    return AsyncMongoClient(uri, serverSelectionTimeoutMS=5000)
