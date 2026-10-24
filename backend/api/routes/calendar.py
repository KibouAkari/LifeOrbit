"""Calendar data belongs only to the authenticated account."""
import requests
from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from icalendar import Calendar as ICalendar

from backend.api.database import get_db
from backend.api.models import CalendarEventRequest
from backend.api.routes.auth import get_current_user

router = APIRouter()

# Schema for the iCal Sync Request
class IcalSyncRequest(BaseModel):
    urls: list[str]

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

@router.post("/ical-sync")
def sync_multiple_icals(request: IcalSyncRequest, user: str = Depends(get_current_user)):
    """Lädt externe .ics Kalender (Google, Apple, Outlook) live herunter."""
    imported_events = []
    
    for url in request.urls:
        try:
            response = requests.get(url, timeout=5)
            if response.status_code != 200:
                continue
                
            cal = ICalendar.from_ical(response.content)
            for component in cal.walk():
                if component.name == "VEVENT":
                    start = component.get('dtstart').dt
                    title = str(component.get('summary', 'Ohne Titel'))
                    date_str = start.isoformat() if hasattr(start, 'isoformat') else str(start)
                    
                    imported_events.append({
                        # Eindeutige ID generieren, damit React nicht meckert (fehlender Key)
                        "id": f"ical_{hash(url + title + date_str)}",
                        "title": title,
                        "date": date_str,
                        "source": "ical_import"
                    })
        except Exception as e:
            print(f"Fehler beim Import von {url}: {e}")
            continue
            
    return imported_events