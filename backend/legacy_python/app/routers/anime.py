import random
import re
from typing import Optional, List
from fastapi import APIRouter, Query, HTTPException, Depends
from backend.app.graphql.queries import (
    SPOTLIGHT_QUERY, TRENDING_QUERY, POPULAR_QUERY, TOP_RATED_QUERY,
    UPCOMING_QUERY, TOP_AIRING_QUERY, JUST_FINISHED_QUERY, TOP_MOVIES_QUERY,
    SEASONAL_QUERY, FILTER_QUERY, GENRES_AND_TAGS_QUERY, DETAIL_QUERY,
    CHARACTERS_QUERY, STAFF_QUERY, RELATIONS_QUERY, RECOMMENDATIONS_QUERY
)
from backend.app.services.anilist import anilist_client
from backend.app.services.transformers import (
    transform_media_card, transform_media_detail, transform_pagination,
    transform_characters, transform_staff, transform_relations, transform_recommendations
)
from backend.app.schemas.anime import (
    AnimeCard, AnimeDetail, PaginationResponse
)

router = APIRouter(prefix="/anime", tags=["Anime Discovery & Detail"])

@router.get("/spotlight", response_model=List[dict])
async def get_spotlight():
    """Get top 10 trending spotlight anime for the hero carousel."""
    data = await anilist_client.execute_query(SPOTLIGHT_QUERY, category="spotlight")
    media_list = data.get("Page", {}).get("media", [])
    results = [transform_media_card(item) for item in media_list]
    return results

@router.get("/trending", response_model=PaginationResponse)
async def get_trending(
    page: int = Query(1, ge=1),
    perPage: int = Query(20, ge=1, le=50)
):
    data = await anilist_client.execute_query(
        TRENDING_QUERY, {"page": page, "perPage": perPage}, category="trending"
    )
    page_data = data.get("Page", {})
    results = [transform_media_card(item) for item in page_data.get("media", [])]
    return transform_pagination(page_data, results)

@router.get("/popular", response_model=PaginationResponse)
async def get_popular(
    page: int = Query(1, ge=1),
    perPage: int = Query(20, ge=1, le=50)
):
    data = await anilist_client.execute_query(
        POPULAR_QUERY, {"page": page, "perPage": perPage}, category="popular"
    )
    page_data = data.get("Page", {})
    results = [transform_media_card(item) for item in page_data.get("media", [])]
    return transform_pagination(page_data, results)

@router.get("/top-rated", response_model=PaginationResponse)
async def get_top_rated(
    page: int = Query(1, ge=1),
    perPage: int = Query(20, ge=1, le=50)
):
    data = await anilist_client.execute_query(
        TOP_RATED_QUERY, {"page": page, "perPage": perPage}, category="general"
    )
    page_data = data.get("Page", {})
    results = [transform_media_card(item) for item in page_data.get("media", [])]
    return transform_pagination(page_data, results)

@router.get("/upcoming", response_model=PaginationResponse)
async def get_upcoming(
    page: int = Query(1, ge=1),
    perPage: int = Query(20, ge=1, le=50)
):
    data = await anilist_client.execute_query(
        UPCOMING_QUERY, {"page": page, "perPage": perPage}, category="general"
    )
    page_data = data.get("Page", {})
    results = [transform_media_card(item) for item in page_data.get("media", [])]
    return transform_pagination(page_data, results)

@router.get("/top-airing", response_model=PaginationResponse)
async def get_top_airing(
    page: int = Query(1, ge=1),
    perPage: int = Query(20, ge=1, le=50)
):
    data = await anilist_client.execute_query(
        TOP_AIRING_QUERY, {"page": page, "perPage": perPage}, category="general"
    )
    page_data = data.get("Page", {})
    results = [transform_media_card(item) for item in page_data.get("media", [])]
    return transform_pagination(page_data, results)

@router.get("/just-finished", response_model=PaginationResponse)
async def get_just_finished(
    page: int = Query(1, ge=1),
    perPage: int = Query(20, ge=1, le=50)
):
    data = await anilist_client.execute_query(
        JUST_FINISHED_QUERY, {"page": page, "perPage": perPage}, category="general"
    )
    page_data = data.get("Page", {})
    results = [transform_media_card(item) for item in page_data.get("media", [])]
    return transform_pagination(page_data, results)

