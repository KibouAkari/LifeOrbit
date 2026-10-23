from pydantic import BaseModel
from typing import Optional
from datetime import datetime

# Schema for user registration
class UserRegister(BaseModel):
    username: str
    email: str
    password: str

# Schema for creating a new calendar event
class CalendarEvent(BaseModel):
    title: str
    description: Optional[str] = None
    start_time: datetime
    end_time: datetime
    user_id: str