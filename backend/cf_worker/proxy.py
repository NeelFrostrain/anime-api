import re
from urllib.parse import urlparse, quote, urljoin
import httpx
from fastapi import APIRouter, Query, Request
from fastapi.responses import Response, PlainTextResponse, StreamingResponse

from src.config import HEADERS
from src.logger import log_info, log_warn, log_error

router = APIRouter(tags=["Stream Proxy"])

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
            timeout=httpx.Timeout(connect=5.0, read=12.0, write=10.0, pool=15.0),
            limits=httpx.Limits(max_keepalive_connections=100, max_connections=150, keepalive_expiry=120.0),
            verify=False,
            follow_redirects=True,
        )
    return _proxy_client

async def close_proxy_client():
    global _proxy_client
    if _proxy_client and not _proxy_client.is_closed:
        await _proxy_client.aclose()


def safe_urljoin(base: str, path: str) -> str:
    stripped = (path or "").strip()
    if not stripped:
        return base
    if stripped.startswith("http://") or stripped.startswith("https://"):
        return stripped
    try:
        return urljoin(base, stripped)
    except Exception:
        pass
    try:
        safe_b = base.replace("[", "%5B").replace("]", "%5D")
        safe_p = stripped.replace("[", "%5B").replace("]", "%5D")
        return urljoin(safe_b, safe_p)
    except Exception:
        pass
    if stripped.startswith("/"):
        parts = base.split("://", 1)
        if len(parts) == 2:
            host = parts[1].split("/", 1)[0]
            return f"{parts[0]}://{host}{stripped}"
    base_dir = base.rsplit("/", 1)[0]
    return f"{base_dir}/{stripped}"


def _resolve_headers_for_url(url: str, referer: str = ""):
    h = HEADERS.copy()
    lower_url = url.lower()
    if "animegg" in lower_url or "vidcache" in lower_url:
        referer = "https://www.animegg.org/"
    elif "nexabloom" in lower_url or "megaplay" in lower_url:
        referer = "https://megaplay.buzz/"
    elif "savedly" in lower_url or "echovideo" in lower_url:
        referer = referer or "https://play.echovideo.ru/"
    elif "advancedairesearchlab" in lower_url or "habibikun" in lower_url:
        referer = referer or "https://krussdomi.com/"
    elif "xin-cdn" in lower_url:
        referer = referer or "https://anizone.to/"
    elif not referer:
        if "flixcloud" in lower_url or "megacloud" in lower_url:
            referer = "https://megacloud.tv/"
        elif "rabbitstream" in lower_url:
            referer = "https://rabbitstream.net/"
        elif "vid-cdn" in lower_url or "anizone" in lower_url:
            referer = "https://anizone.to/"
        elif "forestcdn" in lower_url or "reanime" in lower_url:
            referer = "https://reanime.to/"
        elif "krussdomi" in lower_url:
            referer = "https://krussdomi.com/"
        elif "roburnt" in lower_url or "vidplay" in lower_url:
            referer = "https://vidplay.online/"
        elif "animeonsen" in lower_url:
            referer = "https://animeonsen.xyz/"
        elif "kaas" in lower_url or "kickassanime" in lower_url:
            referer = "https://kickassanime.mx/"
        elif "vizcloud" in lower_url:
            referer = "https://vizcloud2.ru/"

    if referer:
        h["Referer"] = referer
        try:
            p = urlparse(referer)
            if p.scheme and p.netloc:
                h["Origin"] = f"{p.scheme}://{p.netloc}"
        except Exception:
            pass
    return h, referer


