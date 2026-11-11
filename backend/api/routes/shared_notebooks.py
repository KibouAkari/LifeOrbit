"""Shared notebooks are separate, owner-controlled workspaces."""
from datetime import datetime,timezone
from uuid import uuid4
from bson import ObjectId
from fastapi import APIRouter,Depends,HTTPException,Query
from pydantic import BaseModel,Field
from backend.api.database import get_db
from backend.api.routes.auth import get_current_user
from backend.api.realtime import (configured, notebook_room, publish_to_users,
                                  revoke_book_access, sync_book_access)

router=APIRouter()
class NotebookInput(BaseModel):
    title:str=Field(min_length=1,max_length=80)
class MoveNoteInput(BaseModel):
    note_id:str=Field(min_length=1,max_length=80)

class MemberInput(BaseModel):
    user_id:str=Field(min_length=24,max_length=24)
class PageInput(BaseModel):
    title:str=Field(min_length=1,max_length=120)
    body:str=Field(default="",max_length=50000)

def access(book,user):
    return book and (book["owner"]==user or user in book.get("members",[]))

def locate(db,id,user):
    if not ObjectId.is_valid(id):raise HTTPException(400,"Invalid notebook")
    book=db.shared_notebooks.find_one({"_id":ObjectId(id)})
    if not access(book,user):raise HTTPException(404,"Notebook not found")
    if book["owner"]!=user:
        pair="-".join(sorted((book["owner"],user)))
        if not db.friendships.find_one({"pair":pair,"status":"accepted"}):
            raise HTTPException(404,"Notebook not found")
    return book

def serialize(db,book,viewer):
    ids=[book["owner"],*book.get("members",[])]
    names={str(u["_id"]):u.get("name","Member") for u in db.users.find(
        {"_id":{"$in":[ObjectId(i) for i in ids if ObjectId.is_valid(i)]}},{"name":1})}
    return {"id":str(book["_id"]),"title":book["title"],"owner":book["owner"],"is_owner":book["owner"]==viewer,
            "owner_name":names.get(book["owner"],"Member"),"members":[{"id":i,"name":names.get(i,"Member")} for i in book.get("members",[])],
            "pages":book.get("pages",[]),"updated_at":book.get("updated_at").isoformat() if book.get("updated_at") else None}

@router.get("")
def list_notebooks(user:str=Depends(get_current_user),offset:int=Query(0,ge=0),limit:int=Query(100,ge=1,le=100)):
    db=get_db()
    books=list(db.shared_notebooks.find({"$or":[{"owner":user},{"members":user}]})
               .sort("_id",1).skip(offset).limit(limit+1))
    # Never disclose notebook pages to former friends with stale memberships.
    visible=[]
    for book in books[:limit]:
        if book["owner"]==user:
            visible.append(serialize(db,book,user))
            continue
        pair="-".join(sorted((book["owner"],user)))
        if db.friendships.find_one({"pair":pair,"status":"accepted"}):
            visible.append(serialize(db,book,user))
    next_offset=offset+limit if len(books)>limit else None
    return {"items":visible,"next_offset":next_offset}

@router.post("",status_code=201)
def create_notebook(payload:NotebookInput,user:str=Depends(get_current_user)):
    db=get_db()
    if db.shared_notebooks.count_documents({"owner":user})>=50:
        raise HTTPException(429,"Maximum of 50 owned notebooks")
    doc={"title":payload.title.strip(),"owner":user,"members":[],"pages":[],"updated_at":datetime.now(timezone.utc)}
    doc["_id"]=db.shared_notebooks.insert_one(doc).inserted_id
    publish_to_users([user],"notebooks")
    return serialize(db,doc,user)

@router.post("/from-note",status_code=201)
def move_personal_note(data:MoveNoteInput,user:str=Depends(get_current_user)):
    """Copy first, then remove the personal source. Never delete source on failed copy."""
    db=get_db()
    existing=db.shared_notebooks.find_one({"owner":user,"origin_note_id":data.note_id})
    if existing:return serialize(db,existing,user)
    workspace=db.workspaces.find_one({"user_id":user},{"notes":1}) or {}
    note=next((n for n in workspace.get("notes",[]) if n.get("id")==data.note_id),None)
    if not note:raise HTTPException(404,"Personal note not found")
    page={"id":data.note_id,"title":note.get("title") or "Untitled note","body":note.get("body") or ""}
    doc={"owner":user,"origin_note_id":data.note_id,"title":page["title"],
         "members":[],"pages":[page],"updated_at":datetime.now(timezone.utc)}
    result=db.shared_notebooks.insert_one(doc);doc["_id"]=result.inserted_id
    db.workspaces.update_one({"user_id":user},{"$pull":{"notes":{"id":data.note_id}}})
    publish_to_users([user],"notebooks")
    return serialize(db,doc,user)

