"""LifeOrbital ASGI application."""
import logging
import os
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from pymongo.errors import PyMongoError
from backend.api.routes import auth, calendar, challenges, dashboard, tasks, workspace, leaderboard, friends, sharing, calendar_feeds, shared_notebooks, notifications

app = FastAPI(title="LifeOrbital API", version="0.4.0",
              docs_url=None if os.getenv("VERCEL_ENV")=="production" else "/api/docs",
              openapi_url=None if os.getenv("VERCEL_ENV")=="production" else "/api/openapi.json", redoc_url=None)

origins=[x.strip() for x in os.getenv("FRONTEND_ORIGINS","http://localhost:5173").split(",") if x.strip()]
@app.middleware("http")
async def protect_browser_requests(request: Request, call_next):
    """Require an allowed Origin for cookie-authenticated writes (CSRF)."""
    if request.method in {"POST", "PUT", "PATCH", "DELETE"}:
        length = request.headers.get("content-length", "")
        if length.isdecimal() and int(length) > 2 * 1024 * 1024:
            return JSONResponse(status_code=413, content={"detail": "Request is too large"})
        if request.cookies.get("lifeorbital_auth"):
            origin = request.headers.get("origin")
            host = request.headers.get("host", "").lower()
            scheme = "https" if os.getenv("VERCEL") == "1" else request.url.scheme
            allowed = set(origins)
            if host:
                allowed.add(f"{scheme}://{host}")
            if not origin or origin not in allowed:
                return JSONResponse(status_code=403, content={"detail": "Untrusted request origin"})
    return await call_next(request)

app.add_middleware(CORSMiddleware,allow_origins=origins,
                   allow_credentials=True,allow_methods=["GET","POST","PUT","PATCH","DELETE"],
                   allow_headers=["Authorization","Content-Type"])
app.include_router(auth.router,prefix="/api/auth")
app.include_router(calendar.router,prefix="/api/calendar")
app.include_router(tasks.router,prefix="/api/tasks")
app.include_router(dashboard.router,prefix="/api/dashboard")
app.include_router(workspace.router,prefix="/api/workspace")
app.include_router(leaderboard.router,prefix="/api/leaderboard")
app.include_router(friends.router,prefix="/api/friends")
app.include_router(sharing.router,prefix="/api/sharing")
app.include_router(calendar_feeds.router,prefix="/api/calendar/feeds")
app.include_router(shared_notebooks.router,prefix="/api/shared-notebooks")
app.include_router(notifications.router,prefix="/api/notifications")

@app.exception_handler(PyMongoError)
async def mongodb_failure(request: Request, exc: PyMongoError):
    logging.getLogger(__name__).error("MongoDB request failed: %s", type(exc).__name__)
    return JSONResponse(status_code=503,content={"detail":"Database is temporarily unavailable. Check the MongoDB Atlas connection."})

@app.get("/api/health")
def health():
    return {"status":"healthy","service":"lifeorbital-api"}

@app.get("/api/health/database")
def database_health():
    from backend.api.database import get_db, database_error
    try:
        get_db().command("ping")
        return {"status":"connected"}
    except PyMongoError as exc:
        database_error(exc)
