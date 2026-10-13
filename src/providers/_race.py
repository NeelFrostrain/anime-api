import asyncio
import importlib
import time

from src.providers._media import build_ctx
from src.logger import log_info, log_debug, log_warn

RANKING = [
    "aniwaves", "anikoto", "anizone", "kaa", "anineko",
    "animeonsen", "animegg", "mkissa", "anibd", "reanime",
]

WATCH_TIMEOUT = 75.0
EPISODES_TIMEOUT = 60.0
WATCH_CACHE_TTL = 45.0

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
        return name, None, dt, False, False
    except Exception as e:
        return name, None, round(time.time() - t0, 3), False, False


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
                return {"provider": name, "streams": streams,
                        "requestedProvider": preferred,
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
    try:
        while pending:
            done, pending = await asyncio.wait(pending, return_when=asyncio.FIRST_COMPLETED)
            for task in done:
                name, streams, dt, ok, has_stream = task.result()
                timings[name] = {"seconds": dt, "ok": ok}
                record_latency(name, dt, ok)
                if ok:
                    if has_stream and winner is None:
                        winner = {"provider": name, "streams": streams}
                    elif embed_fallback is None:
                        embed_fallback = {"provider": name, "streams": streams}
            # Once we find a winner with real HLS video, we can stop the race
            if winner is not None:
                break
    finally:
        if pending:
            try:
                done2, pending2 = await asyncio.wait(pending, timeout=6.0)
                for task in done2:
                    try:
                        name, streams, dt, ok, has_stream = task.result()
                        timings[name] = {"seconds": dt, "ok": ok}
                        record_latency(name, dt, ok)
                        if ok and winner is None and has_stream:
                            winner = {"provider": name, "streams": streams}
                    except Exception:
                        pass
                pending = pending2
            finally:
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
            url = sub.get("url")
            if url and url not in seen:
                seen.add(url)
                out.append(sub)
    return out


def providers_status() -> dict:
    return {
        "defaultProvider": default_provider(),
        "ranking": RANKING,
        "available": [name for name, _ in providers()],
        "latency": latency_table(),
    }
