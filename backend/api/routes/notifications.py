"""Unread sharing invitations and upcoming task deadlines for the current account."""
from datetime import datetime,timezone,timedelta
from itertools import islice
from fastapi import APIRouter,Depends
from pydantic import BaseModel,Field
from bson import ObjectId
from backend.api.database import get_db
from backend.api.routes.auth import get_current_user
router=APIRouter()
class ReadRequest(BaseModel):
    id:str=Field(min_length=5,max_length=180)
@router.get("")
def list_notifications(user:str=Depends(get_current_user)):
    db=get_db()
    now=datetime.now(timezone.utc)
    seen=set((db.notification_state.find_one({"user_id":user}) or {}).get("read",[]))
    results=[]
    share_cursor=db.shares.find(
        {"recipient":user,"kind":{"$in":["event","note"]}}
    ).sort("created_at",-1).batch_size(100)
    unread_shares=(share for share in share_cursor if "share:"+str(share["_id"]) not in seen)
    while len(results)<100:
        batch=list(islice(unread_shares,100-len(results)))
        if not batch:break
        owners={share.get("owner","") for share in batch
                if isinstance(share.get("owner"),str) and ObjectId.is_valid(share["owner"])}
        pairs={"-".join(sorted((owner,user))) for owner in owners}
        accepted_pairs={row["pair"] for row in db.friendships.find(
            {"pair":{"$in":list(pairs)},"status":"accepted"},{"pair":1}
        )} if pairs else set()
        active_owners={owner for owner in owners if "-".join(sorted((owner,user))) in accepted_pairs}
        workspaces={row["user_id"]:row for row in db.workspaces.find(
            {"user_id":{"$in":list(active_owners)}},{"user_id":1,"notes":1}
        )} if active_owners else {}
        events={}
        event_ids={ObjectId(share["resource_id"]) for share in batch
                   if share.get("kind")=="event" and share.get("owner") in active_owners
                   and ObjectId.is_valid(share.get("resource_id",""))}
        if event_ids:
            events={str(event["_id"]):event for event in db.events.find(
                {"_id":{"$in":list(event_ids)}},{"user_id":1}
            )}
        eligible=[]
        for share in batch:
            owner=share.get("owner","")
            if owner not in active_owners:continue
            resource_id=share.get("resource_id","")
            if share["kind"]=="event":
                event=events.get(resource_id)
                if not event or event.get("user_id")!=owner:continue
            elif not any(note.get("id")==resource_id for note in workspaces.get(owner,{}).get("notes",[])):
                continue
            eligible.append(share)
        author_ids=[ObjectId(owner) for owner in {share["owner"] for share in eligible}]
        authors={str(author["_id"]):author.get("name","A friend") for author in db.users.find(
            {"_id":{"$in":author_ids}},{"name":1}
        )} if author_ids else {}
        for share in eligible:
            key="share:"+str(share["_id"])
            results.append({"id":key,"kind":share["kind"],
                            "title":f'{authors.get(share["owner"],"A friend")} shared a {share["kind"]}',
                            "target":"calendar" if share["kind"]=="event" else "notes"})
            if len(results)==100:break
    if len(results)<100:
        for task in db.tasks.find({"user_id":user,"done":False,"due_at":{"$gte":now,"$lte":now+timedelta(hours=1)}}).batch_size(100):
            due=task.get("due_at")
            if not due:continue
            key="task:"+str(task["_id"])+":"+due.isoformat()
            if key in seen:continue
            results.append({"id":key,"kind":"task","title":"Due within an hour: "+task.get("title","Task"),"target":"tasks"})
            if len(results)==100:break
    return {"items":results[:100],"count":min(len(results),100)}
@router.post("/read")
def read_notification(data:ReadRequest,user:str=Depends(get_current_user)):
    get_db().notification_state.update_one({"user_id":user},{"$addToSet":{"read":data.id}},upsert=True)
    return {"read":True}
