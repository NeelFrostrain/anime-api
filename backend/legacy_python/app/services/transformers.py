import re
from typing import Any, Dict, List, Optional

def clean_html(raw_html: Optional[str]) -> str:
    """Strip HTML tags and unescape common entities for clean plain text."""
    if not raw_html:
        return ""
    clean = re.sub(r"<br\s*/?>", "\n", raw_html)
    clean = re.sub(r"<[^>]+>", "", clean)
    clean = clean.replace("&quot;", '"').replace("&amp;", "&").replace("&#039;", "'").replace("&lt;", "<").replace("&gt;", ">")
    return clean.strip()

LEGAL_STREAMING_SITES = {
    "crunchyroll", "netflix", "hidive", "hulu", "disney plus", "disney+",
    "amazon prime video", "prime video", "funimation", "tubi tv", "iqiyi",
    "bilibili", "ani-one asia", "muse asia", "youtube", "viki"
}

def is_legal_streaming(site_name: str, link_type: str = "") -> bool:
    if not site_name:
        return False
    lower_site = site_name.lower().strip()
    lower_type = (link_type or "").lower().strip()
    return lower_type == "streaming" or any(legal in lower_site for legal in LEGAL_STREAMING_SITES)

def transform_media_card(raw: Dict[str, Any]) -> Dict[str, Any]:
    """Transform basic/list media object into normalized camelCase JSON."""
    if not raw:
        return {}

    title = raw.get("title") or {}
    cover = raw.get("coverImage") or {}
    accent_color = cover.get("color") or "#8b7cf6"
    
    start_date = raw.get("startDate") or {}
    next_airing = raw.get("nextAiringEpisode")
    trailer = raw.get("trailer")

    return {
        "id": raw.get("id"),
        "idMal": raw.get("idMal"),
        "title": {
            "romaji": title.get("romaji") or "",
            "english": title.get("english") or title.get("romaji") or "",
            "native": title.get("native") or "",
            "userPreferred": title.get("userPreferred") or title.get("english") or title.get("romaji") or "",
        },
        "coverImage": {
            "extraLarge": cover.get("extraLarge") or cover.get("large") or cover.get("medium") or "",
            "large": cover.get("large") or cover.get("medium") or "",
            "medium": cover.get("medium") or "",
            "color": accent_color,
        },
        "accentColor": accent_color,
        "bannerImage": raw.get("bannerImage"),
        "format": raw.get("format"),
        "status": raw.get("status"),
        "description": clean_html(raw.get("description")),
        "episodes": raw.get("episodes"),
        "duration": raw.get("duration"),
        "season": raw.get("season"),
        "seasonYear": raw.get("seasonYear") or start_date.get("year"),
        "startDate": {
            "year": start_date.get("year"),
            "month": start_date.get("month"),
            "day": start_date.get("day"),
        },
        "averageScore": raw.get("averageScore"),
        "meanScore": raw.get("meanScore"),
        "popularity": raw.get("popularity"),
        "favourites": raw.get("favourites"),
        "genres": raw.get("genres") or [],
        "countryOfOrigin": raw.get("countryOfOrigin"),
        "isAdult": raw.get("isAdult", False),
        "nextAiringEpisode": {
            "airingAt": next_airing.get("airingAt"),
            "timeUntilAiring": next_airing.get("timeUntilAiring"),
            "episode": next_airing.get("episode"),
        } if next_airing else None,
        "trailer": {
            "id": trailer.get("id"),
            "site": trailer.get("site"),
            "thumbnail": trailer.get("thumbnail"),
        } if trailer else None,
    }

