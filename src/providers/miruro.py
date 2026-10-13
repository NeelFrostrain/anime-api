import asyncio
import base64
import gzip
import json
import os
import re
from urllib.parse import urlparse

import httpx

from src.config import BASE_HEADERS, MIRURO_BASE_URLS, iter_miruro_pipe_targets
from src.logger import log_debug, log_info, log_warn
from src.parser import decode_pipe_response, encode_pipe_request
from src.providers import _cache
from src.providers._http import UA
from src.providers._match import episode_meta, expected_count
from src.providers._media import build_ctx

NAME = "miruro"

MIRURO_DOMAINS = [
    "https://www.miruro.bz",
    "https://www.miruro.tv",
    "https://www.miruro.ru",
]

PROXY_HOSTS = [
    "https://s1.keeply.top/",
    "https://s2.keeply.top/",
]

CATALOG_KEY = b"miruro/catalog"
OBF_KEY_HEX = "a54d389c18527d9fd3e7f0643e27edbe"
OBF_BYTES = bytes.fromhex(OBF_KEY_HEX)

# Configurable environment overrides
MIRURO_COOKIE = os.getenv("MIRURO_COOKIE", "")
FLARESOLVERR_URL = os.getenv("FLARESOLVERR_URL", "")
MIRURO_PROXY = os.getenv("MIRURO_PROXY", "")


def decode_catalog_payload(data: bytes) -> dict:
    """XOR decrypt with key 'miruro/catalog' and decompress via gzip."""
    raw = bytes([b ^ CATALOG_KEY[i % len(CATALOG_KEY)] for i, b in enumerate(data)])
    decompressed = gzip.decompress(raw)
    return json.loads(decompressed.decode("utf-8"))


def obf_encode(url: str) -> str:
    """Miruro URL obfuscation algorithm for s1/s2.keeply.top proxy."""
    raw = url.encode("utf-8")
    xored = bytes([b ^ OBF_BYTES[i % len(OBF_BYTES)] for i, b in enumerate(raw)])
    return base64.urlsafe_b64encode(xored).decode("ascii").rstrip("=")


def build_keeply_hls(stream_url: str, referer: str = "", proxy_base: str = "https://s1.keeply.top/") -> str:
    """Builds a keeply proxy HLS URL for protected stream segments."""
    enc_url = obf_encode(stream_url)
    enc_ref = obf_encode(referer) if referer else ""
    ref_part = f"~{enc_ref}" if enc_ref else ""
    return f"{proxy_base.rstrip('/')}/{enc_url}{ref_part}/pl.m3u8"


def _get_headers(base: str = "https://www.miruro.bz") -> dict:
    headers = {
        **BASE_HEADERS,
        "Accept": "*/*",
        "Referer": f"{base}/",
        "Origin": base,
        "User-Agent": UA,
    }
    if MIRURO_COOKIE:
        headers["Cookie"] = MIRURO_COOKIE
    return headers


async def _fetch_flaresolverr(url: str) -> dict | None:
    """Optional FlareSolverr integration for Cloudflare challenge bypass."""
    if not FLARESOLVERR_URL:
        return None
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            res = await client.post(
                FLARESOLVERR_URL,
                json={"cmd": "request.get", "url": url, "maxTimeout": 25000},
            )
            if res.status_code == 200:
                data = res.json()
                if data.get("status") == "ok":
                    return data.get("solution")
    except Exception as e:
        log_warn(f"FlareSolverr request failed: {e}", tag="MIRURO")
    return None


