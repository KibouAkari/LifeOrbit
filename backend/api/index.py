"""ASGI application serving authenticated LifeOrbital requests."""
import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from backend.api.routes import auth, dashboard, calendar, tasks

app = FastAPI(
    title="LifeOrbital API",
    version="0.3.0",
    docs_url=None if os.getenv("VERCEL_ENV") == "production" else "/api/docs",
    redoc_url=None,
)
origins = [value.strip() for value in os.getenv(
    "FRONTEND_ORIGINS", "http://localhost:5173"
).split(",") if value.strip()]
app.add_middleware(
    CORSMiddleware, allow_origins=origins,
    allow_credentials=False,
    allow_methods=["GET", "POST", "PATCH", "DELETE"],
    allow_headers=["Authorization", "Content-Type"],
)
app.include_router(auth.router, prefix="/api/auth", tags=["Authentication"])
app.include_router(dashboard.router, prefix="/api/dashboard", tags=["Dashboard"])
app.include_router(calendar.router, prefix="/api/calendar", tags=["Calendar"])
app.include_router(tasks.router, prefix="/api/tasks", tags=["Tasks"])

@app.get("/api/health")
def health():
    """This is a process health check; it does not assert DB connectivity."""
    return {"status": "healthy", "service": "lifeorbital-api"}
