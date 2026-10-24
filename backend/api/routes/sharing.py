"""Private shares use authenticated friendships and explicit recipient IDs."""
from datetime import datetime,timezone
from bson import ObjectId
from fastapi import APIRouter,Depends,HTTPException
from pydantic import BaseModel,Field
from pymongo import ReturnDocument
from backend.api.database import get_db
from backend.api.routes.auth import get_current_user

router=APIRouter()

class RSVPRequest(BaseModel):
    status: str = Field(pattern="^(accepted|declined)$")

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
    db=get_db();rows=list(db.shares.find({"recipient":user,"kind":"note"}).limit(100))
    owners={row["owner"] for row in rows if ObjectId.is_valid(row.get("owner",""))}
    pairs={"-".join(sorted((owner,user))) for owner in owners}
    accepted_pairs={row["pair"] for row in db.friendships.find(
        {"pair":{"$in":list(pairs)},"status":"accepted"},{"pair":1})} if pairs else set()
    active_owners={owner for owner in owners if "-".join(sorted((owner,user))) in accepted_pairs}
    owner_ids=[ObjectId(owner) for owner in active_owners]
    workspaces={workspace["user_id"]:workspace for workspace in db.workspaces.find(
        {"user_id":{"$in":list(active_owners)}},{"user_id":1,"notes":1})} if active_owners else {}
    notes_by_owner={owner:{note.get("id"):note for note in workspace.get("notes",[])}
                    for owner,workspace in workspaces.items()}
    authors={str(author["_id"]):author for author in db.users.find(
        {"_id":{"$in":owner_ids}},{"name":1})} if owner_ids else {}
    result=[]
    for row in rows:
        owner=row["owner"]
        if owner not in active_owners:
            continue
        note=notes_by_owner.get(owner,{}).get(row["resource_id"])
        if not note:
            continue
        result.append({"id":row["resource_id"],"title":note.get("title",""),
                       "body":note.get("body",""),"owner":owner,
                       "shared_by":authors.get(owner,{}).get("name","Member")})
    return result

@router.post("/events")
def invite_event(data:ShareRequest,user:str=Depends(get_current_user)):
    db=get_db();require_friend(db,user,data.recipient_id)
    if not ObjectId.is_valid(data.resource_id):
        raise HTTPException(400,"Invalid event")
    item=db.events.find_one({"_id":ObjectId(data.resource_id),"user_id":user})
    if not item:raise HTTPException(404,"Event not found")
    db.shares.update_one({"owner":user,"recipient":data.recipient_id,"kind":"event","resource_id":data.resource_id},
                        {"$setOnInsert":{"created_at":datetime.now(timezone.utc),"status":"pending"}},upsert=True)
    return {"invited":True}

@router.patch("/events/{share_id}/response")
def respond_event(share_id:str,data:RSVPRequest,user:str=Depends(get_current_user)):
    if not ObjectId.is_valid(share_id):raise HTTPException(400,"Invalid invitation")
    db=get_db()
    row=db.shares.find_one_and_update(
        {"_id":ObjectId(share_id),"recipient":user,"kind":"event"},
        {"$set":{"status":data.status,"responded_at":datetime.now(timezone.utc)}},
        return_document=ReturnDocument.AFTER)
    if not row:raise HTTPException(404,"Invitation not found")
    return {"status":row["status"]}

@router.delete("/events/{share_id}")
def remove_event_invitation(share_id:str,user:str=Depends(get_current_user)):
    if not ObjectId.is_valid(share_id):raise HTTPException(400,"Invalid invitation")
    if not get_db().shares.delete_one({"_id":ObjectId(share_id),"recipient":user,"kind":"event"}).deleted_count:
        raise HTTPException(404,"Invitation not found")
    return {"removed":True}

@router.get("/events/{event_id}/participants")
def participants(event_id:str,user:str=Depends(get_current_user)):
    db=get_db()
    if not ObjectId.is_valid(event_id):raise HTTPException(400,"Invalid event")
    ev=db.events.find_one({"_id":ObjectId(event_id)})
    if not ev:raise HTTPException(404,"Event not found")
    shares=list(db.shares.find({"kind":"event","resource_id":event_id}))
    if user!=ev["user_id"] and not any(row["recipient"]==user for row in shares):
        raise HTTPException(403,"You cannot view the participants")
    ids=[ev["user_id"]]+[row["recipient"] for row in shares]
    names={str(p["_id"]):p.get("name","Member") for p in db.users.find(
        {"_id":{"$in":[ObjectId(i) for i in ids if ObjectId.is_valid(i)]}},{"name":1})}
    return [{"id":ev["user_id"],"name":names.get(ev["user_id"],"Member"),"status":"organizer"}]+[
        {"id":row["recipient"],"name":names.get(row["recipient"],"Member"),
         "status":row.get("status","pending")} for row in shares]

@router.get("/events")
def invited_events(user:str=Depends(get_current_user)):
    db=get_db();result=[]
    for row in db.shares.find({"recipient":user,"kind":"event"}).limit(200):
        try:require_friend(db,row["owner"],user)
        except HTTPException:continue
        if not ObjectId.is_valid(row["resource_id"]):continue
        event=db.events.find_one({"_id":ObjectId(row["resource_id"]),"user_id":row["owner"]})
        if not event:continue
        owner=db.users.find_one({"_id":ObjectId(row["owner"])},{"name":1})
        result.append({"invitation_id":str(row["_id"]),"rsvp_status":row.get("status","pending"),"id":str(event["_id"]),"title":event["title"],"date":event["date"],
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
        try:require_friend(db,row["owner"],user)
        except HTTPException:continue
        owner=db.users.find_one({"_id":ObjectId(row["owner"])},{"name":1})
        results.append({**row.get("snapshot",{}),"id":row["resource_id"],"share_id":str(row["_id"]),"shared_by":(owner or {}).get("name","Member")})
    return results
