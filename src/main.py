import os
import time
from urllib.parse import urlparse
import httpx
from fastapi import FastAPI, Query, Request
from fastapi.responses import HTMLResponse, Response, PlainTextResponse
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


@app.get("/", response_class=HTMLResponse)
async def home():

    return """<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>kuhi native api</title>
    <link rel="icon" type="image/png" href="/assets/imgs/logo.png">
    <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700&display=swap" rel="stylesheet">
    <style>
        :root {
            --bg: #000000;
            --fg: #ffffff;
            --accent: #262626;
            --muted: #1a1a1a;
            --border: #262626;
            --text-muted: #a1a1aa;
        }

        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
            font-family: 'Outfit', sans-serif;
            scrollbar-width: thin;
            scrollbar-color: var(--accent) var(--bg);
        }

        body {
            background-color: var(--bg);
            color: var(--fg);
            line-height: 1.6;
            -webkit-font-smoothing: antialiased;
        }

        .container {
            max-width: 900px;
            margin: 0 auto;
            padding: 80px 24px;
        }

        header { margin-bottom: 60px; text-align: left; }

        .warning-box {
            background: rgba(220, 38, 38, 0.1);
            border: 1px solid rgba(220, 38, 38, 0.3);
            backdrop-filter: blur(10px);
            -webkit-backdrop-filter: blur(10px);
            border-radius: 8px;
            padding: 16px 20px;
            margin-bottom: 40px;
            color: #fca5a5;
            font-size: 0.9rem;
            font-weight: 500;
        }
        .warning-box strong { color: #ef4444; }

        .logo-box { width: 48px; height: 48px; border: 2px solid #fff; border-radius: 8px; margin-bottom: 24px; display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 1.5rem; }

        h1 { font-size: 3.5rem; font-weight: 700; letter-spacing: -0.05em; line-height: 1; }
        .subtitle { font-size: 1.1rem; color: var(--text-muted); font-weight: 300; margin: 12px 0 20px; }
        .v-badge { display: inline-block; background: var(--muted); border: 1px solid var(--border); padding: 4px 12px; border-radius: 99px; font-size: 0.8rem; color: var(--fg); }

        .lbl {
            font-size: 0.75rem;
            text-transform: uppercase;
            letter-spacing: 0.2em;
            color: var(--text-muted);
            margin: 60px 0 24px;
            display: block;
            border-bottom: 1px solid var(--border);
            padding-bottom: 8px;
        }

        .card {
            background: var(--bg);
            border: 1px solid var(--border);
            border-radius: 8px;
            margin-bottom: 24px;
            padding: 24px;
            transition: border-color 0.2s;
        }
        .card:hover { border-color: #404040; }

        .meta { display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; flex-wrap: wrap; gap: 12px; }
        .method { font-size: 0.75rem; font-weight: 700; padding: 4px 8px; background: var(--muted); border: 1px solid var(--border); border-radius: 4px; display: flex; align-items: center; gap: 8px; }
        .tag { border: 1px solid var(--border); padding: 1px 6px; border-radius: 4px; font-size: 0.6rem; text-transform: uppercase; color: var(--text-muted); }
        .path { font-family: monospace; font-size: 0.95rem; }

        .desc { font-size: 0.9rem; color: var(--text-muted); margin-bottom: 20px; }

        /* playground interactive elements */
        .sandbox { display: flex; gap: 8px; margin-bottom: 12px; }
        .in-url {
            flex: 1;
            background: var(--muted);
            border: 1px solid var(--border);
            border-radius: 6px;
            padding: 8px 12px;
            color: var(--fg);
            font-family: monospace;
            font-size: 0.85rem;
            outline: none;
        }
        .in-url:focus { border-color: #555; }

        .try-btn { background: var(--fg); color: var(--bg); border: none; padding: 8px 16px; border-radius: 6px; font-size: 0.85rem; font-weight: 600; cursor: pointer; transition: opacity 0.2s; white-space: nowrap; }
        .try-btn:hover { opacity: 0.8; }

        pre { font-family: monospace; font-size: 0.75rem; color: var(--text-muted); background: var(--muted); padding: 16px; border-radius: 6px; border: 1px solid var(--border); margin-top: 16px; white-space: pre-wrap; word-break: break-all; }

        .res-box { margin-top: 20px; display: none; max-height: 400px; overflow-y: auto; }
        .loading { font-size: 0.8rem; color: var(--text-muted); display: none; margin-top: 10px; }

        .player-wrap { margin-top: 24px; display: none; background: #000; border-radius: 8px; overflow: hidden; border: 1px solid var(--border); aspect-ratio: 16/9; position: relative; }
        video { width: 100%; height: 100%; display: block; }

        .curl-box { margin-top: 16px; display: none; background: var(--muted); border: 1px solid var(--border); border-radius: 6px; padding: 12px; position: relative; }
        .curl-box code { font-family: monospace; font-size: 0.75rem; color: var(--fg); word-break: break-all; display: block; }
        .copy-curl { position: absolute; top: 8px; right: 8px; background: var(--fg); color: var(--bg); border: none; padding: 4px 10px; border-radius: 4px; font-size: 0.7rem; cursor: pointer; font-weight: 600; }
        .copy-curl:hover { opacity: 0.8; }

        footer { margin-top: 100px; padding: 40px 0; border-top: 1px solid var(--border); font-size: 0.8rem; color: var(--text-muted); line-height: 1.8; text-align: center; }
    </style>
    <script src="https://cdn.jsdelivr.net/npm/hls.js@latest"></script>
</head>
<body>
    <div class="container">
        <header>
            <div class="logo-box">K</div>
            <h1>kuhi api</h1>
            <p class="subtitle">revamped and decrypted streaming server built for scale.</p>
            <div class="v-badge">v2.0 — live testing enabled</div>
        </header>

        <div class="warning-box">
            <strong>⚠ disclaimer:</strong> this api is experimental and not reliable. use at your own risk. no guarantees on uptime or data accuracy. i'm not responsible for any legal troubles
        </div>

        <span class="lbl">anime endpoints explorer</span>

        <div class="card">
            <div class="meta">
                <div><span class="method">GET</span> <span class="path">search</span></div>
                <div class="tag">full metadata</div>
            </div>
            <div class="desc">global anime search. returns full metadata titles and covers.</div>
            <div class="sandbox">
                <input type="text" class="in-url" value="/anime/search?query=violet evergarden&page=1">
                <button class="try-btn" onclick="test(this)">execute</button>
            </div>
            <div class="loading">working...</div>
            <div class="res-box"><pre></pre></div>
        </div>

        <div class="card">
            <div class="meta">
                <div><span class="method">GET</span> <span class="path">suggestions</span> <span class="tag">lite</span></div>
            </div>
            <div class="desc">lightweight autocomplete search. minimal data footprint.</div>
            <div class="sandbox">
                <input type="text" class="in-url" value="/anime/suggestions?query=violet evergarden">
                <button class="try-btn" onclick="test(this)">execute</button>
            </div>
            <div class="loading">working...</div>
            <div class="res-box"><pre></pre></div>
        </div>

        <div class="card">
            <div class="meta">
                <div><span class="method">GET</span> <span class="path">spotlight</span> <span class="tag">hot</span></div>
            </div>
            <div class="desc">curated hot list of top trending shows in focus.</div>
            <div class="sandbox">
                <input type="text" class="in-url" value="/anime/spotlight">
                <button class="try-btn" onclick="test(this)">execute</button>
            </div>
            <div class="loading">working...</div>
            <div class="res-box"><pre></pre></div>
        </div>

        <div class="card">
            <div class="meta">
                <div><span class="method">GET</span> <span class="path">filter</span></div>
            </div>
            <div class="desc">advanced logic to combine genres, years, formats and sorting.</div>
            <div class="sandbox">
                <input type="text" class="in-url" value="/anime/filter?genre=Action&sort=SCORE_DESC">
                <button class="try-btn" onclick="test(this)">execute</button>
            </div>
            <div class="loading">working...</div>
            <div class="res-box"><pre></pre></div>
        </div>

        <div class="card">
            <div class="meta">
                <div><span class="method">GET</span> <span class="path">genres</span></div>
            </div>
            <div class="desc">list all available genres for filtering.</div>
            <div class="sandbox">
                <input type="text" class="in-url" value="/anime/genres">
                <button class="try-btn" onclick="test(this)">execute</button>
            </div>
            <div class="loading">working...</div>
            <div class="res-box"><pre></pre></div>
        </div>

        <div class="card">
            <div class="meta">
                <div><span class="method">GET</span> <span class="path">info/{id}</span></div>
                <div class="tag">full info</div>
            </div>
            <div class="desc">complete anime page chunk — characters, relations, staff, and recs.</div>
            <div class="sandbox">
                <input type="text" class="in-url" value="/anime/info/21827">
                <button class="try-btn" onclick="test(this)">execute</button>
            </div>
            <div class="loading">working...</div>
            <div class="res-box"><pre></pre></div>
        </div>

        <div class="card">
            <div class="meta">
                <div><span class="method">GET</span> <span class="path">anime/{id}/characters</span></div>
            </div>
            <div class="desc">character list with voice actors.</div>
            <div class="sandbox">
                <input type="text" class="in-url" value="/anime/anime/21827/characters">
                <button class="try-btn" onclick="test(this)">execute</button>
            </div>
            <div class="loading">working...</div>
            <div class="res-box"><pre></pre></div>
        </div>

        <div class="card">
            <div class="meta">
                <div><span class="method">GET</span> <span class="path">anime/{id}/relations</span></div>
            </div>
            <div class="desc">related anime (sequels, prequels, spin-offs).</div>
            <div class="sandbox">
                <input type="text" class="in-url" value="/anime/anime/21827/relations">
                <button class="try-btn" onclick="test(this)">execute</button>
            </div>
            <div class="loading">working...</div>
            <div class="res-box"><pre></pre></div>
        </div>

        <div class="card">
            <div class="meta">
                <div><span class="method">GET</span> <span class="path">anime/{id}/recommendations</span></div>
            </div>
            <div class="desc">recommended similar anime.</div>
            <div class="sandbox">
                <input type="text" class="in-url" value="/anime/anime/21827/recommendations">
                <button class="try-btn" onclick="test(this)">execute</button>
            </div>
            <div class="loading">working...</div>
            <div class="res-box"><pre></pre></div>
        </div>

        <div class="card">
            <div class="meta">
                <div><span class="method">GET</span> <span class="path">trending</span></div>
            </div>
            <div class="desc">currently trending anime.</div>
            <div class="sandbox">
                <input type="text" class="in-url" value="/anime/trending?page=1">
                <button class="try-btn" onclick="test(this)">execute</button>
            </div>
            <div class="loading">working...</div>
            <div class="res-box"><pre></pre></div>
        </div>

        <div class="card">
            <div class="meta">
                <div><span class="method">GET</span> <span class="path">popular</span></div>
            </div>
            <div class="desc">most popular anime of all time.</div>
            <div class="sandbox">
                <input type="text" class="in-url" value="/anime/popular?page=1">
                <button class="try-btn" onclick="test(this)">execute</button>
            </div>
            <div class="loading">working...</div>
            <div class="res-box"><pre></pre></div>
        </div>

        <div class="card">
            <div class="meta">
                <div><span class="method">GET</span> <span class="path">upcoming</span></div>
            </div>
            <div class="desc">upcoming anime releases.</div>
            <div class="sandbox">
                <input type="text" class="in-url" value="/anime/upcoming?page=1">
                <button class="try-btn" onclick="test(this)">execute</button>
            </div>
            <div class="loading">working...</div>
            <div class="res-box"><pre></pre></div>
        </div>

        <div class="card">
            <div class="meta">
                <div><span class="method">GET</span> <span class="path">recent</span></div>
            </div>
            <div class="desc">recently aired episodes.</div>
            <div class="sandbox">
                <input type="text" class="in-url" value="/anime/recent?page=1">
                <button class="try-btn" onclick="test(this)">execute</button>
            </div>
            <div class="loading">working...</div>
            <div class="res-box"><pre></pre></div>
        </div>

        <div class="card">
            <div class="meta">
                <div><span class="method">GET</span> <span class="path">schedule</span></div>
            </div>
            <div class="desc">airing schedule for upcoming episodes.</div>
            <div class="sandbox">
                <input type="text" class="in-url" value="/anime/schedule?page=1">
                <button class="try-btn" onclick="test(this)">execute</button>
            </div>
            <div class="loading">working...</div>
            <div class="res-box"><pre></pre></div>
        </div>

        <div class="card">
            <div class="meta">
                <div><span class="method">GET</span> <span class="path">episodes/{id}</span></div>
            </div>
            <div class="desc">grabs internal mappings and episode lists.</div>
            <div class="sandbox">
                <input type="text" class="in-url" value="/anime/episodes/178005">
                <button class="try-btn" onclick="test(this)">execute</button>
            </div>
            <div class="loading">working...</div>
            <div class="res-box"><pre></pre></div>
        </div>

        <div class="card">
            <div class="meta">
                <div><span class="method">GET</span> <span class="path">episodes/{id}</span></div>
            </div>
            <div class="desc">grabs internal mappings and episode lists.</div>
            <div class="sandbox">
                <input type="text" class="in-url" value="/anime/episodes/21827">
                <button class="try-btn" onclick="test(this)">execute</button>
            </div>
            <div class="loading">working...</div>
            <div class="res-box"><pre></pre></div>
        </div>

        <span class="lbl">all-in-one automation</span>

        <div class="card">
            <div class="meta">
                <div><span class="method" style="background:#fff;color:#000">GET</span> <span class="path">extract</span> <span class="tag">magic</span></div>
            </div>
            <div class="desc">use anilist id (21827) or full anime name (violet evergarden). get id from /anime/search if needed. movies auto-detect. pick a provider or leave on auto for fastest-wins.</div>
            <div class="sandbox">
                <input type="text" class="in-url" value="/anime/extract/violet-evergarden?e=1">
                <button class="try-btn" onclick="test(this)">execute</button>
            </div>
            <div class="sandbox">
                <select class="in-url in-prov">
                    <option value="">auto (fastest wins)</option>
                    <option value="anineko">anineko</option>
                    <option value="anizone">anizone</option>
                    <option value="anikoto">anikoto</option>
                    <option value="reanime">reanime</option>
                    <option value="aniwaves">aniwaves</option>
                    <option value="kaa">kaa</option>
                    <option value="anibd">anibd</option>
                    <option value="animegg">animegg</option>
                    <option value="mkissa">mkissa</option>
                    <option value="animeonsen">animeonsen</option>
                    <option value="miruro">miruro</option>
                </select>
                <select class="in-url in-type">
                    <option value="sub">sub</option>
                    <option value="dub">dub</option>
                </select>
            </div>
            <div class="loading">working...</div>
            <div id="player-status" style="display:none;font-size:0.85rem;font-weight:600;color:#4ade80;margin:12px 0 6px;"></div>
            <div id="audio-track-wrap" style="display:none;align-items:center;gap:10px;margin:8px 0;font-size:0.85rem;background:#171717;border:1px solid var(--border);padding:8px 12px;border-radius:6px;">
                <span style="color:#a3a3a3;font-weight:500;">🎧 Audio Track:</span>
                <select id="audio-track-selector" style="background:#262626;color:#fff;border:1px solid #404040;padding:4px 10px;border-radius:4px;font-size:0.82rem;cursor:pointer;outline:none;"></select>
                <span id="audio-track-note" style="color:#22c55e;font-size:0.75rem;margin-left:auto;"></span>
            </div>
            <div class="player-wrap">
                <video id="hls-player" controls @play="refreshReferer"></video>
                <iframe id="embed-player" style="display:none;width:100%;height:100%;border:none;" allowfullscreen></iframe>
            </div>
            <div class="curl-box">
                <button class="copy-curl" onclick="copyCurl(this)">copy</button>
                <code></code>
            </div>
            <div class="res-box"><pre></pre></div>
        </div>

        <span class="lbl">live server & streaming logs</span>

        <div class="card" id="logs-card">
            <div class="meta">
                <div><span class="method" style="background:#22c55e;color:#000">LOGS</span> <span class="path">/logs/raw</span> <span class="tag">live disk stream</span></div>
                <div style="display:flex;gap:8px;">
                    <a href="/logs/raw" target="_blank" style="color:var(--text-muted);font-size:0.75rem;text-decoration:none;border:1px solid var(--border);padding:4px 8px;border-radius:4px;">raw text ↗</a>
                    <a href="/logs" target="_blank" style="color:var(--text-muted);font-size:0.75rem;text-decoration:none;border:1px solid var(--border);padding:4px 8px;border-radius:4px;">json ↗</a>
                    <a href="/logs/stats" target="_blank" style="color:var(--text-muted);font-size:0.75rem;text-decoration:none;border:1px solid var(--border);padding:4px 8px;border-radius:4px;">stats ↗</a>
                </div>
            </div>
            <div class="desc">live activity stream saved in <code>logs/api.log</code> and <code>logs/errors.log</code>. tracks HLS segment fetching, provider racing, and stream extractions with rotating disk persistence.</div>
            <div class="sandbox">
                <button class="try-btn" onclick="fetchServerLogs()" style="background:#262626;color:#fff;">refresh logs</button>
                <label style="display:flex;align-items:center;gap:6px;font-size:0.8rem;color:var(--text-muted);margin-left:12px;cursor:pointer;">
                    <input type="checkbox" id="auto-logs" checked onchange="toggleAutoLogs()"> auto-refresh (2s)
                </label>
            </div>
            <pre id="log-terminal" style="max-height:300px;overflow-y:auto;background:#0d0d0d;border:1px solid #333;color:#4ade80;font-size:0.75rem;line-height:1.4;">loading logs...</pre>
        </div>

        <footer>
            kuhi native 2.0 interface — miruro
        </footer>
    </div>

    <script>
        function syncEndpointUrl() {
            const card = document.querySelector('.card:has(.in-prov)');
            if (!card) return;
            const input = card.querySelector('.in-url');
            const prov = card.querySelector('.in-prov');
            const typ = card.querySelector('.in-type');
            if (!input) return;
            try {
                let ep = input.value.trim();
                const dummy = 'http://localhost';
                const u = new URL(ep.startsWith('/') ? dummy + ep : (ep.startsWith('http') ? ep : dummy + '/' + ep));
                if (prov && prov.value) u.searchParams.set('provider', prov.value);
                else u.searchParams.delete('provider');
                if (typ && typ.value) u.searchParams.set('type', typ.value);
                input.value = u.pathname + u.search;
            } catch (e) {}
        }

        document.addEventListener('DOMContentLoaded', () => {
            const prov = document.querySelector('.in-prov');
            const typ = document.querySelector('.in-type');
            if (prov) prov.addEventListener('change', syncEndpointUrl);
            if (typ) typ.addEventListener('change', syncEndpointUrl);
        });

        async function test(btn) {
            const card = btn.closest('.card');
            const input = card.querySelector('.in-url');
            let endpoint = input.value.trim();
            const prov = card.querySelector('.in-prov');
            const typ = card.querySelector('.in-type');

            try {
                const dummy = 'http://localhost';
                const u = new URL(endpoint.startsWith('/') ? dummy + endpoint : (endpoint.startsWith('http') ? endpoint : dummy + '/' + endpoint));
                if (prov && prov.value) u.searchParams.set('provider', prov.value);
                else u.searchParams.delete('provider');
                if (typ && typ.value) u.searchParams.set('type', typ.value);
                endpoint = u.pathname + u.search;
                input.value = endpoint;
            } catch (e) {
                if (prov && prov.value) endpoint += (endpoint.includes('?') ? '&' : '?') + 'provider=' + encodeURIComponent(prov.value);
                if (typ && typ.value) endpoint += (endpoint.includes('?') ? '&' : '?') + 'type=' + encodeURIComponent(typ.value);
            }

            const resBox = card.querySelector('.res-box');
            const pre = resBox.querySelector('pre');
            const loader = card.querySelector('.loading');
            const playerWrap = card.querySelector('.player-wrap');
            const playerStatus = card.querySelector('#player-status');
            const audioTrackWrap = card.querySelector('#audio-track-wrap');
            const audioTrackSel = card.querySelector('#audio-track-selector');
            const audioTrackNote = card.querySelector('#audio-track-note');
            const video = document.getElementById('hls-player');
            const embed = document.getElementById('embed-player');
            const curlBox = card.querySelector('.curl-box');

            // Immediately unload any previous video so old anime never lingers
            if (window.hlsInstance) {
                try { window.hlsInstance.destroy(); } catch (e) {}
                window.hlsInstance = null;
            }
            if (video) {
                video.pause();
                video.removeAttribute('src');
                video.load();
                video.style.display = 'block';
            }
            if (embed) {
                embed.src = 'about:blank';
                embed.style.display = 'none';
            }
            if (playerWrap) playerWrap.style.display = 'none';
            if (playerStatus) playerStatus.style.display = 'none';
            if (audioTrackWrap) audioTrackWrap.style.display = 'none';
            if (audioTrackSel) audioTrackSel.innerHTML = '';
            if (audioTrackNote) audioTrackNote.textContent = '';
            if (curlBox) curlBox.style.display = 'none';

            resBox.style.display = 'none';
            loader.style.display = 'block';

            try {
                const response = await fetch(endpoint);
                const data = await response.json();
                pre.textContent = JSON.stringify(data, null, 2);
                resBox.style.display = 'block';

                if (data.streams && data.streams.length > 0) {
                    const hlsStream = data.streams.find(s => s.type === 'hls');
                    if (hlsStream && Hls.isSupported()) {
                        const hls = new Hls({
                            maxBufferLength: 30,
                            maxMaxBufferLength: 60,
                            startFragPrefetch: true,
                            enableWorker: true,
                            lowLatencyMode: false,
                            backBufferLength: 30,
                            xhrSetup: function(xhr, url) {
                                if (url.startsWith('http') && !url.includes('127.0.0.1') && !url.includes('localhost')) {
                                    return;
                                }
                            }
                        });
                        window.hlsInstance = hls;
                        hls.on(Hls.Events.ERROR, function(event, errData) {
                            if (errData.fatal) {
                                switch (errData.type) {
                                    case Hls.ErrorTypes.NETWORK_ERROR:
                                        console.warn('Network error, attempting recovery...');
                                        hls.startLoad();
                                        break;
                                    case Hls.ErrorTypes.MEDIA_ERROR:
                                        console.warn('Media error, attempting recovery...');
                                        hls.recoverMediaError();
                                        break;
                                    default:
                                        console.error('Fatal HLS error:', errData);
                                        hls.destroy();
                                        break;
                                }
                            }
                        });

                        const reqAudio = (data.type || (typ ? typ.value : 'sub') || 'sub').toLowerCase();
                        const proxyUrl = `/proxy_m3u8?url=${encodeURIComponent(hlsStream.url)}&referer=${encodeURIComponent(hlsStream.referer || '')}&audio=${encodeURIComponent(reqAudio)}`;

                        function setupAudioTracks() {
                            if (!hls.audioTracks || hls.audioTracks.length === 0) return;

                            // Auto-select preferred track according to sub/dub request
                            if (reqAudio === 'dub') {
                                const engIdx = hls.audioTracks.findIndex(t =>
                                    /eng|dub/i.test(t.name || '') || /eng|en/i.test(t.lang || '')
                                );
                                if (engIdx !== -1 && hls.audioTrack !== engIdx) {
                                    hls.audioTrack = engIdx;
                                } else if (hls.audioTrack < 0 && hls.audioTracks.length > 0) {
                                    hls.audioTrack = 0;
                                }
                            } else if (reqAudio === 'sub') {
                                const jpnIdx = hls.audioTracks.findIndex(t =>
                                    /jpn|jap|sub/i.test(t.name || '') || /jpn|ja/i.test(t.lang || '')
                                );
                                if (jpnIdx !== -1 && hls.audioTrack !== jpnIdx) {
                                    hls.audioTrack = jpnIdx;
                                } else if (hls.audioTrack < 0 && hls.audioTracks.length > 0) {
                                    hls.audioTrack = 0;
                                }
                            } else if (hls.audioTrack < 0 && hls.audioTracks.length > 0) {
                                hls.audioTrack = 0;
                            }

                            if (audioTrackSel && audioTrackWrap) {
                                audioTrackSel.innerHTML = '';
                                hls.audioTracks.forEach((tr, idx) => {
                                    const opt = document.createElement('option');
                                    opt.value = idx;
                                    const label = tr.name || tr.lang || `Track ${idx + 1}`;
                                    opt.textContent = label + (tr.lang && !label.toLowerCase().includes(tr.lang.toLowerCase()) ? ` (${tr.lang})` : '');
                                    audioTrackSel.appendChild(opt);
                                });
                                const activeIdx = hls.audioTrack >= 0 ? hls.audioTrack : 0;
                                audioTrackSel.value = activeIdx;
                                audioTrackWrap.style.display = 'flex';
                                if (audioTrackNote) {
                                    const curr = hls.audioTracks[activeIdx];
                                    audioTrackNote.textContent = curr ? `Playing: ${curr.name || curr.lang || 'Default'}` : '';
                                }
                                audioTrackSel.onchange = function() {
                                    const chosen = parseInt(this.value, 10);
                                    hls.audioTrack = chosen;
                                    if (audioTrackNote) {
                                        const c = hls.audioTracks[chosen];
                                        audioTrackNote.textContent = c ? `Switched to: ${c.name || c.lang || 'Track ' + (chosen + 1)}` : '';
                                    }
                                };
                            }
                        }

                        hls.on(Hls.Events.MANIFEST_PARSED, setupAudioTracks);
                        hls.on(Hls.Events.AUDIO_TRACKS_UPDATED, setupAudioTracks);
                        hls.on(Hls.Events.AUDIO_TRACK_SWITCHED, function(ev, trackData) {
                            if (audioTrackSel) audioTrackSel.value = trackData.id;
                            if (audioTrackNote && hls.audioTracks[trackData.id]) {
                                audioTrackNote.textContent = `Playing: ${hls.audioTracks[trackData.id].name || hls.audioTracks[trackData.id].lang || 'Track ' + (trackData.id + 1)}`;
                            }
                        });

                        hls.loadSource(proxyUrl);
                        hls.attachMedia(video);
                        video.play().catch(() => {});
                        video.style.display = 'block';
                        if (embed) embed.style.display = 'none';
                        if (playerWrap) playerWrap.style.display = 'block';
                        if (playerStatus) {
                            playerStatus.textContent = `▶ Now streaming: ${data.provider.toUpperCase()} (Episode ${data.episode}, ${data.type.toUpperCase()})`;
                            playerStatus.style.display = 'block';
                        }

                        const curlCmd = `curl -H "Referer: ${hlsStream.referer || ''}" "${hlsStream.url}"`;
                        if (curlBox) {
                            curlBox.querySelector('code').textContent = curlCmd;
                            curlBox.style.display = 'block';
                        }
                    } else {
                        // Fallback to embed stream if no HLS is available
                        const embedStream = data.streams.find(s => s.type === 'embed');
                        if (embedStream && embed) {
                            if (video) video.style.display = 'none';
                            embed.src = embedStream.url;
                            embed.style.display = 'block';
                            if (playerWrap) playerWrap.style.display = 'block';
                            if (playerStatus) {
                                playerStatus.textContent = `▶ Now Playing Embed: ${data.provider.toUpperCase()} (Episode ${data.episode})`;
                                playerStatus.style.display = 'block';
                            }
                        }
                    }
                }
            } catch (err) {
                pre.textContent = 'error: ' + err.message;
                resBox.style.display = 'block';
            } finally {
                loader.style.display = 'none';
            }
        }

        function copyCurl(btn) {
            const code = btn.parentElement.querySelector('code').textContent;
            navigator.clipboard.writeText(code);
            btn.textContent = 'copied!';
            setTimeout(() => btn.textContent = 'copy', 2000);
        }

        async function fetchServerLogs() {
            try {
                const res = await fetch('/logs/raw?lines=80');
                const text = await res.text();
                const term = document.getElementById('log-terminal');
                if (term) {
                    term.textContent = text || 'No logs recorded yet.';
                    term.scrollTop = term.scrollHeight;
                }
            } catch (err) {}
        }
        let logInterval = setInterval(fetchServerLogs, 2000);
        function toggleAutoLogs() {
            const cb = document.getElementById('auto-logs');
            if (cb.checked) {
                if (!logInterval) logInterval = setInterval(fetchServerLogs, 2000);
            } else {
                clearInterval(logInterval);
                logInterval = null;
            }
        }
        fetchServerLogs();
    </script>
</body>
</html>"""
