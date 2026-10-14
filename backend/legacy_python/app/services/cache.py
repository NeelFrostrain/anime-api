import time
import json
import hashlib
from typing import Any, Optional
from cachetools import TTLCache
from backend.app.config import settings

class CacheManager:
    def __init__(self):
        # Specific TTL caches for each entity
        self.spotlight_cache = TTLCache(maxsize=10, ttl=settings.CACHE_TTL_SPOTLIGHT)
        self.trending_cache = TTLCache(maxsize=100, ttl=settings.CACHE_TTL_TRENDING)
        self.popular_cache = TTLCache(maxsize=100, ttl=settings.CACHE_TTL_POPULAR)
        self.search_cache = TTLCache(maxsize=500, ttl=settings.CACHE_TTL_SEARCH)
        self.suggestions_cache = TTLCache(maxsize=500, ttl=settings.CACHE_TTL_SUGGESTIONS)
        self.schedule_cache = TTLCache(maxsize=100, ttl=settings.CACHE_TTL_SCHEDULE)
        self.detail_cache = TTLCache(maxsize=1000, ttl=settings.CACHE_TTL_DETAIL)
        self.static_cache = TTLCache(maxsize=50, ttl=settings.CACHE_TTL_STATIC)
        self.general_cache = TTLCache(maxsize=500, ttl=600)

    def _get_target_cache(self, category: str) -> TTLCache:
        mapping = {
            "spotlight": self.spotlight_cache,
            "trending": self.trending_cache,
            "popular": self.popular_cache,
            "search": self.search_cache,
            "suggestions": self.suggestions_cache,
            "schedule": self.schedule_cache,
            "detail": self.detail_cache,
            "static": self.static_cache,
        }
        return mapping.get(category, self.general_cache)

    def make_key(self, prefix: str, **kwargs) -> str:
        serialized = json.dumps(kwargs, sort_keys=True, default=str)
        hash_digest = hashlib.md5(serialized.encode()).hexdigest()
        return f"{prefix}:{hash_digest}"

    async def get(self, category: str, key: str) -> Optional[Any]:
        cache = self._get_target_cache(category)
        return cache.get(key)

    async def set(self, category: str, key: str, value: Any) -> None:
        cache = self._get_target_cache(category)
        cache[key] = value

    def clear(self):
        for cache in [
            self.spotlight_cache,
            self.trending_cache,
            self.popular_cache,
            self.search_cache,
            self.suggestions_cache,
            self.schedule_cache,
            self.detail_cache,
            self.static_cache,
            self.general_cache,
        ]:
            cache.clear()

cache_manager = CacheManager()
