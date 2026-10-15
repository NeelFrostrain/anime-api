async function test() {
  const alRes = await fetch("https://graphql.anilist.co", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      query: `query MediaSearch($id: Int) {
        Media(id: $id) {
          id
          title { english romaji native }
          synonyms
          format
          episodes
          status
        }
      }`,
      variables: { id: 213094 },
    }),
  });
  const data = await alRes.json();
  console.log("AniList data:", JSON.stringify(data.data.Media, null, 2));

  // Let's also check Python local backend for 213094
  try {
    const pyRes = await fetch("http://127.0.0.1:8000/api/v1/extract/213094?e=1&type=sub");
    const pyData = await pyRes.json();
    console.log("Python backend streams:", pyData.streams ? pyData.streams.length : "none", pyData);
  } catch (e) {
    console.log("Python backend error:", e.message);
  }
}
test();