@router.post("/{id}/members")
def invite_member(id:str,payload:MemberInput,user:str=Depends(get_current_user)):
    db=get_db();book=locate(db,id,user)
    if book["owner"]!=user:raise HTTPException(403,"Only the owner can invite members")
    target=payload.user_id
    if target==user or not ObjectId.is_valid(target):raise HTTPException(400,"Invalid member")
    pair="-".join(sorted((user,target)))
    if not db.friendships.find_one({"pair":pair,"status":"accepted"}):
        raise HTTPException(403,"Only confirmed friends can be invited")
    db.shared_notebooks.update_one({"_id":book["_id"],"owner":user},{"$addToSet":{"members":target}})
    book=db.shared_notebooks.find_one({"_id":book["_id"]})
    if configured() and (db.realtime_notebooks.find_one({"_id":notebook_room(id)}) or {}).get("status")=="ready":
        sync_book_access(db,book)
    publish_to_users([user,target],"notebooks")
    publish_to_users([target],"notifications")
    return {"invited":True}

@router.post("/{id}/pages",status_code=201)
def create_page(id:str,user:str=Depends(get_current_user)):
    """Create only page metadata. Live text is edited via its Yjs CRDT."""
    db=get_db();book=locate(db,id,user)
    page={"id":uuid4().hex,"title":"Untitled page","body":""}
    result=db.shared_notebooks.update_one(
        {"_id":book["_id"],"$or":[{"owner":user},{"members":user}],
         "$expr":{"$lt":[{"$size":{"$ifNull":["$pages",[]]}},100]}},
        {"$push":{"pages":page},"$set":{"updated_at":datetime.now(timezone.utc)}})
    if not result.matched_count:raise HTTPException(400,"Notebook is full")
    publish_to_users([book["owner"],*book.get("members",[])],"notebooks")
    return page


@router.put("/{id}/pages/{page_id}")
def save_page(id:str,page_id:str,payload:PageInput,user:str=Depends(get_current_user)):
    db=get_db();book=locate(db,id,user)
    # Old full-text saves must not overwrite a CRDT-backed collaborative page.
    if db.realtime_notebooks.find_one({"_id":notebook_room(id)}):
        raise HTTPException(409,"This notebook is migrating or uses live collaboration")
    # Each write rechecks membership to prevent a stale authorization snapshot.
    if not 1<=len(page_id)<=80:raise HTTPException(400,"Invalid page ID")
    member_scope={"_id":book["_id"],"$or":[{"owner":user},{"members":user}]}
    document=db.shared_notebooks.update_one({**member_scope,"pages.id":page_id},
       {"$set":{"pages.$.title":payload.title,"pages.$.body":payload.body,"updated_at":datetime.now(timezone.utc)}})
    if not document.matched_count:
        inserted=db.shared_notebooks.update_one(
            {**member_scope,"pages.id":{"$ne":page_id},
             "$expr":{"$lt":[{"$size":{"$ifNull":["$pages",[]]}},100]}},
            {"$push":{"pages":{"id":page_id,"title":payload.title,"body":payload.body}},
             "$set":{"updated_at":datetime.now(timezone.utc)}})
        if not inserted.matched_count:
            updated=db.shared_notebooks.update_one({**member_scope,"pages.id":page_id},
                {"$set":{"pages.$.title":payload.title,"pages.$.body":payload.body,"updated_at":datetime.now(timezone.utc)}})
            if not updated.matched_count:raise HTTPException(400,"Notebook is full")
    publish_to_users([book["owner"],*book.get("members",[])],"notebooks")
    return {"saved":True}

@router.delete("/{id}/pages/{page_id}")
def delete_page(id:str,page_id:str,user:str=Depends(get_current_user)):
    book=locate(get_db(),id,user)
    if not 1<=len(page_id)<=80:raise HTTPException(400,"Invalid page ID")
    result=get_db().shared_notebooks.update_one(
        {"_id":book["_id"],"$or":[{"owner":user},{"members":user}],"pages.id":page_id},
        {"$pull":{"pages":{"id":page_id}},"$set":{"updated_at":datetime.now(timezone.utc)}})
    if not result.modified_count:raise HTTPException(404,"Page not found")
    publish_to_users([book["owner"],*book.get("members",[])],"notebooks")
    return {"removed":True}

@router.delete("/{id}")
def delete_notebook(id:str,user:str=Depends(get_current_user)):
    db=get_db();book=locate(db,id,user)
    if book["owner"]!=user:raise HTTPException(403,"Only the owner can delete this notebook")
    # Remove provider ACL before removing Mongo metadata, preserving safety on failure.
    revoke_book_access(book)
    db.shared_notebooks.delete_one({"_id":book["_id"],"owner":user})
    publish_to_users([book["owner"],*book.get("members",[])],"notebooks")
    return {"removed":True}
