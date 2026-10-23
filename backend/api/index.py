"""FastAPI entry point for the separate Vercel backend project."""
from fastapi import FastAPI
from .routes import auth, dashboard, calendar

app = FastAPI(title="LifeOrbit API", version="0.1.0", docs_url="/api/docs", openapi_url="/api/openapi.json")
app.include_router(auth.router, prefix="/api/v1")
app.include_router(dashboard.router, prefix="/api/v1")
app.include_router(calendar.router, prefix="/api/v1")


@app.get("/api/health")
async def health():
    # Health only confirms the API process, not MongoDB connectivity.
    return {"status": "ok", "service": "lifeorbit-api"}
