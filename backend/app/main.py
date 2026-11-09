import os
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from app.config import settings
from app.database import Base, engine
from app.seed import seed_database
from app.routers import (
    auth,
    dashboard,
    products,
    customers,
    inventory,
    orders,
    approvals,
    users,
    settings as settings_router,
    emails
)

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Ensure tables exist and default data is seeded
    Base.metadata.create_all(bind=engine)
    try:
        seed_database()
    except Exception as e:
        print(f"Warning: Seeding encountered: {e}")
    yield

app = FastAPI(
    title=settings.PROJECT_NAME,
    description="Professional Sales & Inventory Management System with Manager Approval Workflows and SMTP Email Notifications.",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan
)

# CORS configuration for React frontend communication
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register all REST API endpoints under /api
app.include_router(auth.router, prefix=settings.API_V1_PREFIX)
app.include_router(dashboard.router, prefix=settings.API_V1_PREFIX)
app.include_router(products.router, prefix=settings.API_V1_PREFIX)
app.include_router(customers.router, prefix=settings.API_V1_PREFIX)
app.include_router(inventory.router, prefix=settings.API_V1_PREFIX)
app.include_router(orders.router, prefix=settings.API_V1_PREFIX)
app.include_router(approvals.router, prefix=settings.API_V1_PREFIX)
app.include_router(users.router, prefix=settings.API_V1_PREFIX)
app.include_router(settings_router.router, prefix=settings.API_V1_PREFIX)
app.include_router(emails.router, prefix=settings.API_V1_PREFIX)

@app.get("/api/health")
def health_check():
    return {
        "status": "healthy",
        "system": settings.PROJECT_NAME,
        "database": "connected"
    }

# Mount React static build if available
frontend_dist = os.path.abspath(
    os.path.join(os.path.dirname(__file__), "..", "..", "frontend", "dist")
)

if os.path.exists(frontend_dist):
    app.mount("/assets", StaticFiles(directory=os.path.join(frontend_dist, "assets")), name="assets")

    @app.get("/{full_path:path}")
    async def serve_frontend(full_path: str):
        file_path = os.path.join(frontend_dist, full_path)
        if os.path.isfile(file_path):
            return FileResponse(file_path)
        return FileResponse(os.path.join(frontend_dist, "index.html"))
else:
    @app.get("/")
    def root():
        return {
            "message": "ApexTrack Sales & Inventory Management API is running.",
            "docs": "/docs",
            "api_health": "/api/health"
        }
