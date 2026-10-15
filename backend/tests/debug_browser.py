import asyncio
import subprocess
import json
import httpx
import websockets
import time

CHROME_PATH = r"C:\Program Files\Google\Chrome\Application\chrome.exe"

async def debug_page():
    # Start Chrome with remote debugging
    cmd = [
        CHROME_PATH,
        "--headless=new",
        "--remote-debugging-port=9222",
        "--remote-allow-origins=*",
        "--disable-gpu",
        "--no-sandbox",
        "--autoplay-policy=no-user-gesture-required",
        "about:blank",
    ]
    proc = subprocess.Popen(cmd)
    try:
        await asyncio.sleep(2)
        # Get WebSocket debugger URL
        r = httpx.get("http://localhost:9222/json")
        pages = r.json()
        ws_url = pages[0]["webSocketDebuggerUrl"]
        print(f"Connected to Chrome CDP: {ws_url}")

        ws_url = ws_url.replace("localhost", "127.0.0.1")
        async with websockets.connect(ws_url, additional_headers={"Host": "localhost:9222"}) as ws:
            msg_id = 1

            async def send(method, params=None):
                nonlocal msg_id
                m = {"id": msg_id, "method": method, "params": params or {}}
                msg_id += 1
                await ws.send(json.dumps(m))
                return m["id"]

            await send("Console.enable")
            await send("Runtime.enable")
            await send("Network.enable")
            await send("Page.enable")

            # Navigate
            print("Navigating to http://localhost:3000/anime/206949/watch?ep=1 ...")
            await send("Page.navigate", {"url": "http://localhost:3000/anime/206949/watch?ep=1"})

            # Collect events for 12 seconds
            start_time = time.time()
            while time.time() - start_time < 12:
                try:
                    res_raw = await asyncio.wait_for(ws.recv(), timeout=1.0)
                    event = json.loads(res_raw)
                    method = event.get("method", "")
                    params = event.get("params", {})

                    if method == "Runtime.consoleAPICalled":
                        log_type = params.get("type")
                        args = [str(a.get("value", a.get("description", ""))) for a in params.get("args", [])]
                        print(f"[CONSOLE {log_type.upper()}]: {' '.join(args)}")

                    elif method == "Runtime.exceptionThrown":
                        details = params.get("exceptionDetails", {})
                        text = details.get("text", "")
                        exc = details.get("exception", {}).get("description", "")
                        print(f"[EXCEPTION]: {text} {exc}")

                    elif method == "Network.responseReceived":
                        resp = params.get("response", {})
                        u = resp.get("url", "")
                        status = resp.get("status")
                        if any(k in u for k in ["extract", "proxy", "m3u8", "ts", "watch"]):
                            print(f"[NETWORK {status}]: {u[:100]}")

                    elif method == "Network.loadingFailed":
                        u = params.get("url", "")
                        err = params.get("errorText", "")
                        print(f"[NETWORK FAILED]: {u[:100]} Error: {err}")

                except asyncio.TimeoutError:
                    continue
                except Exception as e:
                    print(f"Event read error: {e}")
                    break

            # Check video element state in page
            eval_id = await send("Runtime.evaluate", {
                "expression": "(() => { const v = document.querySelector('video'); const ifr = document.querySelector('iframe'); return { hasVideo: !!v, videoSrc: v ? v.src : null, paused: v ? v.paused : null, readyState: v ? v.readyState : null, currentTime: v ? v.currentTime : null, error: v && v.error ? v.error.message || v.error.code : null, hasIframe: !!ifr, iframeSrc: ifr ? ifr.src : null }; })()",
                "returnByValue": True
            })
            while True:
                res_raw = await asyncio.wait_for(ws.recv(), timeout=2.0)
                res = json.loads(res_raw)
                if res.get("id") == eval_id:
                    print("\n=== DOM VIDEO STATE ===")
                    print(json.dumps(res.get("result", {}).get("value", {}), indent=2))
                    break

    finally:
        proc.terminate()

if __name__ == "__main__":
    asyncio.run(debug_page())