@router.get("/proxy_m3u8")
async def proxy_m3u8(url: str, referer: str = "", audio: str = "sub"):
    url = _norm_url(url)
    if not url:
        return Response(
            content='{"detail":"bad proxy url"}',
            status_code=400,
            media_type="application/json"
        )
    audio = (audio or "sub").lower()
    try:
        client = get_proxy_client()
        h, referer = _resolve_headers_for_url(url, referer)

        log_info(f"Fetching m3u8 playlist ({audio}): {url[:85]}", tag="PROXY")
        resp = await client.get(url, headers=h)
        if resp.status_code != 200:
            log_warn(f"Upstream m3u8 returned status {resp.status_code} for {url[:85]}", tag="PROXY")
            return Response(content=resp.content, status_code=resp.status_code, media_type="text/plain")

        content = resp.text
        if not content.strip().startswith('#') and '#EXTM3U' not in content:
            log_warn(f"Upstream returned non-m3u8/encrypted payload for {url[:85]}", tag="PROXY")
            return Response(
                content='{"detail":"Upstream returned encrypted or invalid m3u8 playlist"}',
                status_code=502,
                media_type="application/json"
            )
        lines = []

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
                    sub_url = safe_urljoin(url, media_uri_match.group(1))
                    proxied_sub = f"/proxy_m3u8?url={quote(sub_url, safe='')}&referer={quote(referer, safe='')}&audio={quote(audio, safe='')}"
                    media_line = media_line.replace(f'URI="{media_uri_match.group(1)}"', f'URI="{proxied_sub}"')
                lines.append(media_line)
                continue

            if stripped.startswith('#EXT-X-KEY'):
                key_match = re.search(r'URI="([^"]+)"', stripped)
                if key_match:
                    key_url = safe_urljoin(url, key_match.group(1))
                    proxied_key = f"/proxy_segment?url={quote(key_url, safe='')}&referer={quote(referer, safe='')}&audio={quote(audio, safe='')}"
                    line = stripped.replace(f'URI="{key_match.group(1)}"', f'URI="{proxied_key}"')
                lines.append(line)
                continue

            if not stripped.startswith('#'):
                absolute_url = safe_urljoin(url, stripped)
                if is_variant or '.m3u8' in stripped:
                    line = f"/proxy_m3u8?url={quote(absolute_url, safe='')}&referer={quote(referer, safe='')}&audio={quote(audio, safe='')}"
                else:
                    line = f"/proxy_segment?url={quote(absolute_url, safe='')}&referer={quote(referer, safe='')}&audio={quote(audio, safe='')}"
                is_variant = False

            lines.append(line)

        log_info(f"M3U8 proxied successfully ({len(lines)} lines parsed)", tag="PROXY")
        resp_headers = {
            "Content-Type": "application/vnd.apple.mpegurl",
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
            "Cache-Control": "public, max-age=60",
        }
        return Response(content='\n'.join(lines), media_type="application/vnd.apple.mpegurl", headers=resp_headers)
    except Exception as e:
        log_error(f"Error fetching m3u8: {e}", tag="PROXY", exc=e)
        return Response(content=f'{{"detail":"proxy_m3u8 error: {str(e)}"}}', status_code=502, media_type="application/json")


