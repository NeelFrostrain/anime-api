import asyncio
import logging
from typing import Any, Dict, Optional
import httpx
from fastapi import HTTPException
from backend.app.config import settings
from backend.app.services.cache import cache_manager

logger = logging.getLogger("kuromi.anilist")

class AniListClient:
    def __init__(self):
        self.endpoint = settings.ANILIST_GRAPHQL_URL
        self._client: Optional[httpx.AsyncClient] = None

    async def get_client(self) -> httpx.AsyncClient:
        loop = asyncio.get_running_loop()
        if (
            self._client is None
            or self._client.is_closed
            or getattr(self, "_loop", None) is not loop
        ):
            self._loop = loop
            self._client = httpx.AsyncClient(
                timeout=httpx.Timeout(connect=5.0, read=20.0, write=5.0, pool=30.0),
                headers={
                    "Content-Type": "application/json",
                    "Accept": "application/json",
                    "User-Agent": f"{settings.APP_NAME}-App/1.0",
                },
                follow_redirects=True,
            )
        return self._client

    async def close(self):
        if self._client and not self._client.is_closed:
            await self._client.aclose()

    async def execute_query(
        self,
        query: str,
        variables: Optional[Dict[str, Any]] = None,
        category: str = "general",
        use_cache: bool = True,
    ) -> Dict[str, Any]:
        """Execute a GraphQL query against AniList with caching and 429 retry backoff."""
        variables = variables or {}
        cache_key = cache_manager.make_key(category, q=query.strip(), vars=variables)

        if use_cache:
            cached_data = await cache_manager.get(category, cache_key)
            if cached_data is not None:
                return cached_data

        client = await self.get_client()
        payload = {"query": query, "variables": variables}

        max_retries = 3
        backoff_delay = 1.5

        for attempt in range(max_retries):
            try:
                response = await client.post(self.endpoint, json=payload)
                
                # Check for rate limit
                if response.status_code == 429:
                    retry_after = int(response.headers.get("Retry-After", backoff_delay))
                    logger.warning(
                        f"AniList rate limited (429). Retrying in {retry_after}s (attempt {attempt + 1}/{max_retries})"
                    )
                    await asyncio.sleep(retry_after)
                    backoff_delay *= 2
                    continue

                if response.status_code >= 500:
                    logger.warning(
                        f"AniList 5xx server error ({response.status_code}). Retrying (attempt {attempt + 1}/{max_retries})"
                    )
                    await asyncio.sleep(backoff_delay)
                    backoff_delay *= 2
                    continue

                res_json = response.json()
                if "errors" in res_json and res_json["errors"]:
                    logger.error(f"GraphQL Errors from AniList: {res_json['errors']}")
                    # If media not found
                    first_err = res_json["errors"][0]
                    if first_err.get("status") == 404 or "Not Found" in first_err.get("message", ""):
                        raise HTTPException(status_code=404, detail="Anime not found")
                    raise HTTPException(status_code=400, detail=first_err.get("message", "AniList GraphQL error"))

                data = res_json.get("data", {})
                if use_cache and data:
                    await cache_manager.set(category, cache_key, data)
                return data

            except httpx.RequestError as exc:
                logger.error(f"Network error communicating with AniList: {exc}")
                if attempt < max_retries - 1:
                    await asyncio.sleep(backoff_delay)
                    backoff_delay *= 2
                else:
                    raise HTTPException(status_code=503, detail="Unable to contact upstream anime service")

        raise HTTPException(status_code=429, detail="AniList rate limit exceeded. Please try again later.")

    async def fetch_jikan_reviews(self, mal_id: int) -> list:
        """Fetch user reviews from Jikan API as fallback/enrichment."""
        if not mal_id:
            return []
        
        cache_key = cache_manager.make_key("jikan_reviews", mal_id=mal_id)
        cached = await cache_manager.get("detail", cache_key)
        if cached is not None:
            return cached

        client = await self.get_client()
        formatted = []
        try:
            url = f"{settings.JIKAN_API_URL}/anime/{mal_id}/reviews"
            resp = await client.get(url, timeout=0.8)
            if resp.status_code == 200:
                data = resp.json().get("data", [])
                for item in data[:10]:
                    user = item.get("user") or {}
                    formatted.append({
                        "id": item.get("mal_id"),
                        "username": user.get("username", "Anonymous"),
                        "avatar": (user.get("images", {}).get("jpg", {}) or {}).get("image_url"),
                        "score": item.get("score"),
                        "date": item.get("date"),
                        "review": item.get("review", "")[:1200],
                        "tags": item.get("tags") or [],
                        "reactions": item.get("reactions") or {},
                    })
        except Exception as exc:
            logger.debug(f"Jikan reviews skipped for mal_id={mal_id}: {exc}")
        
        # Always cache result (even if empty) so repeat visits respond in 0.001s
        await cache_manager.set("detail", cache_key, formatted)
        return formatted

anilist_client = AniListClient()