async def get_episodes(anilist_id: int, ctx: dict | None = None) -> dict:
    """Fetch episode list for an anime via Miruro catalog / pipe, mapped to AniList."""
    ctx = ctx or await build_ctx(anilist_id)
    cache_key = f"miruro:eps:{anilist_id}"
    cached = _cache.get(cache_key)
    if cached:
        return cached

    media = ctx.get("media") if isinstance(ctx, dict) else None
    expected = expected_count(media, ctx.get("anizip") if isinstance(ctx, dict) else None)
    title = (ctx.get("titles") or [""])[0] or f"AniList {anilist_id}"

    # 1. Attempt Miruro legacy pipe endpoint
    pipe_payload = {
        "path": "episodes",
        "method": "GET",
        "query": {"anilistId": anilist_id},
        "body": None,
        "version": "0.1.0",
    }
    encoded_pipe = encode_pipe_request(pipe_payload)

    raw_episodes = None
    async with httpx.AsyncClient(timeout=15.0, proxy=MIRURO_PROXY or None) as client:
        for pipe_target, pipe_headers in iter_miruro_pipe_targets(encoded_pipe):
            if MIRURO_COOKIE:
                pipe_headers["Cookie"] = MIRURO_COOKIE
            try:
                res = await client.get(pipe_target, headers=pipe_headers)
                if res.status_code == 200:
                    raw_episodes = decode_pipe_response(res.text.strip())
                    break
            except Exception as e:
                log_debug(f"Miruro pipe probe error on {pipe_target[:60]}: {e}", tag="MIRURO")

    # 2. Parse episode groups if pipe succeeded
    sub_eps, dub_eps = [], []
    if raw_episodes and isinstance(raw_episodes, dict):
        providers_dict = raw_episodes.get("providers") or {}
        # Iterate over provider episode sets
        for p_name, p_data in providers_dict.items():
            if not isinstance(p_data, dict):
                continue
            episodes = p_data.get("episodes") or {}
            sub_list = episodes.get("sub") or []
            dub_list = episodes.get("dub") or []

            for ep in sub_list:
                num = ep.get("number")
                if num is not None and not any(e["number"] == num for e in sub_eps):
                    meta = episode_meta(num, ctx)
                    sub_eps.append({
                        "id": f"watch/{NAME}/{anilist_id}/sub/{NAME}-{num}",
                        "number": num,
                        "title": meta["title"] or ep.get("title") or f"Episode {num}",
                        "duration": meta["duration"],
                        "filler": meta["filler"],
                        "uncensored": meta["uncensored"],
                        "description": meta["description"],
                        "image": meta["image"] or ep.get("thumbnail"),
                        "airDate": meta["airDate"],
                        "sourceNumber": num,
                        "sourceId": ep.get("id"),
                        "audio": "sub",
                    })

            for ep in dub_list:
                num = ep.get("number")
                if num is not None and not any(e["number"] == num for e in dub_eps):
                    meta = episode_meta(num, ctx)
                    dub_eps.append({
                        "id": f"watch/{NAME}/{anilist_id}/dub/{NAME}-{num}",
                        "number": num,
                        "title": meta["title"] or ep.get("title") or f"Episode {num}",
                        "duration": meta["duration"],
                        "filler": meta["filler"],
                        "uncensored": meta["uncensored"],
                        "description": meta["description"],
                        "image": meta["image"] or ep.get("thumbnail"),
                        "airDate": meta["airDate"],
                        "sourceNumber": num,
                        "sourceId": ep.get("id"),
                        "audio": "dub",
                    })

    # 3. If pipe had no direct episodes, construct from standard media context
    total_eps = expected or 1
    if not sub_eps:
        for num in range(1, total_eps + 1):
            meta = episode_meta(num, ctx)
            base_ep = {
                "number": num,
                "title": meta["title"] or f"Episode {num}",
                "duration": meta["duration"],
                "filler": meta["filler"],
                "uncensored": meta["uncensored"],
                "description": meta["description"],
                "image": meta["image"],
                "airDate": meta["airDate"],
                "sourceNumber": num,
            }
            sub_eps.append({
                "id": f"watch/{NAME}/{anilist_id}/sub/{NAME}-{num}",
                **base_ep,
                "audio": "sub",
            })
            dub_eps.append({
                "id": f"watch/{NAME}/{anilist_id}/dub/{NAME}-{num}",
                **base_ep,
                "audio": "dub",
            })

    sub_eps.sort(key=lambda x: x["number"])
    dub_eps.sort(key=lambda x: x["number"])

    result = {
        "meta": {
            "id": str(anilist_id),
            "title": title,
            "source": NAME,
            "matchScore": 1.0,
            "numbering": "standard",
            "episodeOffset": 0,
        },
        "episodes": {
            "sub": sub_eps,
            "dub": dub_eps,
        },
    }
    _cache.set(cache_key, result, ttl=300)
    return result


