// Cloudflare Worker Edge Stream & Subtitle Proxy

function resolveReferer(url: string, explicitReferer?: string | null): string {
  if (explicitReferer && explicitReferer.trim()) return explicitReferer.trim();
  const lower = url.toLowerCase();
  if (lower.includes("animegg") || lower.includes("vidcache")) return "https://www.animegg.org/";
  if (lower.includes("nexabloom") || lower.includes("megaplay")) return "https://megaplay.buzz/";
  if (lower.includes("echovideo") || lower.includes("savedly")) return "https://play.echovideo.ru/";
  if (
    lower.includes("advancedairesearchlab") ||
    lower.includes("habibikun") ||
    lower.includes("babybayw") ||
    lower.includes("narutokun") ||
    lower.includes("krussdomi")
  ) {
    return "https://krussdomi.com/";
  }
  if (lower.includes("xin-cdn")) return "https://anizone.to/";
  if (lower.includes("flixcloud") || lower.includes("megacloud")) return "https://megacloud.tv/";
  if (lower.includes("rabbitstream")) return "https://rabbitstream.net/";
  if (lower.includes("vid-cdn") || lower.includes("anizone")) return "https://anizone.to/";
  if (lower.includes("forestcdn") || lower.includes("reanime")) return "https://reanime.to/";
  if (lower.includes("krussdomi")) return "https://krussdomi.com/";
  if (lower.includes("roburnt") || lower.includes("vidplay")) return "https://vidplay.online/";
  if (lower.includes("animeonsen")) return "https://animeonsen.xyz/";
  if (lower.includes("kaas") || lower.includes("kickassanime")) return "https://kickassanime.mx/";
  if (lower.includes("vizcloud")) return "https://vizcloud2.ru/";
  return "";
}

function resolveOrigin(referer: string): string {
  try {
    const u = new URL(referer);
    return u.origin;
  } catch {
    return "";
  }
}

// Rewrites M3U8 manifest content so chunks and nested playlists route through this proxy
export function rewriteM3u8(manifest: string, baseUrl: string, referer: string, origin: string): string {
  const lines = manifest.split(/\r?\n/);
  const rewrittenLines: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    // Preserve empty lines
    if (!line) {
      rewrittenLines.push("");
      continue;
    }

    // URI tags inside tags, e.g. #EXT-X-KEY:METHOD=...,URI="..."
    if (line.startsWith("#")) {
      if (line.includes('URI="')) {
        const rewrittenTag = line.replace(/URI="([^"]+)"/, (_, uri) => {
          try {
            const absoluteUri = new URL(uri, baseUrl).href;
            const isSubManifest = absoluteUri.includes(".m3u8") || uri.includes(".m3u8");
            const proxied = isSubManifest
              ? `${origin}/proxy_m3u8?url=${encodeURIComponent(absoluteUri)}&referer=${encodeURIComponent(referer)}`
              : `${origin}/proxy_segment?url=${encodeURIComponent(absoluteUri)}&referer=${encodeURIComponent(referer)}`;
            return `URI="${proxied}"`;
          } catch {
            return `URI="${uri}"`;
          }
        });
        rewrittenLines.push(rewrittenTag);
      } else {
        rewrittenLines.push(line);
      }
      continue;
    }

    // URL line (variant stream or media chunk)
    try {
      const absoluteUrl = new URL(line, baseUrl).href;
      const isSubManifest = absoluteUrl.includes(".m3u8") || line.includes(".m3u8");

      if (isSubManifest) {
        rewrittenLines.push(
          `${origin}/proxy_m3u8?url=${encodeURIComponent(absoluteUrl)}&referer=${encodeURIComponent(referer)}`
        );
      } else {
        rewrittenLines.push(
          `${origin}/proxy_segment?url=${encodeURIComponent(absoluteUrl)}&referer=${encodeURIComponent(referer)}`
        );
      }
    } catch {
      rewrittenLines.push(line);
    }
  }

  return rewrittenLines.join("\n");
}

