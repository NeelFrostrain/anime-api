import { NextRequest, NextResponse } from "next/server";
import { anilist } from "@/lib/anilist";

const BACKEND_URL =
  process.env.BACKEND_URL ||
  process.env.INTERNAL_API_URL?.replace(/\/api\/v1\/?$/, "") ||
  "https://anime-api.neelofficial0812.workers.dev";

// Proxy non-AniList requests directly to the backend (Cloudflare Worker or local)
async function proxyToBackend(req: NextRequest, slug: string[]) {
  const targetUrl = new URL(
    `/api/v1/${slug.join("/")}${req.nextUrl.search}`,
    BACKEND_URL
  );

  const forwardHeaders = new Headers();
  req.headers.forEach((value, key) => {
    const lower = key.toLowerCase();
    // Do NOT forward host, connection, or accept-encoding so fetch handles encoding properly
    if (!["host", "connection", "accept-encoding"].includes(lower)) {
      forwardHeaders.set(key, value);
    }
  });

  const fetchOptions: RequestInit = {
    method: req.method,
    headers: forwardHeaders,
    redirect: "manual",
  };

  if (req.method !== "GET" && req.method !== "HEAD") {
    try {
      fetchOptions.body = await req.arrayBuffer();
    } catch {}
  }

  try {
    const backendRes = await fetch(targetUrl.toString(), fetchOptions);
    const contentType = backendRes.headers.get("content-type") || "";

    // For JSON responses, parse and return clean JSON via NextResponse.json
    if (contentType.includes("application/json")) {
      const data = await backendRes.json();
      return NextResponse.json(data, {
        status: backendRes.status,
        statusText: backendRes.statusText,
      });
    }

    // For non-JSON (e.g. text or proxy streams), stream cleanly
    const resHeaders = new Headers();
    backendRes.headers.forEach((value, key) => {
      const lower = key.toLowerCase();
      if (!["content-encoding", "content-length", "transfer-encoding"].includes(lower)) {
        resHeaders.set(key, value);
      }
    });

    const body = await backendRes.text();
    return new NextResponse(body, {
      status: backendRes.status,
      statusText: backendRes.statusText,
      headers: resHeaders,
    });
  } catch (err: any) {
    console.error(`[API Proxy Error] Failed to reach backend at ${targetUrl.toString()}:`, err);
    return NextResponse.json(
      { error: "BackendUnavailable", message: err.message || "Failed to reach backend service" },
      { status: 502 }
    );
  }
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string[] }> }
) {
  const { slug } = await params;
  if (!slug || slug.length === 0) {
    return NextResponse.json({ error: "NotFound" }, { status: 404 });
  }

  const category = slug[0];
  const subPath = slug.slice(1).join("/");
  const searchParams = req.nextUrl.searchParams;

  // 1. Backend services: proxy to Cloudflare Worker
  if (
    category === "auth" ||
    category === "user" ||
    category === "extract" ||
    category === "episodes" ||
    category === "providers"
  ) {
    return proxyToBackend(req, slug);
  }

  // 2. AniList Anime Discovery & Metadata: handled directly via Node.js
  try {
    if (category === "anime") {
      const page = parseInt(searchParams.get("page") || "1", 10);
      const perPage = parseInt(searchParams.get("perPage") || "24", 10);

      if (subPath === "spotlight") return NextResponse.json(await anilist.getSpotlight());
      if (subPath === "trending") return NextResponse.json(await anilist.getTrending(page, perPage));
      if (subPath === "popular") return NextResponse.json(await anilist.getPopular(page, perPage));
      if (subPath === "top-rated") return NextResponse.json(await anilist.getTopRated(page, perPage));
      if (subPath === "top-airing") return NextResponse.json(await anilist.getTopAiring(page, perPage));
      if (subPath === "upcoming") return NextResponse.json(await anilist.getUpcoming(page, perPage));
      if (subPath === "just-finished") return NextResponse.json(await anilist.getJustFinished(page, perPage));
      if (subPath === "top-movies") return NextResponse.json(await anilist.getTopMovies(page, perPage));
      if (subPath === "seasonal") {
        const year = searchParams.get("year") ? parseInt(searchParams.get("year")!, 10) : undefined;
        const season = searchParams.get("season") || undefined;
        return NextResponse.json(await anilist.getSeasonal(year, season, page, perPage));
      }
      if (subPath === "filter") {
        const paramsObj: Record<string, any> = {};
        searchParams.forEach((v, k) => {
          paramsObj[k] = v;
        });
        return NextResponse.json(await anilist.filterAnime(paramsObj));
      }
      if (subPath === "genres") return NextResponse.json(await anilist.getGenres());
      if (subPath === "tags") return NextResponse.json(await anilist.getTags());
      if (subPath === "random") return NextResponse.json(await anilist.getRandomAnime());

      // Detailed item endpoints: /anime/:id or /anime/:id/:sub
      const pathParts = slug.slice(1);
      const animeId = pathParts[0];
      const detailSub = pathParts[1];

      if (animeId && !detailSub) {
        return NextResponse.json(await anilist.getAnimeDetail(animeId));
      }
      if (animeId && detailSub === "characters") {
        return NextResponse.json(await anilist.getAnimeCharacters(animeId, page, perPage));
      }
      if (animeId && detailSub === "staff") {
        return NextResponse.json(await anilist.getAnimeStaff(animeId, page, perPage));
      }
      if (animeId && detailSub === "relations") {
        return NextResponse.json(await anilist.getAnimeRelations(animeId));
      }
      if (animeId && detailSub === "recommendations") {
        return NextResponse.json(await anilist.getAnimeRecommendations(animeId, page, perPage));
      }
      if (animeId && detailSub === "episodes") {
        return NextResponse.json(await anilist.getAnimeEpisodes(animeId));
      }
      if (animeId && detailSub === "reviews") {
        return NextResponse.json(await anilist.getAnimeReviews(animeId));
      }
    }

    if (category === "search") {
      const q = searchParams.get("q") || searchParams.get("query") || "";
      const page = parseInt(searchParams.get("page") || "1", 10);
      const perPage = parseInt(searchParams.get("perPage") || "24", 10);

      if (subPath === "suggestions") {
        return NextResponse.json(await anilist.getSuggestions(q));
      }
      return NextResponse.json(await anilist.search(q, page, perPage));
    }

    if (category === "suggestions") {
      const q = searchParams.get("q") || searchParams.get("query") || "";
      return NextResponse.json(await anilist.getSuggestions(q));
    }

    if (category === "filter") {
      const paramsObj: Record<string, any> = {};
      searchParams.forEach((v, k) => {
        paramsObj[k] = v;
      });
      return NextResponse.json(await anilist.filterAnime(paramsObj));
    }

    if (category === "schedule") {
      if (subPath === "week") {
        return NextResponse.json(await anilist.getWeekSchedule());
      }
      const date = searchParams.get("date") || undefined;
      const tz = searchParams.get("tz") || undefined;
      return NextResponse.json(await anilist.getSchedule(date, tz));
    }

    if (category === "genres") {
      return NextResponse.json({ genres: await anilist.getGenres() });
    }

    if (category === "random") {
      return NextResponse.json(await anilist.getRandomAnime());
    }

    if (category === "character" && subPath) {
      return NextResponse.json(await anilist.getCharacter(subPath));
    }

    if (category === "staff" && subPath) {
      return NextResponse.json(await anilist.getStaff(subPath));
    }

    if (category === "studio" && subPath) {
      const page = parseInt(searchParams.get("page") || "1", 10);
      const perPage = parseInt(searchParams.get("perPage") || "24", 10);
      return NextResponse.json(await anilist.getStudio(subPath, page, perPage));
    }
  } catch (err: any) {
    console.error(`[API Error in ${slug.join("/")}]:`, err);
    return NextResponse.json(
      { error: "InternalError", message: err.message || "An error occurred fetching data" },
      { status: 500 }
    );
  }

  // Fallback: proxy to backend
  return proxyToBackend(req, slug);
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string[] }> }
) {
  const { slug } = await params;
  return proxyToBackend(req, slug);
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string[] }> }
) {
  const { slug } = await params;
  return proxyToBackend(req, slug);
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string[] }> }
) {
  const { slug } = await params;
  return proxyToBackend(req, slug);
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string[] }> }
) {
  const { slug } = await params;
  return proxyToBackend(req, slug);
}
