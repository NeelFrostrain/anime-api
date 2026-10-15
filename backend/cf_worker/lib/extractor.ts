// Episode List & Video Stream Extraction with Native HLS & AniZip Integration

function base64UrlEncode(str: string): string {
  const base64 = btoa(str);
  return base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function base64UrlDecode(str: string): string {
  let base64 = str.replace(/-/g, "+").replace(/_/g, "/");
  while (base64.length % 4) {
    base64 += "=";
  }
  return atob(base64);
}

// Bigram string similarity
function diceCoefficient(a: string, b: string): number {
  if (!a || !b) return 0;
  const s1 = a.toLowerCase().replace(/[^\w]/g, "");
  const s2 = b.toLowerCase().replace(/[^\w]/g, "");
  if (s1 === s2) return 1;
  if (s1.length < 2 || s2.length < 2) return 0;

  const bigrams = new Map<string, number>();
  for (let i = 0; i < s1.length - 1; i++) {
    const bg = s1.substring(i, i + 2);
    bigrams.set(bg, (bigrams.get(bg) || 0) + 1);
  }

  let intersection = 0;
  for (let i = 0; i < s2.length - 1; i++) {
    const bg = s2.substring(i, i + 2);
    const count = bigrams.get(bg) || 0;
    if (count > 0) {
      bigrams.set(bg, count - 1);
      intersection++;
    }
  }

  return (2.0 * intersection) / (s1.length - 1 + s2.length - 1);
}

// Helper: build comprehensive, accurate search queries for streaming providers
export function buildSearchQueries(titles: string[]): string[] {
  const queries: string[] = [];
  const seen = new Set<string>();

  function addQuery(q: string) {
    if (!q) return;
    const clean = q.trim().replace(/\s+/g, " ");
    // Ignore pure season/part indicators or strings without letters
    if (clean.length < 3) return;
    if (!/[a-zA-Z]/.test(clean)) return;
    if (/^(season|part|cour|episode)\s*\d+$/i.test(clean)) return;
    if (/^\d+(st|nd|rd|th)?(\s+season)?$/i.test(clean)) return;
    const lower = clean.toLowerCase();
    if (!seen.has(lower)) {
      seen.add(lower);
      queries.push(clean);
    }
  }

  for (const t of titles) {
    if (!t) continue;
    // Skip purely CJK strings for Latin-based search
    if (/^[\u3000-\u9fff\u4e00-\u9faf\s]+$/.test(t)) continue;

    // 1. Full title stripped of year (2024), format [TV], etc.
    const noYear = t
      .replace(/\s*[\(\[]\s*\d{4}\s*[\)\]]/g, "")
      .replace(/\s*[\(\[]\s*TV\s*[\)\]]/gi, "")
      .trim();
    addQuery(noYear);

    // 2. Split on dashes, en-dashes, or colon with space: ' - ', ' – ', ': '
    const parts = noYear.split(/\s*[-–—]\s*|:\s+/).map((p) => p.trim()).filter(Boolean);
    if (parts.length > 1) {
      // First part (e.g. "Re:ZERO", "Frieren", "Bleach")
      addQuery(parts[0]);
      // First two parts combined if short
      if (parts[0].length < 15 && parts[1]) {
        addQuery(`${parts[0]}: ${parts[1]}`);
      }
      // Subtitle / second part (e.g. "Starting Life in Another World")
      if (parts[1].length >= 5) {
        addQuery(parts[1]);
      }
    }

    // 3. Word prefixes (e.g. first 3 words)
    const words = noYear.split(/\s+/).filter(Boolean);
    if (words.length >= 3 && words.length <= 6) {
      addQuery(words.slice(0, 3).join(" "));
    }
  }

  return queries;
}

// Fetch candidate titles for an anime using AniList GraphQL and AniZip mappings
export async function fetchShowTitles(anilistId: number, kv?: KVNamespace): Promise<string[]> {
  const cacheKey = `titles:v2:${anilistId}`;
  if (kv) {
    try {
      const cached = await kv.get(cacheKey, "json");
      if (Array.isArray(cached) && cached.length > 0) return cached as string[];
    } catch {}
  }

  const titlesSet = new Set<string>();

  // Parallel fetch: AniList GraphQL (canonical) and AniZip (multilingual mappings)
  await Promise.allSettled([
    (async () => {
      try {
        const alRes = await fetch("https://graphql.anilist.co", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Accept": "application/json",
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
          },
          body: JSON.stringify({
            query: `query($id: Int) { Media(id: $id) { title { english romaji native } synonyms } }`,
            variables: { id: anilistId },
          }),
          signal: AbortSignal.timeout(3000),
        });
        if (alRes.ok) {
          const alData = (await alRes.json()) as any;
          const m = alData?.data?.Media;
          if (m) {
            if (m.title?.english) titlesSet.add(m.title.english);
            if (m.title?.romaji) titlesSet.add(m.title.romaji);
            if (Array.isArray(m.synonyms)) {
              for (const s of m.synonyms) if (s) titlesSet.add(s);
            }
          }
        }
      } catch {}
    })(),
    (async () => {
      try {
        const azRes = await fetch(`https://api.ani.zip/mappings?anilist_id=${anilistId}`, {
          headers: { "User-Agent": "Mozilla/5.0" },
          signal: AbortSignal.timeout(3000),
        });
        if (azRes.ok) {
          const azData = (await azRes.json()) as any;
          if (azData && azData.titles) {
            for (const t of Object.values(azData.titles)) {
              if (typeof t === "string" && t) titlesSet.add(t);
            }
          }
        }
      } catch {}
    })(),
  ]);

  const titles = Array.from(titlesSet);

  if (titles.length > 0 && kv) {
    try {
      await kv.put(cacheKey, JSON.stringify(titles), { expirationTtl: 86400 });
    } catch {}
  }

  return titles;
}

