from typing import List, Optional
from fastapi import APIRouter, Query
from backend.app.graphql.queries import SEARCH_QUERY, SUGGESTIONS_QUERY
from backend.app.services.anilist import anilist_client
from backend.app.services.transformers import (
    transform_media_card, transform_pagination, transform_suggestions
)
from backend.app.schemas.anime import PaginationResponse, SuggestionItem

router = APIRouter(prefix="/search", tags=["Search"])

@router.get("", response_model=PaginationResponse)
async def search_anime(
    q: str = Query(..., min_length=1, description="Anime search query string"),
    page: int = Query(1, ge=1),
    perPage: int = Query(24, ge=1, le=50),
):
    """Full anime search results with AniList metadata."""
    data = await anilist_client.execute_query(
        SEARCH_QUERY, {"search": q, "page": page, "perPage": perPage}, category="search"
    )
    page_data = data.get("Page", {})
    results = [transform_media_card(item) for item in page_data.get("media", [])]
    return transform_pagination(page_data, results)

@router.get("/suggestions", response_model=List[SuggestionItem])
async def search_suggestions(
    q: str = Query(..., min_length=1, description="Autocomplete query")
):
    """Lightweight 6-item autocomplete for command palette and header dropdown."""
    data = await anilist_client.execute_query(
        SUGGESTIONS_QUERY, {"search": q}, category="suggestions"
    )
    media_list = data.get("Page", {}).get("media", [])
    return transform_suggestions(media_list)
