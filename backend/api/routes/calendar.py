"""Calendar data belongs only to the authenticated account."""
from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from icalendar import Calendar as ICalendar
from datetime import datetime, date as Date
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

from pymongo.errors import DuplicateKeyError

from backend.api.database import get_db
from backend.api.models import CalendarEventRequest
from backend.api.routes.auth import get_current_user

router = APIRouter()

class IcalImport(BaseModel):
    content: str = Field(min_length=15, max_length=1000000)
    name: str = Field(default="Imported calendar", min_length=1, max_length=80)
    time_zone: str = Field(default="UTC", min_length=1, max_length=100)

def output(doc):
    return {
        "id": str(doc["_id"]), 
        "title": doc["title"], 
        "date": doc["date"],
        "source": doc.get("source", "mongodb"),
        "start_time": doc.get("start_time"), "end_time": doc.get("end_time"),
        "source_id": doc.get("source_id"), "source_name": doc.get("source_name")
    }

@router.get("/events")
def list_events(user: str = Depends(get_current_user)):
    return [output(x) for x in get_db().events.find({"user_id": user}).sort("date", 1).limit(1000)]

@router.post("/events", status_code=201)
def create_event(data: CalendarEventRequest, user: str = Depends(get_current_user)):
    doc = {"title": data.title, "date": data.date.isoformat(), "user_id": user, "source": "mongodb", "start_time": data.start_time.isoformat(timespec="minutes") if data.start_time else None, "end_time": data.end_time.isoformat(timespec="minutes") if data.end_time else None}
    outcome = get_db().events.insert_one(doc)
    return output({"_id": outcome.inserted_id, **doc})

@router.put("/events/{event_id}")
def update_event(event_id: str, data: CalendarEventRequest, user: str = Depends(get_current_user)):
    """Aktualisiert einen bestehenden Termin in der Datenbank."""
    if not ObjectId.is_valid(event_id):
        raise HTTPException(400, "Invalid event ID")
        
    update_data = {"title": data.title, "date": data.date.isoformat(),
                   "start_time": data.start_time.isoformat(timespec="minutes") if data.start_time else None,
                   "end_time": data.end_time.isoformat(timespec="minutes") if data.end_time else None}
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
        timezone = ZoneInfo(payload.time_zone)
    except (ValueError, ZoneInfoNotFoundError):
        raise HTTPException(400, "Invalid time zone")
    try:
        calendar = ICalendar.from_ical(payload.content)
    except (ValueError, TypeError, AttributeError):
        raise HTTPException(400, "Invalid calendar file")
    calendar_id = sha256(payload.content.encode()).hexdigest()[:20]
    entries = []
    for item in calendar.walk("VEVENT"):
        start = item.get("dtstart")
        if not start:
            continue
        source_day = start.dt.date() if isinstance(start.dt, datetime) else start.dt
        local_start = start.dt.astimezone(timezone) if isinstance(start.dt, datetime) and start.dt.tzinfo else start.dt
        day = local_start.date() if isinstance(local_start, datetime) else local_start
        if not isinstance(day, Date):
            continue
        title = str(item.get("summary") or "Untitled event")[:120]
        uid = str(item.get("uid") or title + day.isoformat())
        source_key = sha256((uid + "|" + source_day.isoformat()).encode()).hexdigest()
        start_clock = local_start.strftime("%H:%M") if isinstance(local_start, datetime) else None
        end_prop = item.get("dtend")
        end = end_prop.dt.astimezone(timezone) if end_prop and isinstance(end_prop.dt, datetime) and end_prop.dt.tzinfo else end_prop.dt if end_prop else None
        end_clock = end.strftime("%H:%M") if isinstance(end, datetime) else None
        entries.append({"user_id": user, "title": title, "date": day.isoformat(),
                        "start_time": start_clock, "end_time": end_clock,
                        "source": "ical_import", "source_key": source_key,
                        "source_id": calendar_id, "source_name": payload.name})
        if len(entries) > 500:
            raise HTTPException(413, "Calendar contains more than 500 importable events")
    saved = 0
    for entry in entries:
        match = {"user_id": user, "source": "ical_import", "source_key": entry["source_key"]}
        try:
            result = get_db().events.update_one(match, {"$setOnInsert": entry}, upsert=True)
            saved += int(result.upserted_id is not None)
        except DuplicateKeyError:
            pass
    return {"imported": saved, "total": len(entries)}

@router.get("/imports")
def list_imports(user: str = Depends(get_current_user)):
    """Return just this user's imported calendar collections."""
    from pymongo import ASCENDING
    rows = get_db().events.aggregate([
        {"$match": {"user_id": user, "source": "ical_import"}},
        {"$group": {"_id": "$source_id", "name": {"$first": "$source_name"}, "count": {"$sum": 1}}},
        {"$sort": {"name": ASCENDING}},
    ])
    return [{"id": row["_id"], "name": row.get("name") or "Imported calendar",
             "events": row["count"]} for row in rows if row.get("_id")]

@router.delete("/imports/{source_id}")
def remove_import(source_id: str, user: str = Depends(get_current_user)):
    """Delete only the selected import collection for the current account."""
    if len(source_id) != 20 or not all(c in "0123456789abcdef" for c in source_id):
        raise HTTPException(400, "Invalid calendar source")
    removed = get_db().events.delete_many({"user_id": user, "source": "ical_import", "source_id": source_id})
    return {"removed": removed.deleted_count}
