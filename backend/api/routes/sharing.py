"""Private shares use authenticated friendships and explicit recipient IDs."""
from datetime import datetime,timezone
from bson import ObjectId
from fastapi import APIRouter,Depends,HTTPException
from pydantic import BaseModel,Field
from pymongo import ReturnDocument
from backend.api.database import get_db
from backend.api.routes.auth import get_current_user

router=APIRouter()

class ShareRequest(BaseModel):
    recipient_id:str=Field(min_length=24,max_length=24)
    resource_id:str=Field(min_length=1,max_length=80)

def require_friend(db,user,other):
    pair="-".join(sorted((user,other)))
    if not ObjectId.is_valid(other) or not db.friendships.find_one({"pair":pair,"status":"accepted"}):
        raise HTTPException(403,"Only confirmed friends can receive shared content")

def note_from_owner(db,owner,note_id):
    workspace=db.workspaces.find_one({"user_id":owner},{"notes":1})
    for note in (workspace or {}).get("notes",[]):
        if note.get("id")==note_id:
            return {"id":note_id,"title":note.get("title",""),"body":note.get("body",""),"owner":owner}
    raise HTTPException(404,"Note not found")

@router.post("/notes")
def share_note(data:ShareRequest,user:str=Depends(get_current_user)):
    db=get_db();require_friend(db,user,data.recipient_id)
    note_from_owner(db,user,data.resource_id)
    db.shares.update_one({"owner":user,"recipient":data.recipient_id,"kind":"note","resource_id":data.resource_id},
                        {"$setOnInsert":{"created_at":datetime.now(timezone.utc)}},upsert=True)
    return {"shared":True}

@router.get("/notes")
def shared_notes(user:str=Depends(get_current_user)):
    db=get_db();rows=db.shares.find({"recipient":user,"kind":"note"}).limit(100)
    result=[]
    for row in rows:
        try:
            note=note_from_owner(db,row["owner"],row["resource_id"])
            author=db.users.find_one({"_id":ObjectId(row["owner"])},{"name":1})
            note["shared_by"]=(author or {}).get("name","Member")
            result.append(note)
        except HTTPException:
            continue
    return result

@router.post("/events")
def invite_event(data:ShareRequest,user:str=Depends(get_current_user)):
    db=get_db();require_friend(db,user,data.recipient_id)
    if not ObjectId.is_valid(data.resource_id):
        raise HTTPException(400,"Invalid event")
    item=db.events.find_one({"_id":ObjectId(data.resource_id),"user_id":user})
    if not item:raise HTTPException(404,"Event not found")
    db.shares.update_one({"owner":user,"recipient":data.recipient_id,"kind":"event","resource_id":data.resource_id},
                        {"$setOnInsert":{"created_at":datetime.now(timezone.utc)}},upsert=True)
    return {"invited":True}

@router.get("/events")
def invited_events(user:str=Depends(get_current_user)):
    db=get_db();result=[]
    for row in db.shares.find({"recipient":user,"kind":"event"}).limit(200):
        if not ObjectId.is_valid(row["resource_id"]):continue
        event=db.events.find_one({"_id":ObjectId(row["resource_id"]),"user_id":row["owner"]})
        if not event:continue
        owner=db.users.find_one({"_id":ObjectId(row["owner"])},{"name":1})
        result.append({"id":str(event["_id"]),"title":event["title"],"date":event["date"],
                       "start_time":event.get("start_time"),"end_time":event.get("end_time"),
                       "source":"invited","source_id":"invited","owner_name":(owner or {}).get("name","Member"),
                       "read_only":True})
    return result

@router.post("/challenges")
def share_challenge(data:ShareRequest,user:str=Depends(get_current_user)):
    db=get_db();require_friend(db,user,data.recipient_id)
    work=db.workspaces.find_one({"user_id":user},{"challenges":1}) or {}
    item=next((x for x in work.get("challenges",[]) if x.get("id")==data.resource_id),None)
    if not item:raise HTTPException(404,"Challenge not found")
    db.shares.update_one({"owner":user,"recipient":data.recipient_id,"kind":"challenge","resource_id":data.resource_id},
                        {"$set":{"snapshot":{k:item.get(k) for k in ("title","target","unit","period")}}},
                        upsert=True)
    return {"shared":True}

@router.get("/challenges")
def shared_challenges(user:str=Depends(get_current_user)):
    db=get_db();results=[]
    for row in db.shares.find({"recipient":user,"kind":"challenge"}).limit(100):
        owner=db.users.find_one({"_id":ObjectId(row["owner"])},{"name":1})
        results.append({**row.get("snapshot",{}),"id":row["resource_id"],"shared_by":(owner or {}).get("name","Member")})
    return results
