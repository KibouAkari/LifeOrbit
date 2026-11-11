"""Friend requests require explicit acceptance and never expose email addresses."""
from datetime import datetime, timezone
from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from pymongo.errors import DuplicateKeyError
from backend.api.database import get_db
from backend.api.routes.auth import get_current_user
from backend.api.security import enforce_limit
from backend.api.realtime import configured, notebook_room, publish_to_users, sync_book_access
from fastapi import Request

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
def find_people(request:Request,q:str=Query(min_length=2,max_length=70),user:str=Depends(get_current_user)):
    enforce_limit(request, "people-search", maximum=90, window_seconds=900, identity=user)
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
def request_friend(payload:FriendRequest,request:Request,user:str=Depends(get_current_user)):
    enforce_limit(request, "friend-request", maximum=30, window_seconds=3600, identity=user)
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
    publish_to_users([payload.user_id,user],"friends")
    return {"sent":True}

@router.post("/requests/{request_id}/accept")
def accept(request_id:str,user:str=Depends(get_current_user)):
    if not ObjectId.is_valid(request_id):raise HTTPException(400,"Invalid request")
    result=get_db().friendships.update_one({"_id":ObjectId(request_id),"recipient":user,"status":"pending"},
                                           {"$set":{"status":"accepted"}})
    if not result.modified_count:raise HTTPException(404,"Request not found")
    doc=get_db().friendships.find_one({"_id":ObjectId(request_id)})
    publish_to_users([doc["sender"],doc["recipient"]],"friends")
    return {"accepted":True}

@router.delete("/requests/{request_id}")
def reject_or_remove(request_id:str,user:str=Depends(get_current_user)):
    if not ObjectId.is_valid(request_id):raise HTTPException(400,"Invalid request")
    db=get_db()
    friendship=db.friendships.find_one({"_id":ObjectId(request_id),
                         "$or":[{"sender":user},{"recipient":user}]})
    if not friendship:raise HTTPException(404,"Request not found")
    other=friendship["recipient"] if friendship["sender"]==user else friendship["sender"]
    # Revoke all duplicate or historical rows; a single remaining accepted
    # relationship would otherwise keep read-only and realtime access alive.
    key=pair(user,other)
    db.friendships.delete_many({"$or":[
        {"pair":key},
        {"sender":user,"recipient":other},
        {"sender":other,"recipient":user},
    ]})
    impacted=list(db.shared_notebooks.find({"$or":[
        {"owner":user,"members":other},{"owner":other,"members":user}]}))
    db.shares.delete_many({"$or":[{"owner":user,"recipient":other},
                                 {"owner":other,"recipient":user}]})
    # Friendship revocation must also remove shared-notebook membership.
    db.shared_notebooks.update_many({"owner":user}, {"$pull":{"members":other}})
    db.shared_notebooks.update_many({"owner":other}, {"$pull":{"members":user}})
    if db.friendships.find_one({"pair":key,"status":"accepted"}):
        raise HTTPException(503,"Friendship revocation could not be verified")
    if configured():
        for book in impacted:
            fresh=db.shared_notebooks.find_one({"_id":book["_id"]})
            if fresh and (db.realtime_notebooks.find_one({"_id":notebook_room(str(book["_id"]))}) or {}).get("status")=="ready":
                sync_book_access(db,fresh)
    publish_to_users([user,other],"friends")
    publish_to_users([user,other],"notebooks")
    publish_to_users([user,other],"calendar")
    publish_to_users([user,other],"notes")
    return {"removed":True}
