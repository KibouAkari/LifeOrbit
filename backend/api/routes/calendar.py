"""Calendar endpoints will enforce user ownership before data access."""
from fastapi import APIRouter, HTTPException
from ..models import CalendarEventInput

router = APIRouter(prefix="/calendar", tags=["calendar"])


@router.get("/events")
async def events():
    raise HTTPException(status_code=501, detail="Calendar API is not available yet")


@router.post("/events")
async def create_event(payload: CalendarEventInput):
    raise HTTPException(status_code=501, detail="Calendar API is not available yet")