@router.get("/top-movies", response_model=PaginationResponse)
async def get_top_movies(
    page: int = Query(1, ge=1),
    perPage: int = Query(20, ge=1, le=50)
):
    data = await anilist_client.execute_query(
        TOP_MOVIES_QUERY, {"page": page, "perPage": perPage}, category="general"
    )
    page_data = data.get("Page", {})
    results = [transform_media_card(item) for item in page_data.get("media", [])]
    return transform_pagination(page_data, results)

@router.get("/seasonal", response_model=PaginationResponse)
async def get_seasonal(
    year: Optional[int] = Query(None),
    season: Optional[str] = Query(None),  # WINTER, SPRING, SUMMER, FALL
    page: int = Query(1, ge=1),
    perPage: int = Query(24, ge=1, le=50)
):
    vars_dict = {
        "page": page,
        "perPage": perPage,
        "seasonYear": year,
        "season": season.upper() if season else None,
    }
    data = await anilist_client.execute_query(SEASONAL_QUERY, vars_dict, category="general")
    page_data = data.get("Page", {})
    results = [transform_media_card(item) for item in page_data.get("media", [])]
    return transform_pagination(page_data, results)

@router.get("/filter", response_model=PaginationResponse)
async def filter_anime(
    genre: Optional[str] = Query(None, description="Comma-separated or single genre"),
    tag: Optional[str] = Query(None, description="Comma-separated or single tag"),
    year: Optional[int] = Query(None),
    season: Optional[str] = Query(None),
    format: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    country: Optional[str] = Query(None),
    sort: Optional[str] = Query("POPULARITY_DESC"),
    page: int = Query(1, ge=1),
    perPage: int = Query(24, ge=1, le=50),
):
    genres_list = [g.strip() for g in genre.split(",") if g.strip()] if genre else None
    tags_list = [t.strip() for t in tag.split(",") if t.strip()] if tag else None
    
    # Sort map
    sort_values = [s.strip().upper() for s in sort.split(",") if s.strip()] if sort else ["POPULARITY_DESC"]

    vars_dict = {
        "page": page,
        "perPage": perPage,
        "genres": genres_list,
        "tags": tags_list,
        "seasonYear": year,
        "season": season.upper() if season else None,
        "format": format.upper() if format else None,
        "status": status.upper() if status else None,
        "countryOfOrigin": country.upper() if country else None,
        "sort": sort_values,
    }
    data = await anilist_client.execute_query(FILTER_QUERY, vars_dict, category="general")
    page_data = data.get("Page", {})
    results = [transform_media_card(item) for item in page_data.get("media", [])]
    return transform_pagination(page_data, results)

@router.get("/genres", response_model=List[str])
async def get_genres():
    data = await anilist_client.execute_query(GENRES_AND_TAGS_QUERY, category="static")
    genres = data.get("GenreCollection") or []
    return [g for g in genres if g]

@router.get("/tags", response_model=List[dict])
async def get_tags():
    data = await anilist_client.execute_query(GENRES_AND_TAGS_QUERY, category="static")
    tags = data.get("MediaTagCollection") or []
    return [
        {
            "id": t.get("id"),
            "name": t.get("name"),
            "description": t.get("description"),
            "category": t.get("category"),
        }
        for t in tags if not t.get("isAdult")
    ]

@router.get("/random", response_model=dict)
async def get_random_anime():
    """Returns one random good-score anime ID from top popular/rated anime."""
    # Pick a random page from 1 to 5
    page = random.randint(1, 5)
    data = await anilist_client.execute_query(
        TOP_RATED_QUERY, {"page": page, "perPage": 20}, category="general"
    )
    items = data.get("Page", {}).get("media", [])
    if not items:
        # Fallback to standard id
        return {"id": 16498, "title": "Attack on Titan"}
    selected = random.choice(items)
    return {
        "id": selected.get("id"),
        "title": selected.get("title", {}).get("english") or selected.get("title", {}).get("romaji"),
    }

@router.get("/{id}", response_model=AnimeDetail)
async def get_anime_detail(id: int):
    data = await anilist_client.execute_query(DETAIL_QUERY, {"id": id}, category="detail")
    media = data.get("Media")
    if not media:
        raise HTTPException(status_code=404, detail="Anime not found")
    return transform_media_detail(media)

@router.get("/{id}/characters", response_model=PaginationResponse)
async def get_anime_characters(
    id: int,
    page: int = Query(1, ge=1),
    perPage: int = Query(25, ge=1, le=50)
):
    data = await anilist_client.execute_query(
        CHARACTERS_QUERY, {"id": id, "page": page, "perPage": perPage}, category="detail"
    )
    media = data.get("Media")
    if not media or not media.get("characters"):
        return {"page": 1, "perPage": perPage, "total": 0, "hasNextPage": False, "results": []}
    return transform_characters(media["characters"])

