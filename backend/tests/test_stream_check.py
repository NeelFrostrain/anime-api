import httpx
import sys

def test_anime(anime_id: int):
    url = f"http://localhost:3000/api/v1/extract/{anime_id}?e=1&type=sub"
    print(f"\n--- Testing Anime ID {anime_id} ---")
    try:
        r = httpx.get(url, timeout=20.0)
        if r.status_code != 200:
            print(f"FAILED with HTTP {r.status_code}: {r.text[:200]}")
            return False
        data = r.json()
        prov = data.get("provider")
        streams = data.get("streams", [])
        subs = data.get("subtitles", [])
        print(f"SUCCESS: Provider={prov}, Streams={len(streams)}, Subtitles={len(subs)}")
        if streams:
            first_s = streams[0]
            print(f"  First Stream: {first_s.get('server')} ({first_s.get('type')}) -> {first_s.get('url')[:60]}...")
            
            # Now test m3u8 proxy
            m3u8_test_url = f"http://localhost:3000/proxy_m3u8?url={first_s.get('url')}&referer={first_s.get('referer', '')}&audio=sub"
            pr = httpx.get(m3u8_test_url, timeout=15.0)
            print(f"  M3U8 Proxy: HTTP {pr.status_code} ({len(pr.text)} chars)")
            if pr.status_code == 200:
                print("  M3U8 Proxy verified working!")
        return True
    except Exception as e:
        print(f"EXCEPTION: {e}")
        return False

if __name__ == "__main__":
    for aid in [206949, 16498, 113415, 151807]:
        test_anime(aid)
