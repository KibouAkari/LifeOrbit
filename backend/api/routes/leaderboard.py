"""Only accounts choosing leaderboard participation are discoverable by others."""
from bson import ObjectId
from fastapi import APIRouter, Depends
from backend.api.database import get_db
from backend.api.routes.auth import get_current_user

router = APIRouter()

@router.get("")
def ranking(user_id: str = Depends(get_current_user)):
    db = get_db()
    visible = list(db.workspaces.find({"leaderboard_opt_in": True}, {"user_id": 1, "challenges": 1}).limit(200))
    mine = db.workspaces.find_one({"user_id": user_id}, {"challenges": 1})
    if not any(item["user_id"] == user_id for item in visible):
        visible.append({"user_id": user_id, "challenges": (mine or {}).get("challenges", [])})
    ids = [ObjectId(item["user_id"]) for item in visible if ObjectId.is_valid(item.get("user_id", ""))]
    profiles = {str(doc["_id"]): doc.get("name", "Member") for doc in db.users.find({"_id": {"$in": ids}}, {"name": 1})}
    entries = []
    for row in visible:
        uid = row["user_id"]
        if uid not in profiles:
            continue
        points = sum(min(c.get("value", 0), c.get("target", 1)) * 10 for c in row.get("challenges", []))
        entries.append({"id": uid if uid == user_id else None, "name": profiles[uid],
                        "points": points, "me": uid == user_id})
    entries.sort(key=lambda item: (-item["points"], item["name"].lower()))
    return {"participants": entries[:100], "opted_in": bool((mine or {}).get("leaderboard_opt_in", False))}
