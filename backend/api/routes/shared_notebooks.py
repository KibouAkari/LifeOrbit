"""Shared notebooks are separate, owner-controlled workspaces."""
from datetime import datetime,timezone
from bson import ObjectId
from fastapi import APIRouter,Depends,HTTPException,Query
from pydantic import BaseModel,Field
from backend.api.database import get_db
from backend.api.routes.auth import get_current_user

router=APIRouter()
class NotebookInput(BaseModel):
    title:str=Field(min_length=1,max_length=80)
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
    next_offset=offset+limit if len(books)>limit else None
    return {"items":[serialize(db,b,user) for b in books[:limit]],"next_offset":next_offset}

@router.post("",status_code=201)
def create_notebook(payload:NotebookInput,user:str=Depends(get_current_user)):
    db=get_db()
    doc={"title":payload.title.strip(),"owner":user,"members":[],"pages":[],"updated_at":datetime.now(timezone.utc)}
    doc["_id"]=db.shared_notebooks.insert_one(doc).inserted_id
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
    db.shared_notebooks.update_one({"_id":book["_id"]},{"$addToSet":{"members":target}})
    return {"invited":True}

@router.put("/{id}/pages/{page_id}")
def save_page(id:str,page_id:str,payload:PageInput,user:str=Depends(get_current_user)):
    db=get_db();book=locate(db,id,user)
    # Each page has a unique id. Update its content in one atomic DB operation.
    document=db.shared_notebooks.update_one({"_id":book["_id"],"pages.id":page_id},
       {"$set":{"pages.$.title":payload.title,"pages.$.body":payload.body,"updated_at":datetime.now(timezone.utc)}})
    if not document.matched_count:
        inserted=db.shared_notebooks.update_one(
            {"_id":book["_id"],"pages.id":{"$ne":page_id},
             "$expr":{"$lt":[{"$size":{"$ifNull":["$pages",[]]}},100]}},
            {"$push":{"pages":{"id":page_id,"title":payload.title,"body":payload.body}},
             "$set":{"updated_at":datetime.now(timezone.utc)}})
        if not inserted.matched_count:
            updated=db.shared_notebooks.update_one({"_id":book["_id"],"pages.id":page_id},
                {"$set":{"pages.$.title":payload.title,"pages.$.body":payload.body,"updated_at":datetime.now(timezone.utc)}})
            if not updated.matched_count:raise HTTPException(400,"Notebook is full")
    return {"saved":True}

@router.delete("/{id}")
def delete_notebook(id:str,user:str=Depends(get_current_user)):
    db=get_db();book=locate(db,id,user)
    if book["owner"]!=user:raise HTTPException(403,"Only the owner can delete this notebook")
    db.shared_notebooks.delete_one({"_id":book["_id"]})
    return {"removed":True}
