"""Reserved namespace for future server-authoritative multiplayer challenges.

The private workspace stores personal progress. Public leaderboards require
separate opt-in identity and fraud prevention before launch.
"""
from fastapi import APIRouter
router = APIRouter()
