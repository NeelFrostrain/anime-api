import httpx

UA = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
)

HTML_HEADERS = {
    "User-Agent": UA,
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9",
}


_client: httpx.AsyncClient | None = None


def get_client() -> httpx.AsyncClient:
    global _client
    if _client is None or _client.is_closed:
        _client = httpx.AsyncClient(
            timeout=20.0,
            limits=httpx.Limits(max_keepalive_connections=80, max_connections=120, keepalive_expiry=60.0),
            follow_redirects=True,
        )
    return _client


async def fetch_text(url: str, headers: dict | None = None, timeout: float = 20.0) -> str:
    h = dict(HTML_HEADERS)
    if headers:
        h.update(headers)
    client = get_client()
    res = await client.get(url, headers=h, timeout=timeout)
    if res.status_code != 200:
        raise RuntimeError(f"HTTP {res.status_code} fetching {url}")
    return res.text


async def fetch_json(url: str, headers: dict | None = None, timeout: float = 20.0):
    h = {"User-Agent": UA, "Accept": "application/json"}
    if headers:
        h.update(headers)
    client = get_client()
    res = await client.get(url, headers=h, timeout=timeout)
    if res.status_code != 200:
        raise RuntimeError(f"HTTP {res.status_code} fetching {url}")
    return res.json()
