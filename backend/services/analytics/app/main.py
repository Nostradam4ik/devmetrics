from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from app.core.config import settings
from app.core.cache import cache_service
from app.api.v1.router import api_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup and shutdown events."""
    print(f"Starting {settings.APP_NAME} v{settings.VERSION}...")
    await cache_service.connect()
    print("Cache service connected")
    yield
    await cache_service.disconnect()
    print(f"{settings.APP_NAME} shutting down...")


app = FastAPI(
    title=settings.APP_NAME,
    version=settings.VERSION,
    description="Analytics & Metrics Calculation Service",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/", tags=["Root"])
async def root():
    return {
        "service": settings.APP_NAME,
        "version": settings.VERSION,
        "status": "running",
    }


@app.get("/health", tags=["Health"])
async def health_check():
    return {
        "status": "healthy",
        "service": "analytics",
        "version": settings.VERSION,
    }


app.include_router(api_router, prefix="/api/v1")
