"""Authentication routes will be added when session handling is designed."""
from fastapi import APIRouter, HTTPException

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/login")
async def login():
    # Never accept a demo display name as proof of identity.
    raise HTTPException(status_code=501, detail="Authentication is not available yet")
