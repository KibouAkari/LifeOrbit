# Dashboard Routes.
#
# Provides endpoints to serve aggregated data and statistics for the frontend dashboard.

from fastapi import APIRouter, Depends
from api.database import events_collection
from api.routes.auth import get_current_user

router = APIRouter()

@router.get("/stats")
def get_dashboard_stats(current_user: str = Depends(get_current_user)):
    # Ask MongoDB to count all events belonging to the logged-in user
    total_events = events_collection.count_documents({"user_email": current_user})
    
    return {
        "user": current_user,
        "metrics": {
            "total_events": total_events,
            "upcoming_tasks": 0 # Can be expanded later
        }
    }