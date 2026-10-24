"""Unread sharing invitations and upcoming task deadlines for the current account."""
from datetime import datetime,timezone,timedelta
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
    seen=(db.notification_state.find_one({"user_id":user}) or {}).get("read",[])
    results=[]
    for share in db.shares.find({"recipient":user,"kind":{"$in":["event","note"]}}).sort("created_at",-1).limit(100):
        owner=share.get("owner","")
        pair="-".join(sorted((owner,user)))
        if not db.friendships.find_one({"pair":pair,"status":"accepted"}):continue
        key="share:"+str(share["_id"])
        if key in seen:continue
        author=db.users.find_one({"_id":ObjectId(owner)},{"name":1}) if ObjectId.is_valid(owner) else None
        results.append({"id":key,"kind":share["kind"],"title":f'{(author or {}).get("name","A friend")} shared a {share["kind"]}',"target":"calendar" if share["kind"]=="event" else "notes"})
    for task in db.tasks.find({"user_id":user,"done":False,"due_at":{"$gte":now,"$lte":now+timedelta(hours=1)}}).limit(100):
        due=task.get("due_at")
        if not due:continue
        key="task:"+str(task["_id"])+":"+due.isoformat()
        if key in seen:continue
        results.append({"id":key,"kind":"task","title":"Due within an hour: "+task.get("title","Task"),"target":"tasks"})
    return {"items":results[:100],"count":min(len(results),100)}
@router.post("/read")
def read_notification(data:ReadRequest,user:str=Depends(get_current_user)):
    get_db().notification_state.update_one({"user_id":user},{"$addToSet":{"read":data.id}},upsert=True)
    return {"read":True}
