# Main Entry Point for the FastAPI Application.
#
# This file initializes the FastAPI server, configures Cross-Origin Resource
# Sharing (CORS) to allow requests from the React frontend, and registers
# all API routers (Authentication, Dashboard, Calendar). It serves as the
# primary handler for Vercel Serverless Functions.
# ============================================================================

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# Import route modules
from api.routes import auth, dashboard, calendar

# Initialize FastAPI application
app = FastAPI(
    title="Hackathon API",
    description="Backend API for authentication, dashboard, and calendar",
    version="1.0.0"
)

# Configure CORS to allow requests from the React frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # For production, replace "*" with the actual frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register API routes
app.include_router(auth.router, prefix="/api/auth", tags=["Authentication"])
app.include_router(dashboard.router, prefix="/api/dashboard", tags=["Dashboard"])
app.include_router(calendar.router, prefix="/api/calendar", tags=["Calendar"])

# Health check endpoint for testing deployment
@app.get("/api/health")
def health_check():
    """
    Returns the current status of the API.
    """
    return {"status": "healthy", "service": "hackathon-backend"}