@router.api_route("/proxy_segment", methods=["GET", "HEAD"])
async def proxy_segment(request: Request, url: str, referer: str = "", audio: str = "sub"):
    url = _norm_url(url)
    if not url:
        return Response(
            content='{"detail":"bad proxy url"}',
            status_code=400,
            media_type="application/json"
        )
    try:
        client = get_proxy_client()
        h, referer = _resolve_headers_for_url(url, referer)

        # Forward client byte range request for smooth scrubbing and seeking
        client_range = request.headers.get("range")
        if client_range:
            h["Range"] = client_range

        # Follow redirects up to 5 hops, preserving domain-specific referer headers across CDNs
        upstream_resp = None
        for _ in range(5):
            req = client.build_request("GET", url, headers=h)
            upstream_resp = await client.send(req, stream=True)
            if upstream_resp.status_code in (301, 302, 303, 307, 308):
                location = upstream_resp.headers.get("location")
                if not location:
                    break
                url = urljoin(url, location)
                await upstream_resp.aclose()
                h, referer = _resolve_headers_for_url(url, referer)
                if client_range:
                    h["Range"] = client_range
            else:
                break

        if upstream_resp is None:
            return Response(content=b"", status_code=502, headers={"Access-Control-Allow-Origin": "*"})

        if upstream_resp.status_code == 403:
            log_warn(f"Upstream segment 403 Forbidden: {url[:85]}", tag="PROXY")
        elif upstream_resp.status_code not in (200, 206):
            log_warn(f"Upstream segment status {upstream_resp.status_code}: {url[:85]}", tag="PROXY")

        content_type = upstream_resp.headers.get("content-type", "")
        if "mp4" in url.lower() or "video/mp4" in content_type:
            media_type = "video/mp4"
        elif "webm" in url.lower() or "video/webm" in content_type:
            media_type = "video/webm"
        elif "apple.mpegurl" in content_type or url.endswith(".m3u8"):
            body = await upstream_resp.aread()
            await upstream_resp.aclose()
            if body.startswith(b"#EXTM3U"):
                return await proxy_m3u8(url, referer, audio=audio)
            return Response(content=body, status_code=upstream_resp.status_code, media_type="text/plain")
        else:
            media_type = "video/mp2t"

        resp_headers = {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
            "Access-Control-Expose-Headers": "Content-Range, Content-Length, Accept-Ranges",
            "Accept-Ranges": "bytes",
        }
        if "content-length" in upstream_resp.headers:
            resp_headers["Content-Length"] = upstream_resp.headers["content-length"]
        if "content-range" in upstream_resp.headers:
            resp_headers["Content-Range"] = upstream_resp.headers["content-range"]

        if request.method == "HEAD":
            await upstream_resp.aclose()
            return Response(status_code=upstream_resp.status_code, media_type=media_type, headers=resp_headers)

        async def stream_generator():
            try:
                async for chunk in upstream_resp.aiter_bytes(chunk_size=65536):
                    yield chunk
            finally:
                await upstream_resp.aclose()

        return StreamingResponse(
            stream_generator(),
            status_code=upstream_resp.status_code,
            media_type=media_type,
            headers=resp_headers,
        )
    except (httpx.RequestError, httpx.HTTPError) as e:
        log_warn(f"Network error fetching segment ({url[:60]}): {e}", tag="PROXY")
        return Response(content=b"", status_code=502, headers={"Access-Control-Allow-Origin": "*"})
    except Exception as e:
        log_warn(f"Unexpected error fetching segment ({url[:60]}): {e}", tag="PROXY")
        return Response(content=b"", status_code=500, headers={"Access-Control-Allow-Origin": "*"})


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


@router.get("/proxy_subtitle")
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
        h, referer = _resolve_headers_for_url(url, referer)
        resp = await client.get(url, headers=h)
        if resp.status_code != 200:
            log_warn(f"Upstream subtitle status {resp.status_code}: {url[:85]}", tag="PROXY")
            return Response(content="WEBVTT\n\n", status_code=200, media_type="text/vtt; charset=utf-8", headers={"Access-Control-Allow-Origin": "*"})

        text = resp.text
        vtt_output = _process_subtitle_content(text, offset=offset, speed=speed)
        log_info(f"Subtitle proxied ({len(vtt_output)} bytes, offset={offset}s, speed={speed}x): {url[:70]}", tag="PROXY")
        resp_headers = {
            "Content-Type": "text/vtt; charset=utf-8",
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
            "Cache-Control": "public, max-age=3600",
        }
        return Response(content=vtt_output, status_code=200, media_type="text/vtt; charset=utf-8", headers=resp_headers)
    except (httpx.RequestError, httpx.HTTPError) as e:
        log_warn(f"Subtitle source unreachable ({url[:60]}): {e}", tag="PROXY")
        return Response(content="WEBVTT\n\n", status_code=200, media_type="text/vtt; charset=utf-8", headers={"Access-Control-Allow-Origin": "*"})
    except Exception as e:
        log_warn(f"Error processing subtitle: {e}", tag="PROXY")
        return Response(content="WEBVTT\n\n", status_code=200, media_type="text/vtt; charset=utf-8", headers={"Access-Control-Allow-Origin": "*"})
