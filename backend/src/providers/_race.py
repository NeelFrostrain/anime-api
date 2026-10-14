import asyncio
import importlib
import time

from src.providers._media import build_ctx
from src.logger import log_info, log_debug, log_warn

RANKING = [
    "anizone", "kaa", "anineko", "aniwaves", "anikoto",
    "reanime", "animegg", "animeonsen", "mkissa", "anibd", "miruro",
]

WATCH_TIMEOUT = 18.0
EPISODES_TIMEOUT = 25.0
WATCH_CACHE_TTL = 300.0

_latency: dict = {}
_ep_latency: dict = {}
_failures: dict = {}
_watch_cache: dict = {}


def _load(name):
    try:
        return importlib.import_module(f"src.providers.{name}")
    except Exception as e:
        log_warn(f"Provider {name} unavailable: {e}", tag="RACE")
        return None


def providers():
    mods = []
    for name in RANKING:
        mod = _load(name)
        if mod is not None:
            mods.append((name, mod))
    return mods


def record_latency(name: str, seconds: float, ok: bool, kind: str = "watch"):
    table = _latency if kind == "watch" else _ep_latency
    if ok:
        prev = table.get(name)
        table[name] = seconds if prev is None else round(0.7 * prev + 0.3 * seconds, 3)
        _failures[name] = 0
    else:
        _failures[name] = _failures.get(name, 0) + 1


def default_provider():
    if not _latency:
        return RANKING[0]
    return sorted(_latency.items(), key=lambda kv: kv[1])[0][0]


def latency_table() -> dict:
    return {name: {"avg_seconds": _latency.get(name),
                   "episodes_seconds": _ep_latency.get(name),
                   "failures": _failures.get(name, 0)}
            for name in RANKING}


async def _watch_one(mod, name, anilist_id, ep, audio, ctx):
    key = (name, anilist_id, ep, audio)
    hit = _watch_cache.get(key)
    if hit and hit[0] > time.time():
        has_stream = any(s.get("type") in ("hls", "mp4") for s in hit[1])
        return name, hit[1], 0.0, True, has_stream
    t0 = time.time()
    try:
        streams = await asyncio.wait_for(mod.watch(anilist_id, audio, ep, ctx), WATCH_TIMEOUT)
        dt = round(time.time() - t0, 3)
        if streams:
            # Immediately merge any discovered subtitles into the global cache
            raw_subs = merge_subtitles(streams)
            if raw_subs:
                cache_key = (anilist_id, ep)
                existing = _SUBTITLE_CACHE.get(cache_key, (0, []))[1]
                _SUBTITLE_CACHE[cache_key] = (time.time(), merge_subtitles([{"subtitles": existing + raw_subs}]))

            valid_streams = [
                s for s in streams
                if isinstance(s, dict)
                and "nukitashi.top" not in s.get("url", "")
                and "flixcloud.cc" not in s.get("url", "")
            ]
            if valid_streams:
                has_stream = any(s.get("type") in ("hls", "mp4") for s in valid_streams)
                _watch_cache[key] = (time.time() + WATCH_CACHE_TTL, valid_streams)
                return name, valid_streams, dt, True, has_stream
            elif raw_subs or any(s.get("embed") for s in streams if isinstance(s, dict)):
                _watch_cache[key] = (time.time() + WATCH_CACHE_TTL, streams)
                return name, streams, dt, True, False
        return name, None, dt, False, False
    except Exception as e:
        return name, None, round(time.time() - t0, 3), False, False


_SUBTITLE_CACHE: dict = {}


async def get_episode_subtitles(anilist_id: int, ep: int, ctx: dict | None = None) -> list:
    """Fetch external subtitles across providers (reanime, anizone, anikoto, animeonsen, miruro) with caching."""
    cache_key = (anilist_id, ep)
    now = time.time()
    if cache_key in _SUBTITLE_CACHE:
        ts, cached_subs = _SUBTITLE_CACHE[cache_key]
        if now - ts < 600 and cached_subs:
            return cached_subs

    ctx = ctx or await build_ctx(anilist_id)
    mods_dict = dict(providers())
    target_names = [n for n in ["reanime", "anizone", "anikoto", "animeonsen", "miruro"] if n in mods_dict]
    if not target_names:
        return []

    tasks = [asyncio.create_task(_watch_one(mods_dict[n], n, anilist_id, ep, "sub", ctx)) for n in target_names]
    subs = []
    try:
        done, pending = await asyncio.wait(tasks, timeout=4.5)
        for t in done:
            try:
                _, streams, _, ok, _ = t.result()
                if streams:
                    subs.extend(merge_subtitles(streams))
            except Exception:
                pass
        for p in pending:
            p.cancel()
    except Exception:
        pass

    normalized = merge_subtitles([{"subtitles": subs}])
    if normalized:
        _SUBTITLE_CACHE[cache_key] = (now, normalized)
    return normalized


