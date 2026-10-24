"""Request schemas shared by the Python API."""
from datetime import date, time
from typing import Literal

from pydantic import BaseModel, Field


class CalendarEventRequest(BaseModel):
    title: str = Field(min_length=1, max_length=120)
    date: date
    start_time: time | None = None
    end_time: time | None = None


class TaskInput(BaseModel):
    title: str = Field(min_length=1, max_length=120)
    done: bool = False
    order: int = 0


class TaskPatch(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=120)
    done: bool | None = None
    order: int | None = None


class NoteInput(BaseModel):
    title: str = Field(min_length=1, max_length=120)
    body: str = Field(default="", max_length=50000)
    chapter_id: str = "personal"


class SubscriptionInput(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    amount: float = Field(ge=0)
    currency: Literal["CHF", "EUR", "USD"] = "CHF"
    interval: Literal["monthly", "yearly"] = "monthly"
    renews: date | None = None
