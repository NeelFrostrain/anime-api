import os
from pathlib import Path

_BASE_DIR = Path(__file__).resolve().parent.parent

class Settings:
    # App Branding (Single source of truth for branding!)
    APP_NAME: str = os.getenv("APP_NAME", "KUROMI")
    APP_DESCRIPTION: str = os.getenv("APP_DESCRIPTION", "Discover, track, and explore anime in style.")
    
    # Environment & Server
    ENV: str = os.getenv("ENV", "development")
    PORT: int = int(os.getenv("PORT", "8000"))
    HOST: str = os.getenv("HOST", "0.0.0.0")
    
    # Security & Auth
    SECRET_KEY: str = os.getenv("SECRET_KEY", "kuromi-super-secret-jwt-token-key-2026-change-in-prod")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 days
    COOKIE_NAME: str = "kuromi_token"
    
    # Database (SQLite in backend directory by default, easily swappable for PostgreSQL via DATABASE_URL)
    DATABASE_URL: str = os.getenv("DATABASE_URL", f"sqlite:///{_BASE_DIR / 'kuromi.db'}")
    
    # CORS
    FRONTEND_URL: str = os.getenv("FRONTEND_URL", "http://localhost:3000")
    ALLOWED_ORIGINS: list[str] = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:3001",
        "http://127.0.0.1:3001",
    ]
    
    # External Data Sources
    ANILIST_GRAPHQL_URL: str = "https://graphql.anilist.co"
    JIKAN_API_URL: str = "https://api.jikan.moe/v4"
    
    # Cache TTLs (in seconds)
    CACHE_TTL_SPOTLIGHT: int = 600       # 10 minutes
    CACHE_TTL_TRENDING: int = 600        # 10 minutes
    CACHE_TTL_POPULAR: int = 600         # 10 minutes
    CACHE_TTL_SEARCH: int = 300          # 5 minutes
    CACHE_TTL_SUGGESTIONS: int = 300     # 5 minutes
    CACHE_TTL_SCHEDULE: int = 300        # 5 minutes
    CACHE_TTL_DETAIL: int = 3600         # 1 hour
    CACHE_TTL_STATIC: int = 86400        # 24 hours (genres, tags)

settings = Settings()
