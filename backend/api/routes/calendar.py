"""Owner-scoped calendar CRUD endpoints."""
from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException

from api.database import get_db
from api.models import CalendarEventRequest
from api.routes.auth import get_current_user

router = APIRouter()

def output(doc):
    return {"id": str(doc["_id"]), "title": doc["title"], "date": doc["date"]}


@router.get("/events")
def list_events(user: str = Depends(get_current_user)):
    return [output(doc) for doc in get_db().events.find({"user_id": user}).sort("date", 1).limit(1000)]


@router.post("/events", status_code=201)
def create_event(event: CalendarEventRequest, user: str = Depends(get_current_user)):
    doc = {"title": event.title, "date": event.date.isoformat(), "user_id": user}
    result = get_db().events.insert_one(doc)
    return {"id": str(result.inserted_id), "title": doc["title"], "date": doc["date"]}


@router.delete("/events/{event_id}")
def delete_event(event_id: str, user: str = Depends(get_current_user)):
    if not ObjectId.is_valid(event_id):
        raise HTTPException(status_code=400, detail="Invalid event ID")
    result = get_db().events.delete_one({"_id": ObjectId(event_id), "user_id": user})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Event not found")
    return {"deleted": True}
