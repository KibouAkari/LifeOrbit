"""LifeOrbital ASGI application."""
import logging
import os
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from pymongo.errors import PyMongoError
from backend.api.routes import auth, calendar, challenges, dashboard, tasks, workspace

app = FastAPI(title="LifeOrbital API", version="0.4.0",
              docs_url=None if os.getenv("VERCEL_ENV")=="production" else "/api/docs",
              openapi_url="/api/openapi.json", redoc_url=None)

origins=[x.strip() for x in os.getenv("FRONTEND_ORIGINS","http://localhost:5173").split(",") if x.strip()]
app.add_middleware(CORSMiddleware,allow_origins=origins,
                   allow_credentials=False,allow_methods=["GET","POST","PUT","PATCH","DELETE"],
                   allow_headers=["Authorization","Content-Type"])
app.include_router(auth.router,prefix="/api/auth")
app.include_router(calendar.router,prefix="/api/calendar")
app.include_router(tasks.router,prefix="/api/tasks")
app.include_router(dashboard.router,prefix="/api/dashboard")
app.include_router(workspace.router,prefix="/api/workspace")

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
