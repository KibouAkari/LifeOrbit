"""Task CRUD with per-user filtering on every write and read."""
from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException
from pymongo import ReturnDocument
from backend.api.database import get_db
from backend.api.models import TaskInput, TaskPatch
from backend.api.routes.auth import get_current_user

router = APIRouter()

def output(doc):
    return {"id": str(doc["_id"]), "title": doc["title"], "done": doc["done"], "order": doc.get("order", 0)}

@router.get("")
def list_tasks(user: str = Depends(get_current_user)):
    return [output(x) for x in get_db().tasks.find({"user_id": user}).sort("order", 1).limit(1000)]

@router.post("", status_code=201)
def create_task(data: TaskInput, user: str = Depends(get_current_user)):
    doc = {**data.model_dump(), "user_id": user}
    result = get_db().tasks.insert_one(doc)
    return output({"_id": result.inserted_id, **doc})

@router.patch("/{task_id}")
def edit_task(task_id: str, data: TaskPatch, user: str = Depends(get_current_user)):
    if not ObjectId.is_valid(task_id):
        raise HTTPException(400, "Invalid task ID")
    fields = data.model_dump(exclude_none=True)
    if not fields:
        raise HTTPException(400, "No changes")
    doc = get_db().tasks.find_one_and_update(
        {"_id": ObjectId(task_id), "user_id": user},
        {"$set": fields}, return_document=ReturnDocument.AFTER,
    )
    if doc is None:
        raise HTTPException(404, "Task not found")
    return output(doc)

@router.delete("/{task_id}")
def delete_task(task_id: str, user: str = Depends(get_current_user)):
    if not ObjectId.is_valid(task_id):
        raise HTTPException(400, "Invalid task ID")
    count = get_db().tasks.delete_one({"_id": ObjectId(task_id), "user_id": user}).deleted_count
    if not count:
        raise HTTPException(404, "Task not found")
    return {"deleted": True}
