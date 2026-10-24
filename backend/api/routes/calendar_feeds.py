"""Encrypted, manual-refresh iCalendar subscriptions from vetted HTTPS providers."""
import base64
import hashlib
import os
import re
from datetime import datetime, timezone, date as Date
from urllib.parse import urlsplit

import requests
from bson import ObjectId
from cryptography.fernet import Fernet
from fastapi import APIRouter, Depends, HTTPException
from icalendar import Calendar
from pydantic import BaseModel, Field
from backend.api.database import get_db
from backend.api.routes.auth import get_current_user

router=APIRouter()
MAX_BYTES=1024*1024

class FeedInput(BaseModel):
    name:str=Field(min_length=1,max_length=80)
    url:str=Field(min_length=15,max_length=2048)

def cipher():
    key=os.getenv("JWT_SECRET_KEY","")
    if len(key)<32:raise HTTPException(503,"Encryption is not configured")
    material=hashlib.sha256(("lifeorbital:ical:feeds:v1:"+key).encode()).digest()
    return Fernet(base64.urlsafe_b64encode(material))

def validate_url(raw):
    url=urlsplit(raw)
    host=(url.hostname or "").lower().rstrip(".")
    providers={"calendar.google.com","outlook.office365.com","outlook.live.com"}
    apple=bool(re.fullmatch(r"p[0-9]+-caldav\.icloud\.com",host))
    if (url.scheme!="https" or url.username or url.password or url.port not in (None,443)
        or url.fragment or (host not in providers and not apple)):
        raise HTTPException(400,"Only HTTPS iCalendar links from supported calendar providers are accepted")
    return raw

def fetch_events(raw):
    validate_url(raw)
    try:
        response=requests.get(raw,headers={"Accept":"text/calendar"},timeout=(4,12),
                              allow_redirects=False,stream=True)
        if response.status_code!=200:raise HTTPException(422,"Calendar provider did not return a calendar file")
        chunks=[];total=0
        for chunk in response.iter_content(65536):
            total+=len(chunk)
            if total>MAX_BYTES:raise HTTPException(413,"Calendar feed exceeds the 1 MB limit")
            chunks.append(chunk)
        raw_bytes=b"".join(chunks)
        if b"BEGIN:VCALENDAR" not in raw_bytes[:500]:
            raise HTTPException(422,"Provider did not return iCalendar content")
        cal=Calendar.from_ical(raw_bytes)
    except requests.RequestException:
        raise HTTPException(502,"Calendar provider is unavailable")
    except (ValueError,TypeError,AttributeError):
        raise HTTPException(422,"Invalid iCalendar feed")
    events=[]
    for item in cal.walk("VEVENT"):
        start=item.get("dtstart")
        if not start:continue
        beginning=start.dt
        day=beginning.date() if isinstance(beginning,datetime) else beginning
        if not isinstance(day,Date):continue
        ending=item.get("dtend")
        uid=str(item.get("uid") or (str(item.get("summary"))+day.isoformat()))
        events.append({
            "title":str(item.get("summary") or "Untitled event")[:120],
            "date":day.isoformat(),
            "start_time":beginning.strftime("%H:%M") if isinstance(beginning,datetime) else None,
            "end_time":ending.dt.strftime("%H:%M") if ending and isinstance(ending.dt,datetime) else None,
            "source_key":hashlib.sha256((uid+"|"+day.isoformat()).encode()).hexdigest()
        })
        if len(events)>500:raise HTTPException(413,"Too many events in feed")
    return events

def output(doc):
    return {"id":str(doc["_id"]),"name":doc["name"],"last_synced":doc.get("last_synced").isoformat() if doc.get("last_synced") else None,"count":doc.get("count",0)}

@router.get("")
def list_feeds(user:str=Depends(get_current_user)):
    return [output(doc) for doc in get_db().calendar_feeds.find({"user_id":user}).limit(20)]

@router.post("",status_code=201)
def create_feed(payload:FeedInput,user:str=Depends(get_current_user)):
    db=get_db()
    if db.calendar_feeds.count_documents({"user_id":user})>=10:
        raise HTTPException(400,"Maximum of ten subscribed calendars")
    validate_url(payload.url)
    events=fetch_events(payload.url)
    doc={"user_id":user,"name":payload.name,"url_encrypted":cipher().encrypt(payload.url.encode()).decode(),
         "created_at":datetime.now(timezone.utc)}
    inserted=db.calendar_feeds.insert_one(doc)
    doc["_id"]=inserted.inserted_id
    apply_events(db,user,doc,events)
    return output(doc)

def apply_events(db,user,feed,events):
    source_id=str(feed["_id"])
    keys=[]
    for ev in events:
        keys.append(ev["source_key"])
        db.events.update_one({"user_id":user,"source":"ical_feed","source_id":source_id,
                              "source_key":ev["source_key"]},
                             {"$set":{**ev,"user_id":user,"source":"ical_feed",
                                      "source_id":source_id,"source_name":feed["name"]}},upsert=True)
    db.events.delete_many({"user_id":user,"source":"ical_feed","source_id":source_id,
                           "source_key":{"$nin":keys}})
    feed["count"]=len(events)
    feed["last_synced"]=datetime.now(timezone.utc)
    db.calendar_feeds.update_one({"_id":feed["_id"]},{"$set":{"count":feed["count"],"last_synced":feed["last_synced"]}})

@router.post("/{feed_id}/refresh")
def refresh_feed(feed_id:str,user:str=Depends(get_current_user)):
    if not ObjectId.is_valid(feed_id):raise HTTPException(400,"Invalid subscription")
    db=get_db();feed=db.calendar_feeds.find_one({"_id":ObjectId(feed_id),"user_id":user})
    if not feed:raise HTTPException(404,"Subscribed calendar not found")
    previous=feed.get("last_synced")
    if previous and (datetime.now(timezone.utc)-previous).total_seconds()<300:
        raise HTTPException(429,"Calendar was updated recently. Try again in five minutes.")
    raw=cipher().decrypt(feed["url_encrypted"].encode()).decode()
    events=fetch_events(raw)
    apply_events(db,user,feed,events)
    return output(feed)

@router.delete("/{feed_id}")
def remove_feed(feed_id:str,user:str=Depends(get_current_user)):
    if not ObjectId.is_valid(feed_id):raise HTTPException(400,"Invalid subscription")
    db=get_db();deleted=db.calendar_feeds.delete_one({"_id":ObjectId(feed_id),"user_id":user})
    if not deleted.deleted_count:raise HTTPException(404,"Subscribed calendar not found")
    db.events.delete_many({"user_id":user,"source":"ical_feed","source_id":feed_id})
    return {"removed":True}