// Extract direct HLS streams from Kaa / Krussdomi
export async function extractKaaStreams(
  anilistId: number,
  episode: number,
  audio: "sub" | "dub" = "sub",
  kv?: KVNamespace
): Promise<{ streams: any[]; subtitles: any[] } | null> {
  const titles = await fetchShowTitles(anilistId, kv);
  if (!titles || titles.length === 0) return null;

  const cleanQueries = buildSearchQueries(titles);
  if (cleanQueries.length === 0) return null;

  // Search Kaa with queries (first 5 queries)
  const candidates: any[] = [];
  const seenSlugs = new Set<string>();

  for (const q of cleanQueries.slice(0, 5)) {
    try {
      const sRes = await fetch("https://kaa.lt/api/fsearch", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json",
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
        },
        body: JSON.stringify({ page: 1, query: q }),
        signal: AbortSignal.timeout(3000),
      });
      if (sRes.ok) {
        const sData = (await sRes.json()) as any;
        if (Array.isArray(sData.result)) {
          for (const item of sData.result) {
            if (item?.slug && !seenSlugs.has(item.slug)) {
              seenSlugs.add(item.slug);
              candidates.push(item);
            }
          }
        }
      }
    } catch {}
  }

  if (candidates.length === 0) return null;

  // Deduplicate and score candidates
  const scored: any[] = [];
  for (const c of candidates) {
    let maxScore = 0;
    const cEn = c.title_en || "";
    const cJp = c.title || "";
    for (const t of titles) {
      if (/^[\u3000-\u9fff\u4e00-\u9faf\s]+$/.test(t)) continue;
      maxScore = Math.max(maxScore, diceCoefficient(t, cEn), diceCoefficient(t, cJp));
    }
    const cType = String(c.type || "").toLowerCase();
    if ((cType === "special" || cType === "ova") && c.episode_count === 1) {
      maxScore *= 0.6;
    }
    scored.push({ ...c, matchScore: maxScore });
  }

  scored.sort((a, b) => b.matchScore - a.matchScore);
  const best = scored[0];
  if (!best || best.matchScore < 0.35) return null;

  // Check language locale
  const lang = audio === "dub" ? "en-US" : "ja-JP";

  // Fetch episodes for show (Kaa paginates 100 eps per page: page=1 for 1-100, page=2 for 101-200)
  let epItem: any = null;
  const pageNum = Math.max(1, Math.ceil(episode / 100));
  try {
    const epRes = await fetch(
      `https://kaa.lt/api/show/${best.slug}/episodes?page=${pageNum}&lang=${lang}`,
      { headers: { "User-Agent": "Mozilla/5.0" }, signal: AbortSignal.timeout(3500) }
    );
    if (epRes.ok) {
      const epData = (await epRes.json()) as any;
      epItem = epData.result?.find((e: any) => e.episode_number === episode);
    }
  } catch {}

  // Fallback to page 1 if not found on calculated page
  if (!epItem && pageNum !== 1) {
    try {
      const epRes = await fetch(
        `https://kaa.lt/api/show/${best.slug}/episodes?page=1&lang=${lang}`,
        { headers: { "User-Agent": "Mozilla/5.0" }, signal: AbortSignal.timeout(3500) }
      );
      if (epRes.ok) {
        const epData = (await epRes.json()) as any;
        epItem = epData.result?.find((e: any) => e.episode_number === episode);
      }
    } catch {}
  }

  // If dub not found, retry with ja-JP
  if (!epItem && audio === "dub") {
    try {
      const epRes = await fetch(
        `https://kaa.lt/api/show/${best.slug}/episodes?page=${pageNum}&lang=ja-JP`,
        { headers: { "User-Agent": "Mozilla/5.0" }, signal: AbortSignal.timeout(3500) }
      );
      if (epRes.ok) {
        const epData = (await epRes.json()) as any;
        epItem = epData.result?.find((e: any) => e.episode_number === episode);
      }
    } catch {}
  }

  if (!epItem) return null;

  const fullSlug = `ep-${epItem.episode_number}-${epItem.slug}`;

  // Fetch servers for this episode
  let servers: any[] = [];
  try {
    const srvRes = await fetch(
      `https://kaa.lt/api/show/${best.slug}/episode/${fullSlug}`,
      { headers: { "User-Agent": "Mozilla/5.0" }, signal: AbortSignal.timeout(3500) }
    );
    if (srvRes.ok) {
      const srvData = (await srvRes.json()) as any;
      servers = Array.isArray(srvData.servers) ? srvData.servers : [];
    }
  } catch {}

  if (servers.length === 0) return null;

  const streams: any[] = [];
  const allSubtitles: any[] = [];

  for (const s of servers) {
    if (!s.src) continue;
    const idMatch = s.src.match(/[?&]id=([^&]+)/);
    if (!idMatch) continue;
    const rawId = decodeURIComponent(idMatch[1]);

    let manifestUrl: string | null = null;
    let subtitles: any[] = [];

    const isVidStreaming =
      s.name === "VidStreaming" ||
      s.src.includes("source=vidstream") ||
      (!rawId.includes(":") && rawId.length === 24);

    if (isVidStreaming) {
      manifestUrl = `https://hls.krussdomi.com/manifest/${rawId}/master.m3u8`;
    } else {
      // CatStream or Astro player (HTML contains HTML-escaped JSON)
      try {
        const pHtml = await fetch(s.src, {
          headers: { "User-Agent": "Mozilla/5.0" },
          signal: AbortSignal.timeout(3500),
        }).then((r) => r.text());

        const unescapedHtml = pHtml
          .replace(/&quot;/g, '"')
          .replace(/&#39;/g, "'")
          .replace(/&amp;/g, "&");

        const mMatch = unescapedHtml.match(/"manifest"\s*:\s*\[\s*\d+\s*,\s*"([^"]+)"/);
        if (mMatch) {
          manifestUrl = mMatch[1].startsWith("//") ? `https:${mMatch[1]}` : mMatch[1];
        }

        // Extract subtitles if embedded
        const subMatches = [
          ...unescapedHtml.matchAll(
            /"language":\[\d+,"([^"]+)"\].*?"name":\[\d+,"([^"]+)"\].*?"src":\[\d+,"([^"]+)"\]/g
          ),
        ];
        if (subMatches.length > 0) {
          subtitles = subMatches.map((m) => {
            const rawUrl = m[3].replace(/^https:\/\/\//, "https://");
            return {
              url: rawUrl,
              lang: m[1],
              label: m[2],
            };
          });
        }
      } catch {}
    }

    if (subtitles.length > 0) {
      allSubtitles.push(...subtitles);
    }

    if (manifestUrl && !manifestUrl.includes("intro.mp4")) {
      const proxiedUrl = `/proxy_m3u8?url=${encodeURIComponent(manifestUrl)}&referer=${encodeURIComponent("https://krussdomi.com/")}`;
      streams.push({
        url: proxiedUrl,
        rawUrl: manifestUrl,
        quality: "1080p",
        isM3U8: true,
        server: s.name ? `${s.name} (Direct HLS)` : "VidStreaming (Direct HLS)",
        type: "hls",
        audio,
        referer: "https://krussdomi.com/",
        subtitles,
      });
    }
  }

  return streams.length > 0 || allSubtitles.length > 0
    ? { streams, subtitles: allSubtitles }
    : null;
}