async def race_watch(anilist_id: int, ep: int, audio: str = "sub",
                     preferred: str | None = None) -> dict | None:
    mods = providers()
    if not mods:
        return None
    ctx = await build_ctx(anilist_id)
    if preferred:
        pick = next((m for m in mods if m[0] == preferred), None)
        if pick is not None:
            name, streams, dt, ok, has_stream = await _watch_one(pick[1], pick[0], anilist_id, ep, audio, ctx)
            record_latency(name, dt, ok)
            if ok:
                subs = merge_subtitles(streams)
                if not subs and audio == "sub":
                    subs = await get_episode_subtitles(anilist_id, ep, ctx)
                for s in streams:
                    if isinstance(s, dict) and not s.get("subtitles"):
                        s["subtitles"] = subs
                return {"provider": name, "streams": streams,
                        "requestedProvider": preferred,
                        "subtitles": subs,
                        "timings": {name: {"seconds": dt, "ok": True}},
                        "defaultProvider": default_provider()}
            mods = [m for m in mods if m[0] != preferred]
            if not mods:
                return None
    log_info(f"Racing {len(mods)} providers for AniList ID {anilist_id} Ep {ep} ({audio})", tag="RACE")
    pending = {asyncio.ensure_future(_watch_one(mod, name, anilist_id, ep, audio, ctx))
               for name, mod in mods}
    timings: dict = {}
    winner = None
    embed_fallback = None
    collected_subs = []
    try:
        while pending:
            done, pending = await asyncio.wait(pending, return_when=asyncio.FIRST_COMPLETED)
            for task in done:
                name, streams, dt, ok, has_stream = task.result()
                timings[name] = {"seconds": dt, "ok": ok}
                record_latency(name, dt, ok)
                if ok and streams:
                    task_subs = merge_subtitles(streams)
                    if task_subs:
                        collected_subs.extend(task_subs)
                    if has_stream and winner is None:
                        winner = {"provider": name, "streams": streams}
                    elif embed_fallback is None:
                        embed_fallback = {"provider": name, "streams": streams}

            # Once we find a winner with real HLS video, check if we need subtitles
            if winner is not None:
                winner_subs = merge_subtitles(winner.get("streams") or [])
                # If winner has no subtitles and pending tasks remain, give up to 1.8s for pending subtitle providers
                if not winner_subs and pending and audio == "sub":
                    try:
                        done2, pending = await asyncio.wait(pending, timeout=1.8)
                        for t in done2:
                            try:
                                s_name, s_streams, s_dt, s_ok, _ = t.result()
                                timings[s_name] = {"seconds": s_dt, "ok": s_ok}
                                record_latency(s_name, s_dt, s_ok)
                                if s_ok and s_streams:
                                    s_subs = merge_subtitles(s_streams)
                                    if s_subs:
                                        collected_subs.extend(s_subs)
                            except Exception:
                                pass
                    except Exception:
                        pass
                break
    finally:
        # If no real video winner was found yet, wait for pending tasks with real streams before embed fallback
        if winner is None and pending:
            try:
                end_time = asyncio.get_running_loop().time() + 5.0
                while pending and winner is None and asyncio.get_running_loop().time() < end_time:
                    rem_time = max(0.2, end_time - asyncio.get_running_loop().time())
                    done2, pending = await asyncio.wait(pending, timeout=rem_time, return_when=asyncio.FIRST_COMPLETED)
                    if not done2:
                        break
                    for task in done2:
                        try:
                            name, streams, dt, ok, has_stream = task.result()
                            timings[name] = {"seconds": dt, "ok": ok}
                            record_latency(name, dt, ok)
                            if ok and streams:
                                task_subs = merge_subtitles(streams)
                                if task_subs:
                                    collected_subs.extend(task_subs)
                                if winner is None and has_stream:
                                    winner = {"provider": name, "streams": streams}
                                elif embed_fallback is None:
                                    embed_fallback = {"provider": name, "streams": streams}
                        except Exception:
                            pass
            except Exception:
                pass
        # Cancel all remaining background tasks immediately
        for task in pending:
            task.cancel()
    if winner is None and embed_fallback is not None:
        winner = embed_fallback
    if winner is None:
        log_info(f"No winning provider found for AniList {anilist_id} Ep {ep}", tag="RACE")
        return None
    log_info(f"Winner '{winner['provider']}' won race with {len(winner['streams'])} streams", tag="RACE")
    winner["timings"] = timings
    winner["defaultProvider"] = default_provider()
    if preferred:
        winner["requestedProvider"] = preferred

    final_subs = merge_subtitles([{"subtitles": merge_subtitles(winner["streams"]) + collected_subs}])
    if not final_subs and audio == "sub":
        final_subs = await get_episode_subtitles(anilist_id, ep, ctx)
    winner["subtitles"] = final_subs
    for s in winner.get("streams") or []:
        if isinstance(s, dict) and not s.get("subtitles"):
            s["subtitles"] = final_subs
    return winner




