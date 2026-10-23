# Dashboard Routes.
# 
# This module provides endpoints to serve aggregated data and statistics for the 
# frontend dashboard. All routes in this module are protected and require the 
# client to provide a valid JWT to retrieve the data specific to the logged-in user.
# ==================================================================================

from fastapi import APIRouter, Depends
from api.database import events_collection
from api.routes.auth import get_current_user

router = APIRouter()

@router.get("/stats")
def get_dashboard_stats(current_user: str = Depends(get_current_user)):
    """
    Returns aggregated statistics for the logged-in user to display on the dashboard.
    """
    # Example: Count how many events this user has in the calendar
    total_events = events_collection.count_documents({"user_email": current_user})
    
    # You can add more complex MongoDB aggregation queries here later
    
    return {
        "user": current_user,
        "metrics": {
            "total_events": total_events,
            "upcoming_tasks": 0 # Placeholder for future logic
        }
    }