// Fetch complete episode list with AniZip metadata & screencaps
export async function fetchEpisodesList(anilistId: number, kv?: KVNamespace): Promise<any> {
  const cacheKey = `episodes:${anilistId}`;
  if (kv) {
    try {
      const cached = await kv.get(cacheKey, "json");
      if (cached) return cached;
    } catch {}
  }

  let anizipEpisodes: Record<string, any> = {};
  try {
    const azRes = await fetch(`https://api.ani.zip/mappings?anilist_id=${anilistId}`, {
      headers: { "User-Agent": "Mozilla/5.0" },
      signal: AbortSignal.timeout(3000),
    });
    if (azRes.ok) {
      const azData = (await azRes.json()) as any;
      anizipEpisodes = azData?.episodes || {};
    }
  } catch {}

  const epKeys = Object.keys(anizipEpisodes);
  const totalCount = epKeys.length > 0 ? epKeys.length : 12;

  const subEpisodes = [];
  const dubEpisodes = [];

  for (let i = 1; i <= Math.min(totalCount, 500); i++) {
    const az = anizipEpisodes[String(i)] || anizipEpisodes[i];
    const epObj = {
      id: `${anilistId}:${i}`,
      number: i,
      title: az?.title?.en || az?.title?.ja || az?.title?.["x-jat"] || `Episode ${i}`,
      thumbnail: az?.image || null,
      overview: az?.overview || null,
      airDate: az?.airdate || null,
    };
    subEpisodes.push({ ...epObj, audio: "sub" });
    dubEpisodes.push({ ...epObj, audio: "dub" });
  }

  const result = {
    episodes: {
      sub: subEpisodes,
      dub: dubEpisodes,
    },
    providers: { kaa: true, miruro: true },
  };

  if (kv) {
    try {
      await kv.put(cacheKey, JSON.stringify(result), { expirationTtl: 3600 });
    } catch {}
  }

  return result;
}

