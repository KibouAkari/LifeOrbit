"""Shared request schemas. Keep transport validation out of route logic."""
from pydantic import BaseModel, Field


class CalendarEventInput(BaseModel):
    title: str = Field(min_length=1, max_length=120)
    starts_at: str
    ends_at: str
    timezone: str = "UTC"