async def watch(anilist_id: int, audio: str, ep: int, ctx: dict | None = None) -> list:
    """Resolve streaming URLs for a specific episode from Miruro."""
    ctx = ctx or await build_ctx(anilist_id)
    streams = []

    # 1. Try modern catalog playback endpoint
    async with httpx.AsyncClient(timeout=15.0, proxy=MIRURO_PROXY or None) as client:
        for base in MIRURO_DOMAINS:
            url = f"{base}/api/v1/anime/{anilist_id}/episodes/{ep}/play"
            headers = _get_headers(base)
            try:
                res = await client.get(url, headers=headers)
                if res.status_code == 200:
                    ct = res.headers.get("content-type", "")
                    playback_data = None
                    if "octet-stream" in ct:
                        playback_data = decode_catalog_payload(res.content)
                    elif "json" in ct:
                        playback_data = res.json()

                    if playback_data and isinstance(playback_data, dict):
                        # Parse tracks/providers and subtitles
                        raw_subs = playback_data.get("subtitles") or []
                        tracks = playback_data.get("tracks") or []
                        for tr in tracks:
                            if tr.get("track") == audio or (audio == "sub" and tr.get("track") in ("sub", "ssub")):
                                for prov in tr.get("providers") or []:
                                    p_name = prov.get("provider") or "Miruro"
                                    for srv in prov.get("servers") or []:
                                        s_name = srv.get("server") or p_name
                                        for st in srv.get("streams") or []:
                                            st_url = st.get("url")
                                            if not st_url:
                                                continue
                                            # Wrap with keeply proxy if needed
                                            referer = (srv.get("headers") or {}).get("referer") or f"{base}/"
                                            proxy_url = build_keeply_hls(st_url, referer=referer)
                                            streams.append({
                                                "url": proxy_url,
                                                "type": "hls",
                                                "server": f"Miruro - {s_name}",
                                                "audio": audio,
                                                "referer": "https://krussdomi.com/",
                                                "priority": 1,
                                                "isActive": len(streams) == 0,
                                                "subtitles": raw_subs,
                                            })
                        if streams:
                            return streams
            except Exception as e:
                log_debug(f"Catalog playback probe error on {base}: {e}", tag="MIRURO")

    # 2. Try pipe fallback endpoint
    pipe_sources = None
    enc_id = base64.urlsafe_b64encode(f"{anilist_id}:{ep}".encode()).decode().rstrip("=")
    pipe_payload = {
        "path": "sources",
        "method": "GET",
        "query": {
            "episodeId": enc_id,
            "provider": "gogoanime",
            "category": audio,
            "anilistId": anilist_id,
        },
        "body": None,
        "version": "0.1.0",
    }
    encoded_pipe = encode_pipe_request(pipe_payload)

    async with httpx.AsyncClient(timeout=15.0, proxy=MIRURO_PROXY or None) as client:
        for pipe_target, pipe_headers in iter_miruro_pipe_targets(encoded_pipe):
            if MIRURO_COOKIE:
                pipe_headers["Cookie"] = MIRURO_COOKIE
            try:
                res = await client.get(pipe_target, headers=pipe_headers)
                if res.status_code == 200:
                    pipe_sources = decode_pipe_response(res.text.strip())
                    break
            except Exception as e:
                log_debug(f"Miruro pipe probe error on {pipe_target[:60]}: {e}", tag="MIRURO")

    if pipe_sources and isinstance(pipe_sources, dict):
        sources_list = pipe_sources.get("sources") or []
        pipe_subs = pipe_sources.get("subtitles") or []
        for s in sources_list:
            if not isinstance(s, dict):
                continue
            url = s.get("url")
            if not url:
                continue
            is_hls = ".m3u8" in url or s.get("isM3U8", False)
            streams.append({
                "url": url,
                "type": "hls" if is_hls else "embed",
                "server": s.get("server") or s.get("name") or "Miruro",
                "audio": audio,
                "referer": "https://www.miruro.bz/",
                "priority": 1 if len(streams) == 0 else 2,
                "isActive": len(streams) == 0,
                "subtitles": pipe_subs,
            })

    if not streams:
        raise RuntimeError(
            f"Miruro: no streams resolved for episode {ep} (AniList {anilist_id}, {audio}). "
            "Cloudflare Turnstile challenge requires MIRURO_COOKIE or FLARESOLVERR_URL if hitting origin."
        )

    return streams
