"""Expose the existing FastAPI application through Vercel's /api function.

The Python implementation remains in backend/api; keep a single source of
truth for API routes.
"""
from backend.api.index import app
