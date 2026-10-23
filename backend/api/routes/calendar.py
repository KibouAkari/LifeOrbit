# Calendar CRUD Operations.
#
# Manages all Create, Read, and Delete operations for user calendar events in MongoDB.

from fastapi import APIRouter, Depends, HTTPException, status
from bson import ObjectId
from api.database import events_collection
from api.models import CalendarEventRequest
from api.routes.auth import get_current_user

router = APIRouter()

@router.get("/events")
def get_all_events(current_user: str = Depends(get_current_user)):
    # Fetch all events from MongoDB for this specific user
    events_cursor = events_collection.find({"user_email": current_user})
    events = []
    
    for event in events_cursor:
        # Convert MongoDB ObjectId to string for JSON output
        event["id"] = str(event["_id"])
        del event["_id"]
        events.append(event)
        
    return events

@router.post("/events", status_code=status.HTTP_201_CREATED)
def create_event(event_data: CalendarEventRequest, current_user: str = Depends(get_current_user)):
    # Convert Pydantic model to dictionary and add the user's email
    new_event = event_data.model_dump()
    new_event["user_email"] = current_user
    
    # Save to MongoDB
    result = events_collection.insert_one(new_event)
    
    return {"message": "Event created", "event_id": str(result.inserted_id)}

@router.delete("/events/{event_id}")
def delete_event(event_id: str, current_user: str = Depends(get_current_user)):
    # Validate if the provided ID is a valid MongoDB ObjectId
    if not ObjectId.is_valid(event_id):
        raise HTTPException(status_code=400, detail="Invalid event ID format")
        
    # Delete from MongoDB ONLY if the ID matches AND it belongs to the user
    result = events_collection.delete_one({
        "_id": ObjectId(event_id),
        "user_email": current_user 
    })
    
    # If nothing was deleted (either wrong ID or wrong user)
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Event not found or unauthorized")
        
    return {"message": "Event deleted successfully"}