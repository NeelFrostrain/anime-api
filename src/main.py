import os
import re
import time
from urllib.parse import urlparse
import httpx
from fastapi import FastAPI, Query, Request
from fastapi.responses import Response, PlainTextResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from src.endpoints import router
from src.config import HEADERS
from src.logger import (
    log_info, log_warn, log_error, get_recent_logs, get_log_stats,
    silence_uvicorn_access_spam,
)

silence_uvicorn_access_spam()

app = FastAPI(title="Kuhi API", version="2.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.middleware("http")
async def log_requests(request: Request, call_next):
    path = request.url.path
    if path.startswith("/logs") or path.startswith("/assets") or path == "/favicon.ico":
        return await call_next(request)

    t0 = time.time()
    response = await call_next(request)
    duration_ms = round((time.time() - t0) * 1000, 1)

    client_ip = request.client.host if request.client else "127.0.0.1"
    query_str = f"?{request.url.query}" if request.url.query else ""
    log_info(
        f"{client_ip} - {request.method} {path}{query_str} -> {response.status_code} ({duration_ms}ms)",
        tag="HTTP",
    )
    return response


if os.path.exists("assets"):
    app.mount("/assets", StaticFiles(directory="assets"), name="assets")

app.include_router(router, prefix="/anime")


def _norm_url(url: str) -> str | None:
    url = (url or "").strip()
    if url.startswith("//"):
        return "https:" + url
    if url.startswith("http://") or url.startswith("https://"):
        return url
    return None


_proxy_client: httpx.AsyncClient | None = None


def get_proxy_client() -> httpx.AsyncClient:
    global _proxy_client
    if _proxy_client is None or _proxy_client.is_closed:
        _proxy_client = httpx.AsyncClient(
            timeout=httpx.Timeout(connect=6.0, read=30.0, write=10.0, pool=30.0),
            limits=httpx.Limits(max_keepalive_connections=100, max_connections=150, keepalive_expiry=120.0),
            verify=False,
            follow_redirects=True,
        )
    return _proxy_client


@app.on_event("shutdown")
async def shutdown_proxy_client():
    global _proxy_client
    if _proxy_client and not _proxy_client.is_closed:
        await _proxy_client.aclose()


@app.get("/proxy_m3u8")
async def proxy_m3u8(url: str, referer: str = "", audio: str = "sub"):
    url = _norm_url(url)
    if not url:
        return Response(content='{"detail":"bad proxy url"}', status_code=400,
                        media_type="application/json")
    audio = (audio or "sub").lower()
    try:
        client = get_proxy_client()
        h = HEADERS.copy()
        if referer:
            h["Referer"] = referer
            try:
                p = urlparse(referer)
                if p.scheme and p.netloc:
                    h["Origin"] = f"{p.scheme}://{p.netloc}"
            except Exception:
                pass

        log_info(f"Fetching m3u8 playlist ({audio}): {url[:85]}", tag="PROXY")
        resp = await client.get(url, headers=h)
        if resp.status_code != 200:
            log_warn(f"Upstream m3u8 returned status {resp.status_code} for {url[:85]}", tag="PROXY")
            return Response(content=resp.content, status_code=resp.status_code, media_type="text/plain")

        content = resp.text
        lines = []
        from urllib.parse import quote, urljoin
        import re

        is_variant = False
        has_explicit_eng = bool(re.search(r'#EXT-X-MEDIA:TYPE=AUDIO[^\n]*(?:NAME="[^"]*(?:english|dub)|LANGUAGE="(?:eng|en)")', content, re.I))
        has_explicit_jpn = bool(re.search(r'#EXT-X-MEDIA:TYPE=AUDIO[^\n]*(?:NAME="[^"]*(?:japanese|jap|sub)|LANGUAGE="(?:jpn|ja)")', content, re.I))
        default_audio_set = False

        for line in content.split('\n'):
            stripped = line.strip()
            if not stripped:
                lines.append(line)
                continue

            if stripped.startswith('#EXT-X-STREAM-INF') or stripped.startswith('#EXT-X-I-FRAME-STREAM-INF'):
                is_variant = True
                lines.append(line)
                continue

            if stripped.startswith('#EXT-X-MEDIA'):
                media_line = stripped
                if 'TYPE=AUDIO' in media_line:
                    is_eng = bool(re.search(r'NAME="[^"]*(?:english|dub)', media_line, re.I) or re.search(r'LANGUAGE="(?:eng|en)"', media_line, re.I))
                    is_jpn = bool(re.search(r'NAME="[^"]*(?:japanese|jap|sub)', media_line, re.I) or re.search(r'LANGUAGE="(?:jpn|ja)"', media_line, re.I))

                    media_line = re.sub(r',?DEFAULT=(?:YES|NO)', '', media_line)
                    media_line = re.sub(r',?AUTOSELECT=(?:YES|NO)', '', media_line)

                    if audio == "dub":
                        if has_explicit_eng:
                            if is_eng and not default_audio_set:
                                media_line = media_line.replace('TYPE=AUDIO', 'TYPE=AUDIO,DEFAULT=YES,AUTOSELECT=YES')
                                default_audio_set = True
                            else:
                                media_line = media_line.replace('TYPE=AUDIO', 'TYPE=AUDIO,DEFAULT=NO,AUTOSELECT=NO')
                        else:
                            if not default_audio_set:
                                media_line = media_line.replace('TYPE=AUDIO', 'TYPE=AUDIO,DEFAULT=YES,AUTOSELECT=YES')
                                default_audio_set = True
                            else:
                                media_line = media_line.replace('TYPE=AUDIO', 'TYPE=AUDIO,DEFAULT=NO,AUTOSELECT=NO')
                    else:  # sub
                        if has_explicit_jpn:
                            if is_jpn and not default_audio_set:
                                media_line = media_line.replace('TYPE=AUDIO', 'TYPE=AUDIO,DEFAULT=YES,AUTOSELECT=YES')
                                default_audio_set = True
                            elif is_eng:
                                media_line = media_line.replace('TYPE=AUDIO', 'TYPE=AUDIO,DEFAULT=NO,AUTOSELECT=NO')
                        else:
                            if not default_audio_set:
                                media_line = media_line.replace('TYPE=AUDIO', 'TYPE=AUDIO,DEFAULT=YES,AUTOSELECT=YES')
                                default_audio_set = True
                            else:
                                media_line = media_line.replace('TYPE=AUDIO', 'TYPE=AUDIO,DEFAULT=NO,AUTOSELECT=NO')

                media_uri_match = re.search(r'URI="([^"]+)"', media_line)
                if media_uri_match:
                    sub_url = urljoin(url, media_uri_match.group(1))
                    proxied_sub = f"/proxy_m3u8?url={quote(sub_url, safe='')}&referer={quote(referer, safe='')}&audio={quote(audio, safe='')}"
                    media_line = media_line.replace(f'URI="{media_uri_match.group(1)}"', f'URI="{proxied_sub}"')
                lines.append(media_line)
                continue

            if stripped.startswith('#EXT-X-KEY'):
                key_match = re.search(r'URI="([^"]+)"', stripped)
                if key_match:
                    key_url = urljoin(url, key_match.group(1))
                    proxied_key = f"/proxy_segment?url={quote(key_url, safe='')}&referer={quote(referer, safe='')}&audio={quote(audio, safe='')}"
                    line = stripped.replace(f'URI="{key_match.group(1)}"', f'URI="{proxied_key}"')
                lines.append(line)
                continue

            if not stripped.startswith('#'):
                absolute_url = urljoin(url, stripped)
                if is_variant or '.m3u8' in stripped:
                    line = f"/proxy_m3u8?url={quote(absolute_url, safe='')}&referer={quote(referer, safe='')}&audio={quote(audio, safe='')}"
                else:
                    line = f"/proxy_segment?url={quote(absolute_url, safe='')}&referer={quote(referer, safe='')}&audio={quote(audio, safe='')}"
                is_variant = False

            lines.append(line)

        log_info(f"M3U8 proxied successfully ({len(lines)} lines parsed)", tag="PROXY")
        return Response(content='\n'.join(lines), media_type="application/vnd.apple.mpegurl")
    except Exception as e:
        log_error(f"Error fetching m3u8: {e}", tag="PROXY", exc=e)
        return Response(content=f'{{"detail":"proxy_m3u8 error: {str(e)}"}}', status_code=502,
                        media_type="application/json")


@app.get("/proxy_segment")
async def proxy_segment(url: str, referer: str = "", audio: str = "sub"):
    url = _norm_url(url)
    if not url:
        return Response(content='{"detail":"bad proxy url"}', status_code=400,
                        media_type="application/json")
    try:
        client = get_proxy_client()
        h = HEADERS.copy()
        if referer:
            h["Referer"] = referer
            try:
                p = urlparse(referer)
                if p.scheme and p.netloc:
                    h["Origin"] = f"{p.scheme}://{p.netloc}"
            except Exception:
                pass

        resp = await client.get(url, headers=h)
        if resp.status_code == 403:
            log_warn(f"Upstream segment 403 Forbidden: {url[:85]}", tag="PROXY")
        elif resp.status_code != 200:
            log_warn(f"Upstream segment status {resp.status_code}: {url[:85]}", tag="PROXY")
        else:
            log_info(f"Segment proxied: {len(resp.content)//1024} KB ({resp.status_code} OK)", tag="PROXY")

        if resp.content.startswith(b"#EXTM3U"):
            return await proxy_m3u8(url, referer, audio=audio)
        media_type = resp.headers.get("content-type", "video/mp2t")
        if "image" in media_type or "octet-stream" in media_type:
            media_type = "video/mp2t"
        resp_headers = {"Cache-Control": "public, max-age=86400, immutable"} if resp.status_code == 200 else None
        return Response(content=resp.content, status_code=resp.status_code, media_type=media_type, headers=resp_headers)
    except httpx.HTTPError as e:
        log_error(f"Network error fetching segment: {e}", tag="PROXY")
        return Response(content=b"", status_code=502)
    except Exception as e:
        log_error(f"Unexpected error fetching segment: {e}", tag="PROXY", exc=e)
        return Response(content=b"", status_code=500)


def _ass_to_vtt(text: str) -> str:
    lines = ["WEBVTT\n"]
    for l in text.split("\n"):
        if l.startswith("Dialogue:"):
            parts = l.split(",", 9)
            if len(parts) == 10:
                start_s = parts[1].strip()
                end_s = parts[2].strip()
                raw_txt = parts[9].strip()
                clean_txt = re.sub(r"\{[^}]*\}", "", raw_txt)
                clean_txt = clean_txt.replace(r"\N", "\n").replace(r"\n", "\n")
                def _norm_ts(ts):
                    hp = ts.split(":")
                    h = int(hp[0])
                    m = int(hp[1])
                    sec_cs = hp[2].split(".")
                    s = int(sec_cs[0])
                    cs = int(sec_cs[1]) if len(sec_cs) > 1 else 0
                    ms = cs * 10
                    return f"{h:02d}:{m:02d}:{s:02d}.{ms:03d}"
                try:
                    lines.append(f"{_norm_ts(start_s)} --> {_norm_ts(end_s)}")
                    lines.append(clean_txt + "\n")
                except Exception:
                    pass
    return "\n".join(lines)


def _process_subtitle_content(text: str, offset: float = 0.0, speed: float = 1.0) -> str:
    if "[Events]" in text and "Dialogue:" in text:
        text = _ass_to_vtt(text)

    text_stripped = text.lstrip()
    if not text_stripped.startswith("WEBVTT"):
        text = "WEBVTT\n\n" + text_stripped

    if offset != 0.0 or speed != 1.0:
        ts_pattern = re.compile(
            r"(?:(\d{1,2}):)?(\d{2}):(\d{2})[.,](\d{3})\s*-->\s*(?:(\d{1,2}):)?(\d{2}):(\d{2})[.,](\d{3})"
        )

        def _shift_match(m):
            def _parse_time(h, mn, sc, ms):
                hr = int(h[:-1]) if h else 0
                return hr * 3600 + int(mn) * 60 + int(sc) + int(ms) / 1000.0

            def _fmt_time(t):
                t = max(0.0, t)
                h = int(t // 3600)
                mn = int((t % 3600) // 60)
                sc = int(t % 60)
                ms = int(round((t - int(t)) * 1000))
                if ms >= 1000:
                    sc += 1
                    ms = 0
                return f"{h:02d}:{mn:02d}:{sc:02d}.{ms:03d}"

            t1 = _parse_time(m.group(1), m.group(2), m.group(3), m.group(4))
            t2 = _parse_time(m.group(5), m.group(6), m.group(7), m.group(8))
            new_t1 = (t1 * speed) + offset
            new_t2 = (t2 * speed) + offset
            return f"{_fmt_time(new_t1)} --> {_fmt_time(new_t2)}"

        text = ts_pattern.sub(_shift_match, text)

    return text


@app.get("/proxy_subtitle")
async def proxy_subtitle(
    url: str,
    referer: str = "",
    offset: float = Query(0.0, description="time offset in seconds (e.g. +1.5 or -0.5)"),
    speed: float = Query(1.0, ge=0.1, le=5.0, description="timing scale factor"),
):
    url = _norm_url(url)
    if not url:
        return Response(content='{"detail":"bad subtitle url"}', status_code=400,
                        media_type="application/json")
    try:
        client = get_proxy_client()
        h = HEADERS.copy()
        if not referer:
            if "vid-cdn.xyz" in url or "anizone" in url:
                referer = "https://anizone.to/"
            elif "forestcdn.top" in url or "reanime" in url:
                referer = "https://reanime.to/"
            elif "krussdomi" in url:
                referer = "https://krussdomi.com/"
        if referer:
            h["Referer"] = referer
            try:
                p = urlparse(referer)
                if p.scheme and p.netloc:
                    h["Origin"] = f"{p.scheme}://{p.netloc}"
            except Exception:
                pass

        resp = await client.get(url, headers=h)
        if resp.status_code != 200:
            log_warn(f"Upstream subtitle status {resp.status_code}: {url[:85]}", tag="PROXY")
            return Response(content=resp.content, status_code=resp.status_code, media_type="text/plain")

        text = resp.text
        vtt_output = _process_subtitle_content(text, offset=offset, speed=speed)
        log_info(f"Subtitle proxied ({len(vtt_output)} bytes, offset={offset}s, speed={speed}x): {url[:70]}", tag="PROXY")
        resp_headers = {
            "Content-Type": "text/vtt; charset=utf-8",
            "Access-Control-Allow-Origin": "*",
            "Cache-Control": "public, max-age=3600",
        }
        return Response(content=vtt_output, status_code=200, media_type="text/vtt; charset=utf-8", headers=resp_headers)
    except Exception as e:
        log_error(f"Error proxying subtitle: {e}", tag="PROXY", exc=e)
        return Response(content="WEBVTT\n\n", status_code=500, media_type="text/vtt; charset=utf-8")


@app.get("/logs")
async def view_logs(lines: int = Query(150, ge=10, le=1000)):
    recent = get_recent_logs(lines)
    return {"lines": recent, "count": len(recent)}


@app.get("/logs/raw")
async def view_logs_raw(lines: int = Query(150, ge=10, le=1000)):
    recent = get_recent_logs(lines)
    return PlainTextResponse("\n".join(recent))


@app.get("/logs/stats")
async def view_logs_stats():
    return get_log_stats()


@app.get("/")
async def root():
    return {
        "status": "online",
        "service": "Kuhi Anime API",
        "version": "2.0",
        "docs": "/docs",
        "endpoints": {
            "extract": "/anime/extract/{query}?e=1&type=sub&provider=auto",
            "episodes": "/anime/episodes/{anilist_id}",
            "search": "/anime/search?query={title}&page=1",
            "suggestions": "/anime/suggestions?query={title}",
            "info": "/anime/info/{anilist_id}",
            "trending": "/anime/trending?page=1",
            "popular": "/anime/popular?page=1",
            "upcoming": "/anime/upcoming?page=1",
            "recent": "/anime/recent?page=1",
            "schedule": "/anime/schedule?page=1",
            "spotlight": "/anime/spotlight",
            "filter": "/anime/filter?genre={genre}&sort=SCORE_DESC",
            "genres": "/anime/genres",
            "providers_status": "/anime/providers/status",
            "proxy_m3u8": "/proxy_m3u8?url={m3u8_url}&referer={ref}&audio=sub",
            "proxy_segment": "/proxy_segment?url={ts_url}&referer={ref}",
            "proxy_subtitle": "/proxy_subtitle?url={vtt_url}&offset=0.0&speed=1.0",
            "logs": "/logs",
            "logs_raw": "/logs/raw",
            "logs_stats": "/logs/stats",
        },
    }

