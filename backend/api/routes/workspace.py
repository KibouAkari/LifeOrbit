"""Persist notebook, subscriptions and personal challenge state per account.

This endpoint intentionally does not store UI theme or authentication details.
Data is validated before replacing an account's workspace document.
"""
from typing import Literal
from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field
from pymongo.errors import PyMongoError
from backend.api.database import database_error, get_db
from backend.api.routes.auth import get_current_user

router = APIRouter()

class Note(BaseModel):
    id: str = Field(max_length=80)
    title: str = Field(max_length=120)
    body: str = Field(max_length=50000)
    chapter_id: str = Field(default="personal", max_length=80)

class Chapter(BaseModel):
    id: str = Field(max_length=80)
    name: str = Field(max_length=80)

class Subscription(BaseModel):
    id: str = Field(max_length=80)
    name: str = Field(max_length=120)
    amount: float = Field(ge=0, le=100000000)
    currency: Literal["CHF", "EUR", "USD"]
    renews: str = Field(default="", max_length=10)
    interval: Literal["monthly", "yearly"] = "monthly"

class Challenge(BaseModel):
    id: str = Field(max_length=80)
    title: str = Field(max_length=120)
    value: int = Field(ge=0, le=100000)
    target: int = Field(ge=1, le=100000)
    unit: str = Field(max_length=30)

class Workspace(BaseModel):
    notes: list[Note] = Field(default_factory=list, max_length=500)
    chapters: list[Chapter] = Field(default_factory=lambda: [
        Chapter(id="personal", name="Personal"),
        Chapter(id="ideas", name="Ideas"),
    ], max_length=100)
    subscriptions: list[Subscription] = Field(default_factory=list, max_length=300)
    challenges: list[Challenge] = Field(default_factory=lambda: [
        Challenge(id="c1", title="Drink water", value=0, target=8, unit="glasses"),
        Challenge(id="c2", title="Move a little", value=0, target=1, unit="session"),
    ], max_length=100)

@router.get("", response_model=Workspace)
def read_workspace(user: str = Depends(get_current_user)):
    try:
        doc = get_db().workspaces.find_one({"user_id": user}, {"_id": 0, "user_id": 0})
        return doc or Workspace()
    except PyMongoError as exc:
        database_error(exc)

@router.put("", response_model=Workspace)
def save_workspace(data: Workspace, user: str = Depends(get_current_user)):
    try:
        value = data.model_dump()
        get_db().workspaces.update_one(
            {"user_id": user}, {"$set": value}, upsert=True
        )
        return data
    except PyMongoError as exc:
        database_error(exc)