def transform_media_detail(raw: Dict[str, Any]) -> Dict[str, Any]:
    """Transform full media detail into normalized camelCase JSON."""
    base = transform_media_card(raw)
    
    # End date
    end_date = raw.get("endDate") or {}
    base["endDate"] = {
        "year": end_date.get("year"),
        "month": end_date.get("month"),
        "day": end_date.get("day"),
    }
    
    base["synonyms"] = raw.get("synonyms") or []
    base["source"] = raw.get("source")

    # Studios
    studios_data = raw.get("studios") or {}
    studios_edges = studios_data.get("edges") or []
    studios_list = []
    for edge in studios_edges:
        node = edge.get("node") or {}
        studios_list.append({
            "id": node.get("id"),
            "name": node.get("name"),
            "isMain": edge.get("isMain", False),
            "isAnimationStudio": node.get("isAnimationStudio", False),
        })
    base["studios"] = studios_list

    # Tags
    tags_list = []
    for tag in raw.get("tags") or []:
        tags_list.append({
            "id": tag.get("id"),
            "name": tag.get("name"),
            "description": tag.get("description"),
            "rank": tag.get("rank"),
            "isMediaSpoiler": tag.get("isMediaSpoiler", False),
        })
    base["tags"] = tags_list

    # External and Streaming Links (Strictly legal only)
    ext_links = raw.get("externalLinks") or []
    all_links = []
    streaming_links = []
    for link in ext_links:
        item = {
            "id": link.get("id"),
            "url": link.get("url"),
            "site": link.get("site"),
            "type": link.get("type"),
            "icon": link.get("icon"),
            "color": link.get("color") or "#8b7cf6",
            "language": link.get("language"),
        }
        all_links.append(item)
        if is_legal_streaming(link.get("site") or "", link.get("type") or ""):
            streaming_links.append(item)
            
    base["externalLinks"] = all_links
    base["streamingLinks"] = streaming_links

    # Airing Schedule History / Next
    airing_schedule = raw.get("airingSchedule") or {}
    schedule_nodes = airing_schedule.get("nodes") or []
    base["airingScheduleHistory"] = [
        {
            "id": node.get("id"),
            "airingAt": node.get("airingAt"),
            "episode": node.get("episode"),
            "timeUntilAiring": node.get("timeUntilAiring"),
        }
        for node in schedule_nodes
    ]

    # Streaming episodes list from AniList
    streaming_episodes = raw.get("streamingEpisodes") or []
    base["streamingEpisodes"] = [
        {
            "title": ep.get("title"),
            "thumbnail": ep.get("thumbnail"),
            "url": ep.get("url"),
            "site": ep.get("site"),
        }
        for ep in streaming_episodes
    ]

    return base

def transform_pagination(page_data: Dict[str, Any], results: List[Any]) -> Dict[str, Any]:
    page_info = page_data.get("pageInfo") or {}
    return {
        "page": page_info.get("currentPage", 1),
        "perPage": page_info.get("perPage", len(results)),
        "total": page_info.get("total", len(results)),
        "hasNextPage": page_info.get("hasNextPage", False),
        "results": results,
    }

