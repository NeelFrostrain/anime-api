async function extractReanimeStreams(anilistId, episode, audio) {
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
    const data = await res.json();
    if (!data?.success || !Array.isArray(data.servers) || data.servers.length === 0) {
      return null;
    }

    const targetAudio = (audio || "sub").toLowerCase();
    const filtered = data.servers.filter((s) => {
      const dt = (s.dataType || "").toLowerCase();
      return targetAudio === "dub" ? dt.includes("dub") : dt.includes("sub") || dt === "";
    });

    const toUse = filtered.length > 0 ? filtered : data.servers;

    let subtitles = [];
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
            const seen = new Set();
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

    const streams = toUse.map((s) => ({
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
  } catch (e) {
    return null;
  }
}

async function test() {
  const ids = [213094, 97940, 189046];
  for (const id of ids) {
    const res = await extractReanimeStreams(id, 1, "sub");
    console.log(`ID ${id}: streams=${res?.streams?.length}, subtitles=${res?.subtitles?.length}`);
    if (res?.streams?.length) {
      console.log(`  Stream: ${res.streams[0].server} -> ${res.streams[0].url}`);
    }
  }
}
test();
