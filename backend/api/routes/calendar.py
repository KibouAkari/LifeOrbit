"""Calendar data belongs only to the authenticated account."""
from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException
from backend.api.database import get_db
from backend.api.models import CalendarEventRequest
from backend.api.routes.auth import get_current_user

router = APIRouter()

def output(doc):
    return {"id": str(doc["_id"]), "title": doc["title"], "date": doc["date"]}

@router.get("/events")
def list_events(user: str = Depends(get_current_user)):
    return [output(x) for x in get_db().events.find({"user_id": user}).sort("date", 1).limit(1000)]

@router.post("/events", status_code=201)
def create_event(data: CalendarEventRequest, user: str = Depends(get_current_user)):
    doc = {"title": data.title, "date": data.date.isoformat(), "user_id": user}
    outcome = get_db().events.insert_one(doc)
    return output({"_id": outcome.inserted_id, **doc})

@router.delete("/events/{event_id}")
def delete_event(event_id: str, user: str = Depends(get_current_user)):
    if not ObjectId.is_valid(event_id):
        raise HTTPException(400, "Invalid event ID")
    count = get_db().events.delete_one({"_id": ObjectId(event_id), "user_id": user}).deleted_count
    if count == 0:
        raise HTTPException(404, "Event not found")
    return {"deleted": True}
