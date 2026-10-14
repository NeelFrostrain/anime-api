import sys
from pathlib import Path

# Ensure both backend and project root are in sys.path
_backend_dir = Path(__file__).resolve().parent.parent
_project_root = _backend_dir.parent
for _p in (str(_backend_dir), str(_project_root)):
    if _p not in sys.path:
        sys.path.insert(0, _p)

import asyncio
import time
import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request, status
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

from backend.app.config import settings
from backend.app.database import init_db
from backend.app.services.anilist import anilist_client
from backend.app.routers.anime import router as anime_router
from backend.app.routers.search import router as search_router
from backend.app.routers.schedule import router as schedule_router
from backend.app.routers.people import router as people_router
from backend.app.routers.auth import router as auth_router
from backend.app.routers.user import router as user_router
from src.endpoints import router as src_endpoints_router
from src.proxy import router as src_proxy_router, close_proxy_client

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] [%(name)s] %(message)s",
)
logger = logging.getLogger("kuromi.api")

# Rate limiting
limiter = Limiter(key_func=get_remote_address, default_limits=["200/minute"])

async def prewarm_caches():
    try:
        from backend.app.graphql.queries import (
            SPOTLIGHT_QUERY, TRENDING_QUERY, POPULAR_QUERY, TOP_RATED_QUERY,
            UPCOMING_QUERY, TOP_AIRING_QUERY, JUST_FINISHED_QUERY, TOP_MOVIES_QUERY,
            SCHEDULE_QUERY
        )
        import datetime
        today = datetime.date.today()
        week_start = datetime.datetime.combine(today, datetime.time.min, tzinfo=datetime.timezone.utc)
        week_end = datetime.datetime.combine(today + datetime.timedelta(days=7), datetime.time.max, tzinfo=datetime.timezone.utc)

        await asyncio.gather(
            anilist_client.execute_query(SPOTLIGHT_QUERY, category="spotlight"),
            anilist_client.execute_query(TRENDING_QUERY, {"page": 1, "perPage": 24}, category="trending"),
            anilist_client.execute_query(POPULAR_QUERY, {"page": 1, "perPage": 24}, category="popular"),
            anilist_client.execute_query(TOP_RATED_QUERY, {"page": 1, "perPage": 24}, category="general"),
            anilist_client.execute_query(TOP_AIRING_QUERY, {"page": 1, "perPage": 10}, category="general"),
            anilist_client.execute_query(UPCOMING_QUERY, {"page": 1, "perPage": 10}, category="general"),
            anilist_client.execute_query(JUST_FINISHED_QUERY, {"page": 1, "perPage": 6}, category="general"),
            anilist_client.execute_query(TOP_MOVIES_QUERY, {"page": 1, "perPage": 6}, category="general"),
            anilist_client.execute_query(
                SCHEDULE_QUERY,
                {"airingAt_greater": int(week_start.timestamp()), "airingAt_lesser": int(week_end.timestamp()), "perPage": 100},
                category="schedule",
            ),
            return_exceptions=True,
        )
        logger.info("Cache pre-warmed successfully for all discovery routes.")
    except Exception as e:
        logger.warning(f"Cache pre-warming error: {e}")

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: initialize database tables
    logger.info("Initializing database...")
    init_db()
    logger.info(f"{settings.APP_NAME} Backend initialized successfully.")
    # Pre-warm caches asynchronously in the background so initial visits are instant
    asyncio.create_task(prewarm_caches())
    yield
    # Shutdown: clean up client connections
    logger.info("Shutting down external HTTP clients...")
    await anilist_client.close()
    await close_proxy_client()

app = FastAPI(
    title=f"{settings.APP_NAME} Anime API",
    description=settings.APP_DESCRIPTION,
    version="2.0.0",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Request logging middleware
@app.middleware("http")
async def log_requests_middleware(request: Request, call_next):
    start_time = time.time()
    response = await call_next(request)
    duration_ms = round((time.time() - start_time) * 1000, 2)
    client_ip = request.client.host if request.client else "127.0.0.1"
    logger.info(f"{client_ip} - {request.method} {request.url.path} -> {response.status_code} ({duration_ms}ms)")
    return response

# Global Exception Handler
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Unhandled exception at {request.url.path}: {exc}", exc_info=True)
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "error": "InternalServerError",
            "message": "An unexpected error occurred while processing your request.",
            "path": request.url.path,
        },
    )

# Health endpoint
@app.get("/health", tags=["Health"])
@app.get("/api/v1/health", tags=["Health"])
async def health_check():
    return {
        "status": "healthy",
        "app": settings.APP_NAME,
        "version": "2.0.0",
        "time": time.time(),
    }

# Register routers under /api/v1
app.include_router(anime_router, prefix="/api/v1")
app.include_router(search_router, prefix="/api/v1")
app.include_router(schedule_router, prefix="/api/v1")
app.include_router(people_router, prefix="/api/v1")
app.include_router(auth_router, prefix="/api/v1")
app.include_router(user_router, prefix="/api/v1")
app.include_router(src_endpoints_router, prefix="/api/v1")
app.include_router(src_endpoints_router, prefix="/api/v1/anime")
app.include_router(src_proxy_router, prefix="/api/v1")

# Also include directly at root prefix for any direct calls
app.include_router(anime_router)
app.include_router(search_router)
app.include_router(schedule_router)
app.include_router(people_router)
app.include_router(auth_router)
app.include_router(user_router)
app.include_router(src_endpoints_router, prefix="/anime")
app.include_router(src_endpoints_router)
app.include_router(src_proxy_router)
