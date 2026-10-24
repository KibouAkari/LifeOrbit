"""MongoDB access with explicit failures instead of leaking driver errors."""
import logging
import os
from functools import lru_cache

from fastapi import HTTPException
from pymongo import MongoClient
from pymongo.errors import ConfigurationError, InvalidURI, PyMongoError

logger = logging.getLogger(__name__)

@lru_cache
def get_client():
    uri = os.getenv("MONGODB_URI", "").strip()
    if not uri or "cluster.mongodb.net" in uri or "<" in uri or ">" in uri:
        raise HTTPException(503, "Database connection is not configured correctly")
    try:
        return MongoClient(uri, serverSelectionTimeoutMS=4000, connectTimeoutMS=4000)
    except (ConfigurationError, InvalidURI, PyMongoError):
        logger.exception("MongoDB client configuration failed")
        raise HTTPException(503, "Database connection is unavailable")

def get_db():
    return get_client()[os.getenv("MONGODB_DATABASE", "lifeorbit")]

def database_error(exc: Exception):
    """Keep MongoDB hostnames, credentials and internal topology out of HTTP responses."""
    logger.error("MongoDB operation failed: %s", type(exc).__name__)
    raise HTTPException(503, "Database is temporarily unavailable. Please try again.")

def ensure_indexes():
    db = get_db()
    db.users.create_index("email", unique=True)
    db.users.create_index("google_id", unique=True, sparse=True)
    db.tasks.create_index([("user_id", 1), ("order", 1)])
    db.events.create_index([("user_id", 1), ("date", 1)])
    db.events.create_index(
        [("user_id", 1), ("source_key", 1)],
        unique=True,
        partialFilterExpression={"source": "ical_import"},
        name="unique_ical_import_per_user",
    )
    db.workspaces.create_index("user_id", unique=True)
    db.friendships.create_index("pair", unique=True)
    db.friendships.create_index([("recipient",1),("status",1)])
    db.shares.create_index([("owner",1),("recipient",1),("kind",1),("resource_id",1)],unique=True)
    db.shares.create_index([("recipient",1),("kind",1)])
    db.calendar_feeds.create_index("user_id")
