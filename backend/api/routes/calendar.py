# Calendar CRUD Operations.
# 
# This module manages all Create, Read, Update, and Delete (CRUD) operations
# for user calendar events. It ensures that users can only interact with their 
# own events based on their authenticated token. The data is managed within 
# the MongoDB 'events' collection.
# ===========================================================================

from fastapi import APIRouter, Depends, HTTPException, status
from bson import ObjectId
from api.database import events_collection
from api.models import CalendarEventRequest
from api.routes.auth import get_current_user

router = APIRouter()

@router.get("/events")
def get_all_events(current_user: str = Depends(get_current_user)):
    """
    Fetches all calendar events for the authenticated user.
    """
    events_cursor = events_collection.find({"user_email": current_user})
    events = []
    
    for event in events_cursor:
        # Convert MongoDB ObjectId to string for JSON serialization
        event["id"] = str(event["_id"])
        del event["_id"]
        events.append(event)
        
    return events

@router.post("/events", status_code=status.HTTP_201_CREATED)
def create_event(event_data: CalendarEventRequest, current_user: str = Depends(get_current_user)):
    """
    Creates a new calendar event.
    """
    new_event = event_data.model_dump() # Convert Pydantic model to dictionary
    new_event["user_email"] = current_user # Link event to the user
    
    result = events_collection.insert_one(new_event)
    
    return {"message": "Event created", "event_id": str(result.inserted_id)}

@router.delete("/events/{event_id}")
def delete_event(event_id: str, current_user: str = Depends(get_current_user)):
    """
    Deletes a specific calendar event.
    """
    if not ObjectId.is_valid(event_id):
        raise HTTPException(status_code=400, detail="Invalid event ID format")
        
    result = events_collection.delete_one({
        "_id": ObjectId(event_id),
        "user_email": current_user # Security check: Ensure user owns this event
    })
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Event not found or unauthorized")
        
    return {"message": "Event deleted successfully"}