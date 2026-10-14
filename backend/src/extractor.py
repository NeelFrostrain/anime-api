import httpx
from fastapi import HTTPException
from src.config import ANILIST_URL, iter_miruro_pipe_targets
from src.parser import encode_pipe_request, decode_pipe_response, deep_translate
from src.logger import log_info, log_warn


_ANILIST_CACHE: dict = {}


async def anilist_query(query: str, variables: dict = None):
    import time
    import json
    import asyncio

    clean_query = query.strip()
    var_str = json.dumps(variables or {}, sort_keys=True)
    cache_key = (clean_query, var_str)
    now = time.time()

    if cache_key in _ANILIST_CACHE:
        ts, cached_data = _ANILIST_CACHE[cache_key]
        if now - ts < 1800:
            return cached_data

    try:
        from backend.app.services.anilist import anilist_client
        return await anilist_client.execute_query(query, variables or {})
    except Exception:
        pass

    body = {"query": query}
    if variables:
        body["variables"] = variables

    headers = {
        "Content-Type": "application/json",
        "Accept": "application/json",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
    }

    for attempt in range(2):
        try:
            async with httpx.AsyncClient(timeout=8.0) as client:
                res = await client.post(ANILIST_URL, json=body, headers=headers)
                if res.status_code == 200:
                    data = res.json().get("data", {})
                    if data:
                        _ANILIST_CACHE[cache_key] = (now, data)
                    return data
                elif res.status_code == 429:
                    if cache_key in _ANILIST_CACHE:
                        return _ANILIST_CACHE[cache_key][1]
                    await asyncio.sleep(1.0)
                else:
                    break
        except Exception:
            if cache_key in _ANILIST_CACHE:
                return _ANILIST_CACHE[cache_key][1]
            if attempt == 0:
                await asyncio.sleep(0.5)

    if cache_key in _ANILIST_CACHE:
        return _ANILIST_CACHE[cache_key][1]

    raise HTTPException(status_code=500, detail="anilist query failed")


async def fetch_raw_episodes(anilist_id: int) -> dict:
    payload = {
        "path": "episodes",
        "method": "GET",
        "query": {"anilistId": anilist_id},
        "body": None,
        "version": "0.1.0",
    }
    encoded_req = encode_pipe_request(payload)

    async with httpx.AsyncClient(timeout=3.5) as client:
        last_status = None
        for pipe_target, headers in iter_miruro_pipe_targets(encoded_req):
            log_info(f"Executing pipe for raw episodes: {pipe_target[:85]}", tag="PIPE")
            try:
                res = await client.get(pipe_target, headers=headers)
                last_status = res.status_code
                if res.status_code == 200:
                    data = decode_pipe_response(res.text.strip())
                    deep_translate(data)
                    return data
            except Exception as e:
                log_warn(f"Failed to connect to {pipe_target[:85]}: {e}", tag="PIPE")

        raise HTTPException(status_code=last_status or 502, detail="pipe request failed")
