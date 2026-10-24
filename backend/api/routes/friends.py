"""Friend requests require explicit acceptance and never expose email addresses."""
from datetime import datetime, timezone
from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from pymongo.errors import DuplicateKeyError
from backend.api.database import get_db
from backend.api.routes.auth import get_current_user

router=APIRouter()

class FriendRequest(BaseModel):
    user_id: str = Field(min_length=24,max_length=24)

def pair(a,b):
    return "-".join(sorted((a,b)))

def profile(db,uid):
    if not ObjectId.is_valid(uid):
        return None
    doc=db.users.find_one({"_id":ObjectId(uid)},{"name":1})
    return {"id":uid,"name":doc.get("name","Member")} if doc else None

@router.get("/search")
def find_people(q:str=Query(min_length=2,max_length=70),user:str=Depends(get_current_user)):
    # Discover by display name only. No email address or raw MongoDB data returned.
    from re import escape
    matches=get_db().users.find({"name":{"$regex":escape(q),"$options":"i"},
                                  "_id":{"$ne":ObjectId(user)}},{"name":1}).limit(12)
    return [{"id":str(u["_id"]),"name":u.get("name","Member")} for u in matches]

@router.get("")
def list_friends(user:str=Depends(get_current_user)):
    db=get_db()
    docs=list(db.friendships.find({"$or":[{"sender":user},{"recipient":user}]}))
    result={"friends":[],"incoming":[],"outgoing":[]}
    for item in docs:
        other=item["recipient"] if item["sender"]==user else item["sender"]
        entry=profile(db,other)
        if not entry:continue
        entry["request_id"]=str(item["_id"])
        if item["status"]=="accepted":result["friends"].append(entry)
        elif item["recipient"]==user:result["incoming"].append(entry)
        else:result["outgoing"].append(entry)
    result["pending_count"]=len(result["incoming"])
    return result

@router.post("/requests",status_code=201)
def request_friend(payload:FriendRequest,user:str=Depends(get_current_user)):
    db=get_db()
    if payload.user_id==user or not profile(db,payload.user_id):
        raise HTTPException(400,"Invalid friend")
    key=pair(user,payload.user_id)
    current=db.friendships.find_one({"pair":key})
    if current:
        raise HTTPException(409,"Request already exists")
    try:
        db.friendships.insert_one({"pair":key,"sender":user,"recipient":payload.user_id,
                                   "status":"pending","created_at":datetime.now(timezone.utc)})
    except DuplicateKeyError:
        raise HTTPException(409,"Request already exists")
    return {"sent":True}

@router.post("/requests/{request_id}/accept")
def accept(request_id:str,user:str=Depends(get_current_user)):
    if not ObjectId.is_valid(request_id):raise HTTPException(400,"Invalid request")
    result=get_db().friendships.update_one({"_id":ObjectId(request_id),"recipient":user,"status":"pending"},
                                           {"$set":{"status":"accepted"}})
    if not result.modified_count:raise HTTPException(404,"Request not found")
    return {"accepted":True}

@router.delete("/requests/{request_id}")
def reject_or_remove(request_id:str,user:str=Depends(get_current_user)):
    if not ObjectId.is_valid(request_id):raise HTTPException(400,"Invalid request")
    result=get_db().friendships.delete_one({"_id":ObjectId(request_id),
                         "$or":[{"sender":user},{"recipient":user}]})
    if not result.deleted_count:raise HTTPException(404,"Request not found")
    return {"removed":True}