def transform_suggestions(raw_media: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    suggestions = []
    for item in raw_media:
        title = item.get("title") or {}
        cover = item.get("coverImage") or {}
        start_date = item.get("startDate") or {}
        suggestions.append({
            "id": item.get("id"),
            "title": title.get("english") or title.get("romaji") or "",
            "titleRomaji": title.get("romaji") or "",
            "poster": cover.get("large") or cover.get("medium") or "",
            "color": cover.get("color") or "#8b7cf6",
            "format": item.get("format"),
            "status": item.get("status"),
            "year": start_date.get("year"),
            "episodes": item.get("episodes"),
            "score": item.get("averageScore"),
        })
    return suggestions

def transform_characters(raw_chars: Dict[str, Any]) -> Dict[str, Any]:
    edges = raw_chars.get("edges") or []
    characters = []
    for edge in edges:
        role = edge.get("role")
        node = edge.get("node") or {}
        node_name = node.get("name") or {}
        node_image = node.get("image") or {}
        
        vas = []
        for va in edge.get("voiceActors") or []:
            va_name = va.get("name") or {}
            va_image = va.get("image") or {}
            vas.append({
                "id": va.get("id"),
                "name": va_name.get("full") or "",
                "native": va_name.get("native") or "",
                "language": va.get("languageV2") or "Japanese",
                "image": va_image.get("large") or va_image.get("medium") or "",
            })
            
        characters.append({
            "id": node.get("id"),
            "role": role,
            "name": {
                "full": node_name.get("full") or "",
                "native": node_name.get("native") or "",
            },
            "image": node_image.get("large") or node_image.get("medium") or "",
            "voiceActors": vas,
        })
        
    page_info = raw_chars.get("pageInfo") or {}
    return {
        "page": page_info.get("currentPage", 1),
        "perPage": page_info.get("perPage", len(characters)),
        "total": page_info.get("total", len(characters)),
        "hasNextPage": page_info.get("hasNextPage", False),
        "results": characters,
    }

def transform_staff(raw_staff: Dict[str, Any]) -> Dict[str, Any]:
    edges = raw_staff.get("edges") or []
    staff_members = []
    for edge in edges:
        role = edge.get("role")
        node = edge.get("node") or {}
        node_name = node.get("name") or {}
        node_image = node.get("image") or {}
        staff_members.append({
            "id": node.get("id"),
            "role": role,
            "name": {
                "full": node_name.get("full") or "",
                "native": node_name.get("native") or "",
            },
            "image": node_image.get("large") or node_image.get("medium") or "",
            "occupations": node.get("primaryOccupations") or [],
        })
        
    page_info = raw_staff.get("pageInfo") or {}
    return {
        "page": page_info.get("currentPage", 1),
        "perPage": page_info.get("perPage", len(staff_members)),
        "total": page_info.get("total", len(staff_members)),
        "hasNextPage": page_info.get("hasNextPage", False),
        "results": staff_members,
    }

def transform_relations(raw_relations: Dict[str, Any]) -> List[Dict[str, Any]]:
    edges = raw_relations.get("edges") or []
    relations = []
    for edge in edges:
        node = edge.get("node") or {}
        title = node.get("title") or {}
        cover = node.get("coverImage") or {}
        start_date = node.get("startDate") or {}
        relations.append({
            "relationType": edge.get("relationType"),
            "id": node.get("id"),
            "title": {
                "romaji": title.get("romaji") or "",
                "english": title.get("english") or title.get("romaji") or "",
                "native": title.get("native") or "",
            },
            "format": node.get("format"),
            "status": node.get("status"),
            "coverImage": {
                "large": cover.get("large") or "",
                "color": cover.get("color") or "#8b7cf6",
            },
            "averageScore": node.get("averageScore"),
            "year": start_date.get("year"),
        })
    return relations

def transform_recommendations(raw_recs: Dict[str, Any]) -> Dict[str, Any]:
    nodes = raw_recs.get("nodes") or []
    recs = []
    for node in nodes:
        rec_media = node.get("mediaRecommendation")
        if not rec_media:
            continue
        title = rec_media.get("title") or {}
        cover = rec_media.get("coverImage") or {}
        start_date = rec_media.get("startDate") or {}
        recs.append({
            "id": rec_media.get("id"),
            "rating": node.get("rating"),
            "userRating": node.get("userRating"),
            "title": {
                "romaji": title.get("romaji") or "",
                "english": title.get("english") or title.get("romaji") or "",
                "native": title.get("native") or "",
            },
            "coverImage": {
                "large": cover.get("large") or "",
                "color": cover.get("color") or "#8b7cf6",
            },
            "format": rec_media.get("format"),
            "status": rec_media.get("status"),
            "episodes": rec_media.get("episodes"),
            "averageScore": rec_media.get("averageScore"),
            "year": start_date.get("year"),
        })
    page_info = raw_recs.get("pageInfo") or {}
    return {
        "page": page_info.get("currentPage", 1),
        "perPage": page_info.get("perPage", len(recs)),
        "total": page_info.get("total", len(recs)),
        "hasNextPage": page_info.get("hasNextPage", False),
        "results": recs,
    }

def transform_schedule_item(raw: Dict[str, Any]) -> Dict[str, Any]:
    media_raw = raw.get("media") or {}
    media = transform_media_card(media_raw)
    
    # Also extract streaming links from media
    ext_links = media_raw.get("externalLinks") or []
    streaming = [
        {"site": l.get("site"), "url": l.get("url")}
        for l in ext_links if is_legal_streaming(l.get("site") or "", l.get("type") or "")
    ]
    media["streamingPlatforms"] = streaming

    return {
        "id": raw.get("id"),
        "airingAt": raw.get("airingAt"),
        "episode": raw.get("episode"),
        "timeUntilAiring": raw.get("timeUntilAiring"),
        "media": media,
    }
