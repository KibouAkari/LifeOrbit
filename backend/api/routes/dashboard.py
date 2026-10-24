"""Small, owner-scoped aggregate for the dashboard."""
from datetime import date
from fastapi import APIRouter, Depends
from backend.api.database import get_db
from backend.api.routes.auth import get_current_user

router = APIRouter()

@router.get("/stats")
def stats(user: str = Depends(get_current_user)):
    db = get_db()
    return {"metrics": {
        "upcoming_tasks": db.tasks.count_documents({"user_id": user, "done": False}),
        "total_events": db.events.count_documents({"user_id": user}),
        "upcoming_events": db.events.count_documents({"user_id": user, "date": {"$gte": date.today().isoformat()}}),
    }}
