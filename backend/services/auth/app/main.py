from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from contextlib import asynccontextmanager
from app.core.config import settings
from app.core.database import create_tables
from app.api.v1.router import api_router
import time


@asynccontextmanager
async def lifespan(app: FastAPI):
    print(f"Starting {settings.APP_NAME} v{settings.VERSION}...")
    print(f"Environment: {settings.ENVIRONMENT}")
    print(f"API Docs: http://localhost:8001/docs")

    if settings.ENVIRONMENT == "development":
        print("Creating database tables...")
        await create_tables()
        print("Database tables created")

    yield

    print(f"{settings.APP_NAME} shutting down...")


app = FastAPI(
    title=settings.APP_NAME,
    version=settings.VERSION,
    description="Authentication & Authorization Microservice for DevMetrics Platform",
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
)


@app.middleware("http")
async def add_process_time_header(request: Request, call_next):
    start_time = time.time()
    response = await call_next(request)
    process_time = time.time() - start_time
    response.headers["X-Process-Time"] = str(process_time)
    return response


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(
    request: Request, exc: RequestValidationError
):
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={"detail": exc.errors(), "message": "Validation error"},
    )


@app.get("/", tags=["Root"])
async def root():
    return {
        "service": settings.APP_NAME,
        "version": settings.VERSION,
        "status": "running",
        "environment": settings.ENVIRONMENT,
        "endpoints": {
            "docs": "/docs",
            "redoc": "/redoc",
            "health": "/health",
            "api_v1": "/api/v1",
        },
    }


@app.get("/health", tags=["Health"])
async def health_check():
    return {
        "status": "healthy",
        "service": "auth",
        "version": settings.VERSION,
        "environment": settings.ENVIRONMENT,
    }


app.include_router(api_router, prefix="/api/v1")