// Convert ASS/SSA subtitles to WebVTT format
export function convertAssToVtt(assContent: string, offsetSeconds = 0, speedMultiplier = 1.0): string {
  const lines = assContent.split(/\r?\n/);
  const vttLines: string[] = ["WEBVTT", ""];
  let inEvents = false;
  let formatKeys: string[] = [];

  const parseAssTime = (timeStr: string): number => {
    // 0:01:23.45 -> total seconds
    const parts = timeStr.trim().split(":");
    if (parts.length < 3) return 0;
    const hours = parseFloat(parts[0]) || 0;
    const minutes = parseFloat(parts[1]) || 0;
    const seconds = parseFloat(parts[2]) || 0;
    return hours * 3600 + minutes * 60 + seconds;
  };

  const formatVttTime = (totalSeconds: number): string => {
    let s = Math.max(0, totalSeconds);
    const hours = Math.floor(s / 3600);
    s %= 3600;
    const minutes = Math.floor(s / 60);
    const seconds = s % 60;
    const wholeSecs = Math.floor(seconds);
    const ms = Math.floor((seconds - wholeSecs) * 1000);
    return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(wholeSecs).padStart(2, "0")}.${String(ms).padStart(3, "0")}`;
  };

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith("[Events]")) {
      inEvents = true;
      continue;
    }
    if (trimmed.startsWith("[") && trimmed.endsWith("]") && !trimmed.startsWith("[Events]")) {
      inEvents = false;
      continue;
    }

    if (inEvents) {
      if (trimmed.startsWith("Format:")) {
        formatKeys = trimmed
          .substring(7)
          .split(",")
          .map((k) => k.trim().toLowerCase());
        continue;
      }

      if (trimmed.startsWith("Dialogue:")) {
        const rawValues = trimmed.substring(9).trim();
        const parts = rawValues.split(",");
        if (parts.length >= formatKeys.length) {
          const startIdx = formatKeys.indexOf("start");
          const endIdx = formatKeys.indexOf("end");
          const textIdx = formatKeys.indexOf("text");

          const startStr = parts[startIdx] || "0:00:00.00";
          const endStr = parts[endIdx] || "0:00:00.00";
          // Text might contain commas
          const textStr = parts.slice(textIdx >= 0 ? textIdx : formatKeys.length - 1).join(",");

          let startSec = (parseAssTime(startStr) + offsetSeconds) / speedMultiplier;
          let endSec = (parseAssTime(endStr) + offsetSeconds) / speedMultiplier;

          if (startSec < 0) startSec = 0;
          if (endSec <= startSec) endSec = startSec + 1;

          // Clean ASS markup: {\an8}, \N, etc.
          let cleanText = textStr
            .replace(/\{[^}]+\}/g, "")
            .replace(/\\N/g, "\n")
            .replace(/\\n/g, "\n")
            .replace(/\\h/g, " ")
            .trim();

          if (cleanText) {
            vttLines.push(`${formatVttTime(startSec)} --> ${formatVttTime(endSec)}`);
            vttLines.push(cleanText);
            vttLines.push("");
          }
        }
      }
    }
  }

  // Fallback if not ASS or empty
  if (vttLines.length <= 2) {
    if (assContent.startsWith("WEBVTT")) {
      return assContent;
    }
    vttLines.push("00:00:01.000 --> 00:00:05.000");
    vttLines.push("Subtitles enabled");
    vttLines.push("");
  }

  return vttLines.join("\n");
}

export async function handleM3u8Proxy(
  url: string,
  refererParam: string | null,
  workerOrigin: string
): Promise<Response> {
  const referer = resolveReferer(url, refererParam);
  const origin = resolveOrigin(referer);
  const headers: Record<string, string> = {
    "User-Agent":
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
    Accept: "*/*",
    "Accept-Language": "en-US,en;q=0.9",
    "Sec-Fetch-Dest": "empty",
    "Sec-Fetch-Mode": "cors",
    "Sec-Fetch-Site": "cross-site",
  };
  if (referer) {
    headers["Referer"] = referer;
  }
  if (origin) {
    headers["Origin"] = origin;
  }

  let upstreamRes = await fetch(url, { headers });
  if (!upstreamRes.ok && (upstreamRes.status === 429 || upstreamRes.status === 503)) {
    await new Promise((r) => setTimeout(r, 600));
    upstreamRes = await fetch(url, { headers });
  }

  if (!upstreamRes.ok) {
    return new Response(`Upstream manifest failed with status ${upstreamRes.status}`, {
      status: upstreamRes.status,
      headers: { "Access-Control-Allow-Origin": "*" },
    });
  }

  const manifestText = await upstreamRes.text();
  if (!manifestText.includes("#EXTM3U")) {
    return new Response(manifestText, {
      status: 200,
      headers: {
        "Content-Type": "text/plain",
        "Access-Control-Allow-Origin": "*",
      },
    });
  }

  const rewritten = rewriteM3u8(manifestText, url, referer, workerOrigin);

  return new Response(rewritten, {
    status: 200,
    headers: {
      "Content-Type": "application/vnd.apple.mpegurl",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "*",
      "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
      "Cache-Control": "public, max-age=10",
    },
  });
}

export async function handleSegmentProxy(
  url: string,
  refererParam: string | null,
  clientRequest: Request
): Promise<Response> {
  const referer = resolveReferer(url, refererParam);
  const origin = resolveOrigin(referer);
  const headers: Record<string, string> = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
    Accept: "*/*",
  };
  if (referer) {
    headers["Referer"] = referer;
  }
  if (origin) {
    headers["Origin"] = origin;
  }

  // Forward Range header if client requested range (for seeking in mp4/ts)
  const rangeHeader = clientRequest.headers.get("Range");
  if (rangeHeader) {
    headers["Range"] = rangeHeader;
  }

  const upstreamRes = await fetch(url, { headers });

  const responseHeaders = new Headers();
  responseHeaders.set("Access-Control-Allow-Origin", "*");
  responseHeaders.set("Access-Control-Allow-Headers", "*");
  responseHeaders.set("Access-Control-Allow-Methods", "GET, HEAD, OPTIONS");

  const contentType = upstreamRes.headers.get("Content-Type") || "video/MP2T";
  responseHeaders.set("Content-Type", contentType);

  const contentLength = upstreamRes.headers.get("Content-Length");
  if (contentLength) responseHeaders.set("Content-Length", contentLength);

  const contentRange = upstreamRes.headers.get("Content-Range");
  if (contentRange) responseHeaders.set("Content-Range", contentRange);

  if (!upstreamRes.ok) {
    responseHeaders.set("Cache-Control", "no-store, no-cache, must-revalidate");
  } else {
    responseHeaders.set("Cache-Control", "public, max-age=86400, immutable");
  }

  return new Response(upstreamRes.body, {
    status: upstreamRes.status,
    headers: responseHeaders,
  });
}

export async function handleSubtitleProxy(
  url: string,
  offsetSeconds = 0,
  speedMultiplier = 1.0,
  refererParam?: string | null
): Promise<Response> {
  const referer = resolveReferer(url, refererParam);
  const origin = resolveOrigin(referer);
  const headers: Record<string, string> = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
    Accept: "*/*",
  };
  if (referer) {
    headers["Referer"] = referer;
  }
  if (origin) {
    headers["Origin"] = origin;
  }

  try {
    const upstreamRes = await fetch(url, { headers });
    if (!upstreamRes.ok) {
      // Fallback clean WebVTT so player subtitle track does not trigger 403/404 error
      return new Response("WEBVTT\n\n", {
        status: 200,
        headers: {
          "Content-Type": "text/vtt; charset=utf-8",
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Headers": "*",
        },
      });
    }

    const rawSubtitle = await upstreamRes.text();
    const vtt = convertAssToVtt(rawSubtitle, offsetSeconds, speedMultiplier);

    return new Response(vtt, {
      status: 200,
      headers: {
        "Content-Type": "text/vtt; charset=utf-8",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "*",
        "Cache-Control": "public, max-age=86400",
      },
    });
  } catch {
    return new Response("WEBVTT\n\n", {
      status: 200,
      headers: {
        "Content-Type": "text/vtt; charset=utf-8",
        "Access-Control-Allow-Origin": "*",
      },
    });
  }
}
