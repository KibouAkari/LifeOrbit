"""Dashboard data will be aggregated per authenticated user."""
from fastapi import APIRouter, HTTPException

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


@router.get("/summary")
async def summary():
    raise HTTPException(status_code=501, detail="Dashboard API is not available yet")