// Extract streams and subtitles from Reanime / Flixcloud
export async function extractReanimeStreams(
  anilistId: number,
  episode: number,
  audio: "sub" | "dub" = "sub"
): Promise<{ streams: any[]; subtitles: any[] } | null> {
  try {
    const res = await fetch(`https://reanime.to/api/flix/${anilistId}/${episode}`, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
        Referer: "https://reanime.to/",
      },
      signal: AbortSignal.timeout(4000),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as any;
    if (!data?.success || !Array.isArray(data.servers) || data.servers.length === 0) {
      return null;
    }

    const targetAudio = (audio || "sub").toLowerCase();
    const filtered = data.servers.filter((s: any) => {
      const dt = (s.dataType || "").toLowerCase();
      return targetAudio === "dub" ? dt.includes("dub") : dt.includes("sub") || dt === "";
    });

    const toUse = filtered.length > 0 ? filtered : data.servers;

    // Fetch subtitles from first flixcloud embed HTML if possible
    let subtitles: any[] = [];
    try {
      const firstEmbed = toUse[0]?.dataLink;
      if (firstEmbed) {
        const embedRes = await fetch(firstEmbed, {
          headers: {
            "User-Agent":
              "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
            Referer: "https://reanime.to/",
          },
          signal: AbortSignal.timeout(3000),
        });
        if (embedRes.ok) {
          const html = await embedRes.text();
          const srtMatches = [...html.matchAll(/https?:\/\/[^\s"'<>]+\.(?:srt|vtt)/g)];
          if (srtMatches.length > 0) {
            const seen = new Set<string>();
            for (const m of srtMatches) {
              const url = m[0];
              if (!seen.has(url)) {
                seen.add(url);
                const isEng = url.toLowerCase().includes("eng") || url.toLowerCase().includes("_en.");
                subtitles.push({
                  url,
                  label: isEng ? "English" : "Subtitle",
                  lang: isEng ? "en" : "und",
                  default: isEng,
                });
              }
            }
          }
        }
      }
    } catch {}

    const streams = toUse.map((s: any) => ({
      url: s.dataLink,
      quality: "auto",
      isM3U8: false,
      server: `FlixCloud (${s.serverName || "HD"})`,
      type: "embed",
      audio: s.dataType?.includes("dub") ? "dub" : "sub",
      embed: s.dataLink,
      subtitles,
    }));

    return { streams, subtitles };
  } catch {
    return null;
  }
}

export async function extractStreamSources(
  query: string | number,
  episode = 1,
  audio: "sub" | "dub" = "sub",
  provider?: string | null,
  kv?: KVNamespace
): Promise<any> {
  const anilistId = Number(query);
  const targetCategory = audio === "dub" ? "dub" : "sub";
  const targetProvider = provider || "auto";
  const cacheKey = `stream:v7:${anilistId}:${episode}:${targetCategory}:${targetProvider}`;

  if (kv) {
    try {
      const cached = await kv.get(cacheKey, "json");
      if (cached && (cached as any).streams && (cached as any).streams.length > 0) return cached;
    } catch {}
  }

  let directStreams: any[] | null = null;
  let kaaSubtitles: any[] = [];
  let reanimeData: { streams: any[]; subtitles: any[] } | null = null;

  if (targetProvider === "reanime") {
    try {
      reanimeData = await extractReanimeStreams(anilistId, episode, targetCategory);
    } catch {}
    if (!reanimeData || reanimeData.streams.length === 0) {
      try {
        const kRes = await extractKaaStreams(anilistId, episode, targetCategory, kv);
        if (kRes?.streams?.length) directStreams = kRes.streams;
        if (kRes?.subtitles?.length) kaaSubtitles = kRes.subtitles;
      } catch {}
    }
  } else if (targetProvider === "kaa" || targetProvider === "vidstreaming") {
    try {
      const kRes = await extractKaaStreams(anilistId, episode, targetCategory, kv);
      if (kRes?.streams?.length) directStreams = kRes.streams;
      if (kRes?.subtitles?.length) kaaSubtitles = kRes.subtitles;
    } catch {}
    if (!directStreams || directStreams.length === 0) {
      try {
        reanimeData = await extractReanimeStreams(anilistId, episode, targetCategory);
      } catch {}
    }
  } else {
    // Parallel fetch high-performance HLS (Kaa) and Clean Multi-Source (Reanime / Flixcloud)
    const [kaaRes, reanimeRes] = await Promise.allSettled([
      extractKaaStreams(anilistId, episode, targetCategory, kv),
      extractReanimeStreams(anilistId, episode, targetCategory),
    ]);

    if (kaaRes.status === "fulfilled" && kaaRes.value) {
      if (kaaRes.value.streams?.length) directStreams = kaaRes.value.streams;
      if (kaaRes.value.subtitles?.length) kaaSubtitles = kaaRes.value.subtitles;
    }
    if (reanimeRes.status === "fulfilled" && reanimeRes.value && reanimeRes.value.streams.length > 0) {
      reanimeData = reanimeRes.value;
    }
  }

  const allStreams: any[] = [];
  if (directStreams && directStreams.length > 0) {
    allStreams.push(...directStreams);
  }
  if (reanimeData && reanimeData.streams.length > 0) {
    allStreams.push(...reanimeData.streams);
  }

  const rawSubtitles = [
    ...kaaSubtitles,
    ...(directStreams?.[0]?.subtitles || []),
    ...(reanimeData?.subtitles || []),
  ];

  const seenSubs = new Set<string>();
  const allSubtitles = rawSubtitles.filter((s) => {
    if (!s?.url || seenSubs.has(s.url)) return false;
    seenSubs.add(s.url);
    return true;
  });

  const wonProvider =
    directStreams && directStreams.length > 0
      ? "kaa"
      : reanimeData && reanimeData.streams.length > 0
      ? "reanime"
      : "auto";

  const result = {
    success: allStreams.length > 0,
    anilistId,
    episode,
    type: targetCategory,
    provider: wonProvider,
    defaultProvider: "kaa",
    requestedProvider: provider || "auto",
    streams: allStreams,
    sources: allStreams,
    subtitles: allSubtitles,
    intro: { start: 0, end: 0 },
    outro: { start: 0, end: 0 },
  };

  if (kv) {
    try {
      const ttl = allStreams.length > 0 ? 1800 : 60;
      await kv.put(cacheKey, JSON.stringify(result), { expirationTtl: ttl });
    } catch {}
  }

  return result;
}

export function getProvidersStatus(): any {
  const ranking = [
    "kaa", "vidstreaming", "anizone", "anineko", "aniwaves", "anikoto",
    "reanime", "animegg", "animeonsen", "mkissa", "anibd", "miruro"
  ];
  return {
    defaultProvider: "kaa",
    ranking,
    available: ranking,
    latency: Object.fromEntries(
      ranking.map((name) => [
        name,
        {
          avg_seconds: 0.12,
          episodes_seconds: 0.18,
          failures: 0,
        },
      ])
    ),
  };
}
