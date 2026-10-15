async function testFlixSubs() {
  const res = await fetch("https://flixcloud.cc/e/czo3i38er9ct?v=1", {
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
      "Referer": "https://reanime.to/",
    },
  });
  const html = await res.text();
  console.log("HTML length:", html.length);
  const srtMatches = [...html.matchAll(/https?:\/\/[^\s"'<>]+\.(?:srt|vtt)/g)];
  console.log("SRT/VTT found count:", srtMatches.length);
  srtMatches.slice(0, 5).forEach((m) => console.log("  ", m[0]));
}
testFlixSubs();