@router.get("/{id}/staff", response_model=PaginationResponse)
async def get_anime_staff(
    id: int,
    page: int = Query(1, ge=1),
    perPage: int = Query(25, ge=1, le=50)
):
    data = await anilist_client.execute_query(
        STAFF_QUERY, {"id": id, "page": page, "perPage": perPage}, category="detail"
    )
    media = data.get("Media")
    if not media or not media.get("staff"):
        return {"page": 1, "perPage": perPage, "total": 0, "hasNextPage": False, "results": []}
    return transform_staff(media["staff"])

@router.get("/{id}/relations", response_model=List[dict])
async def get_anime_relations(id: int):
    data = await anilist_client.execute_query(
        RELATIONS_QUERY, {"id": id}, category="detail"
    )
    media = data.get("Media")
    if not media or not media.get("relations"):
        return []
    return transform_relations(media["relations"])

@router.get("/{id}/recommendations", response_model=PaginationResponse)
async def get_anime_recommendations(
    id: int,
    page: int = Query(1, ge=1),
    perPage: int = Query(12, ge=1, le=24)
):
    data = await anilist_client.execute_query(
        RECOMMENDATIONS_QUERY, {"id": id, "page": page, "perPage": perPage}, category="detail"
    )
    media = data.get("Media")
    if not media or not media.get("recommendations"):
        return {"page": 1, "perPage": perPage, "total": 0, "hasNextPage": False, "results": []}
    return transform_recommendations(media["recommendations"])

@router.get("/{id}/episodes", response_model=List[dict])
async def get_anime_episodes(id: int):
    """Returns episode list constructed from streamingEpisodes + airingSchedule."""
    data = await anilist_client.execute_query(DETAIL_QUERY, {"id": id}, category="detail")
    media = data.get("Media")
    if not media:
        raise HTTPException(status_code=404, detail="Anime not found")

    streaming = media.get("streamingEpisodes") or []
    airing = (media.get("airingSchedule") or {}).get("nodes") or []
    next_airing = media.get("nextAiringEpisode") or {}
    next_ep_num = next_airing.get("episode")
    total_episodes = media.get("episodes") or len(streaming) or len(airing) or 12

    # Map airing times by episode
    airing_map = {item.get("episode"): item for item in airing}

    episodes = []
    # If streaming episodes exist from AniList
    if streaming:
        for idx, item in enumerate(streaming, 1):
            title = item.get("title") or f"Episode {idx}"
            m = re.search(r"(?:Episode|EP)\s+(\d+)", title, re.IGNORECASE)
            ep_num = int(m.group(1)) if m else idx
            air_info = airing_map.get(ep_num) or airing_map.get(idx) or {}
            is_aired = ep_num < next_ep_num if next_ep_num else (air_info.get("timeUntilAiring", 0) <= 0 if air_info else True)
            episodes.append({
                "number": ep_num,
                "title": title,
                "thumbnail": item.get("thumbnail"),
                "url": item.get("url"),
                "site": item.get("site"),
                "airingAt": air_info.get("airingAt"),
                "isAired": is_aired,
            })
        episodes.sort(key=lambda x: x["number"])
    else:
        # Construct placeholders based on total episodes
        display_count = min(total_episodes, 500)
        for ep_num in range(1, display_count + 1):
            air_info = airing_map.get(ep_num)
            if next_ep_num:
                is_aired = ep_num < next_ep_num
            elif air_info:
                is_aired = air_info.get("timeUntilAiring", 0) <= 0
            else:
                is_aired = ep_num <= (media.get("episodes") or 1)
            episodes.append({
                "number": ep_num,
                "title": f"Episode {ep_num}",
                "thumbnail": media.get("coverImage", {}).get("large"),
                "url": None,
                "site": None,
                "airingAt": air_info.get("airingAt") if air_info else None,
                "isAired": is_aired,
            })

    return episodes

@router.get("/{id}/reviews", response_model=List[dict])
async def get_anime_reviews(id: int):
    """Returns reviews from Jikan API using MAL id, or empty list."""
    data = await anilist_client.execute_query(DETAIL_QUERY, {"id": id}, category="detail")
    media = data.get("Media")
    if not media:
        raise HTTPException(status_code=404, detail="Anime not found")
    
    mal_id = media.get("idMal")
    if not mal_id:
        return []
    
    reviews = await anilist_client.fetch_jikan_reviews(mal_id)
    return reviews
