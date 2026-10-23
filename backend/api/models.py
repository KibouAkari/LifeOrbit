# Data Validation Models

from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class CalendarEventRequest(BaseModel):
    # Schema for creating a calendar event
    title: str
    description: Optional[str] = None
    start_time: datetime
    end_time: datetime