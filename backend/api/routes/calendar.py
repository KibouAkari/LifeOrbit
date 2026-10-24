"""Calendar data belongs only to the authenticated account."""
from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from icalendar import Calendar as ICalendar
from datetime import datetime, date as Date

from backend.api.database import get_db
from backend.api.models import CalendarEventRequest
from backend.api.routes.auth import get_current_user

router = APIRouter()

class IcalImport(BaseModel):
    content: str = Field(min_length=15, max_length=1000000)

def output(doc):
    return {
        "id": str(doc["_id"]), 
        "title": doc["title"], 
        "date": doc["date"],
        "source": doc.get("source", "mongodb") # Hilft dem Frontend zu erkennen, woher der Termin kommt
    }

@router.get("/events")
def list_events(user: str = Depends(get_current_user)):
    return [output(x) for x in get_db().events.find({"user_id": user}).sort("date", 1).limit(1000)]

@router.post("/events", status_code=201)
def create_event(data: CalendarEventRequest, user: str = Depends(get_current_user)):
    doc = {"title": data.title, "date": data.date.isoformat(), "user_id": user, "source": "mongodb"}
    outcome = get_db().events.insert_one(doc)
    return output({"_id": outcome.inserted_id, **doc})

@router.put("/events/{event_id}")
def update_event(event_id: str, data: CalendarEventRequest, user: str = Depends(get_current_user)):
    """Aktualisiert einen bestehenden Termin in der Datenbank."""
    if not ObjectId.is_valid(event_id):
        raise HTTPException(400, "Invalid event ID")
        
    update_data = {"title": data.title, "date": data.date.isoformat()}
    result = get_db().events.update_one(
        {"_id": ObjectId(event_id), "user_id": user},
        {"$set": update_data}
    )
    
    if result.matched_count == 0:
        raise HTTPException(404, "Event not found")
        
    return {"updated": True, "id": event_id, **update_data}

@router.delete("/events/{event_id}")
def delete_event(event_id: str, user: str = Depends(get_current_user)):
    if not ObjectId.is_valid(event_id):
        raise HTTPException(400, "Invalid event ID")
        
    count = get_db().events.delete_one({"_id": ObjectId(event_id), "user_id": user}).deleted_count
    if count == 0:
        raise HTTPException(404, "Event not found")
        
    return {"deleted": True}

@router.post("/ical-import")
def import_ical(payload: IcalImport, user: str = Depends(get_current_user)):
    """Import an uploaded iCalendar file, without fetching arbitrary external URLs."""
    from hashlib import sha256
    try:
        calendar = ICalendar.from_ical(payload.content)
    except (ValueError, TypeError, AttributeError):
        raise HTTPException(400, "Invalid calendar file")
    entries = []
    for item in calendar.walk("VEVENT"):
        start = item.get("dtstart")
        if not start:
            continue
        day = start.dt.date() if isinstance(start.dt, datetime) else start.dt
        if not isinstance(day, Date):
            continue
        title = str(item.get("summary") or "Untitled event")[:120]
        uid = str(item.get("uid") or title + day.isoformat())
        source_key = sha256((uid + "|" + day.isoformat()).encode()).hexdigest()
        entries.append({"user_id": user, "title": title, "date": day.isoformat(),
                        "source": "ical_import", "source_key": source_key})
        if len(entries) >= 500:
            break
    saved = 0
    for entry in entries:
        match = {"user_id": user, "source_key": entry["source_key"]}
        result = get_db().events.update_one(match, {"$setOnInsert": entry}, upsert=True)
        saved += int(result.upserted_id is not None)
    return {"imported": saved, "total": len(entries)}
