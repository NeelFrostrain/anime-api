from fastapi import APIRouter, HTTPException, Query
from backend.app.graphql.queries import (
    CHARACTER_DETAIL_QUERY, STAFF_DETAIL_QUERY, STUDIO_DETAIL_QUERY
)
from backend.app.services.anilist import anilist_client
from backend.app.services.transformers import clean_html, transform_media_card

router = APIRouter(tags=["People & Studios"])

@router.get("/character/{id}", response_model=dict)
async def get_character(id: int):
    data = await anilist_client.execute_query(
        CHARACTER_DETAIL_QUERY, {"id": id}, category="detail"
    )
    char = data.get("Character")
    if not char:
        raise HTTPException(status_code=404, detail="Character not found")

    media_edges = (char.get("media") or {}).get("edges") or []
    appearances = []
    for edge in media_edges:
        node = edge.get("node") or {}
        appearances.append({
            "characterRole": edge.get("characterRole"),
            "media": transform_media_card(node),
        })

    return {
        "id": char.get("id"),
        "name": char.get("name") or {},
        "image": (char.get("image") or {}).get("large") or (char.get("image") or {}).get("medium"),
        "description": clean_html(char.get("description")),
        "gender": char.get("gender"),
        "dateOfBirth": char.get("dateOfBirth"),
        "age": char.get("age"),
        "bloodType": char.get("bloodType"),
        "favourites": char.get("favourites"),
        "appearances": appearances,
    }

@router.get("/staff/{id}", response_model=dict)
async def get_staff(id: int):
    data = await anilist_client.execute_query(
        STAFF_DETAIL_QUERY, {"id": id}, category="detail"
    )
    staff = data.get("Staff")
    if not staff:
        raise HTTPException(status_code=404, detail="Staff not found")

    char_media = (staff.get("characterMedia") or {}).get("edges") or []
    roles = []
    for edge in char_media:
        node = edge.get("node") or {}
        chars = edge.get("characters") or []
        roles.append({
            "media": transform_media_card(node),
            "characters": [
                {
                    "id": c.get("id"),
                    "name": (c.get("name") or {}).get("full"),
                    "image": (c.get("image") or {}).get("medium"),
                }
                for c in chars
            ],
        })

    return {
        "id": staff.get("id"),
        "name": staff.get("name") or {},
        "image": (staff.get("image") or {}).get("large") or (staff.get("image") or {}).get("medium"),
        "description": clean_html(staff.get("description")),
        "primaryOccupations": staff.get("primaryOccupations") or [],
        "gender": staff.get("gender"),
        "dateOfBirth": staff.get("dateOfBirth"),
        "age": staff.get("age"),
        "yearsActive": staff.get("yearsActive"),
        "homeTown": staff.get("homeTown"),
        "bloodType": staff.get("bloodType"),
        "favourites": staff.get("favourites"),
        "roles": roles,
    }

@router.get("/studio/{id}", response_model=dict)
async def get_studio(
    id: int,
    page: int = Query(1, ge=1),
    perPage: int = Query(24, ge=1, le=50),
):
    data = await anilist_client.execute_query(
        STUDIO_DETAIL_QUERY, {"id": id, "page": page, "perPage": perPage}, category="detail"
    )
    studio = data.get("Studio")
    if not studio:
        raise HTTPException(status_code=404, detail="Studio not found")

    media_data = studio.get("media") or {}
    nodes = media_data.get("nodes") or []
    results = [transform_media_card(m) for m in nodes]

    page_info = media_data.get("pageInfo") or {}
    return {
        "id": studio.get("id"),
        "name": studio.get("name"),
        "isAnimationStudio": studio.get("isAnimationStudio", False),
        "favourites": studio.get("favourites"),
        "pagination": {
            "page": page_info.get("currentPage", page),
            "perPage": page_info.get("perPage", perPage),
            "total": page_info.get("total", len(results)),
            "hasNextPage": page_info.get("hasNextPage", False),
        },
        "media": results,
    }