async def _episodes_one(mod, name, anilist_id, ctx):
    t0 = time.time()
    try:
        data = await asyncio.wait_for(mod.get_episodes(anilist_id, ctx), EPISODES_TIMEOUT)
        eps = (data.get("episodes") or {})
        count = sum(len(v) for v in eps.values() if isinstance(v, list))
        record_latency(name, time.time() - t0, count > 0, kind="episodes")
        return name, data if count > 0 else None
    except Exception:
        record_latency(name, time.time() - t0, False, kind="episodes")
        return name, None


async def merged_episodes(anilist_id: int) -> dict | None:
    mods = providers()
    if not mods:
        return None
    ctx = await build_ctx(anilist_id)
    results = await asyncio.gather(
        *[_episodes_one(mod, name, anilist_id, ctx) for name, mod in mods])
    merged = {name: data for name, data in results if data}
    if not merged:
        return None
    return {"anilistId": anilist_id, "source": "native", "providers": merged}


def merge_subtitles(streams: list) -> list:
    seen, out = set(), []
    for s in streams or []:
        for sub in s.get("subtitles") or []:
            if isinstance(sub, str):
                sub = {"url": sub, "label": "Subtitle", "srclang": "en"}
            if not isinstance(sub, dict):
                continue
            url = sub.get("url") or sub.get("file") or sub.get("src")
            if not url or url in seen:
                continue
            seen.add(url)
            label = (
                sub.get("label")
                or sub.get("title")
                or sub.get("name")
                or sub.get("lang")
                or sub.get("language")
                or "Subtitle"
            )
            raw_lang = (sub.get("srclang") or sub.get("language") or sub.get("lang") or label or "en").lower()
            if any(x in raw_lang for x in ["eng", "dialogue", "signs", "full sub", "dubtitle"]):
                srclang = "en"
            elif any(x in raw_lang for x in ["spa", "esp"]):
                srclang = "es"
            elif any(x in raw_lang for x in ["ara", "arb"]):
                srclang = "ar"
            elif any(x in raw_lang for x in ["fra", "fre"]):
                srclang = "fr"
            elif any(x in raw_lang for x in ["ger", "deu"]):
                srclang = "de"
            elif any(x in raw_lang for x in ["por", "prt"]):
                srclang = "pt"
            elif any(x in raw_lang for x in ["ita"]):
                srclang = "it"
            elif any(x in raw_lang for x in ["rus"]):
                srclang = "ru"
            else:
                srclang = raw_lang[:2] if len(raw_lang) >= 2 else "en"

            sub_format = sub.get("format") or ("vtt" if ".vtt" in url.lower() else "srt" if ".srt" in url.lower() else "ass" if ".ass" in url.lower() else "vtt")
            referer = sub.get("referer") or s.get("referer") or ""
            if not referer:
                lower_url = url.lower()
                if "forestcdn.top" in lower_url or "rundowncdn.top" in lower_url:
                    referer = "https://reanime.to/"
                elif "vid-cdn.xyz" in lower_url or "xin-cdn.xyz" in lower_url:
                    referer = "https://anizone.to/"
                elif "broforgotsave.online" in lower_url:
                    referer = "https://anikoto.to/"
                elif "krussdomi" in lower_url:
                    referer = "https://kaa.si/"
                elif "miruro" in lower_url:
                    referer = "https://www.miruro.bz/"

            out.append({
                "url": url,
                "label": label,
                "srclang": srclang,
                "lang": srclang,
                "language": label,
                "format": sub_format,
                "default": bool(sub.get("default")),
                "referer": referer,
            })
    return out


def providers_status() -> dict:
    return {
        "defaultProvider": default_provider(),
        "ranking": RANKING,
        "available": [name for name, _ in providers()],
        "latency": latency_table(),
    }
