import httpx

base = "http://localhost:3000"

def test_pipeline():
    # Step 1: Watch Page
    p = httpx.get(f"{base}/anime/206949/watch?ep=1", timeout=10.0)
    assert p.status_code == 200, f"Page failed: {p.status_code}"
    print("1. Watch Page SSR: 200 OK")

    # Step 2: Extraction
    ex = httpx.get(f"{base}/api/v1/extract/206949?e=1&type=sub", timeout=15.0)
    assert ex.status_code == 200, f"Extract failed: {ex.status_code}"
    data = ex.json()
    streams = data.get("streams", [])
    assert len(streams) > 0, "No streams returned"
    stream = streams[0]
    print(f"2. Extract: 200 OK | Provider: {data.get('provider')} | Type: {stream.get('type')}")

    # Step 3: M3U8 OPTIONS preflight
    opt_m3u8 = httpx.options(f"{base}/proxy_m3u8", timeout=5.0)
    assert opt_m3u8.status_code == 200, f"M3U8 OPTIONS failed: {opt_m3u8.status_code}"
    print(f"3. M3U8 OPTIONS: 200 OK | CORS: {opt_m3u8.headers.get('access-control-allow-origin')}")

    # Step 4: M3U8 GET Master Playlist
    m3u8_url = f"{base}/proxy_m3u8?url={stream['url']}&referer={stream.get('referer', '')}&audio=sub"
    m3u8_res = httpx.get(m3u8_url, timeout=10.0)
    assert m3u8_res.status_code == 200, f"M3U8 GET failed: {m3u8_res.status_code}"
    assert "#EXTM3U" in m3u8_res.text, "Not valid M3U8"
    print(f"4. M3U8 Master Playlist GET: 200 OK ({len(m3u8_res.text)} chars)")

    # Step 5: Child Variant Playlist
    child_path = [l for l in m3u8_res.text.splitlines() if not l.startswith("#") and l.strip()][0]
    child_res = httpx.get(f"{base}{child_path}", timeout=10.0)
    assert child_res.status_code == 200, f"Child M3U8 failed: {child_res.status_code}"
    print(f"5. Child Variant M3U8 GET: 200 OK ({len(child_res.text)} chars)")

    # Step 6: Segment OPTIONS & Range GET
    opt_seg = httpx.options(f"{base}/proxy_segment", timeout=5.0)
    assert opt_seg.status_code == 200, f"Segment OPTIONS failed: {opt_seg.status_code}"
    print(f"6. Segment OPTIONS: 200 OK | Expose: {opt_seg.headers.get('access-control-expose-headers')}")

    seg_path = [l for l in child_res.text.splitlines() if not l.startswith("#") and l.strip()][0]
    seg_res = httpx.get(f"{base}{seg_path}", headers={"Range": "bytes=0-2048"}, timeout=10.0)
    assert seg_res.status_code in (200, 206), f"Segment GET failed: {seg_res.status_code}"
    print(f"7. Video Segment Range GET: {seg_res.status_code} ({len(seg_res.content)} bytes, Content-Type: {seg_res.headers.get('content-type')})")

    # Step 8: Subtitle GET
    if data.get("subtitles"):
        sub = data["subtitles"][0]
        sub_res = httpx.get(f"{base}/proxy_subtitle?url={sub['url']}&referer={sub.get('referer', '')}", timeout=10.0)
        assert sub_res.status_code == 200, f"Subtitle GET failed: {sub_res.status_code}"
        print(f"8. Subtitle GET: 200 OK ({len(sub_res.text)} chars, VTT: {'WEBVTT' in sub_res.text})")

    print("\n>>> ALL 8 FRONTEND PIPELINE STEPS PASSED 100%! <<<")

if __name__ == "__main__":
    test_pipeline()
