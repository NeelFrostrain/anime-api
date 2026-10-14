import { Hono } from "hono";
import { Bindings } from "../types";
import {
  queryAniList,
  SPOTLIGHT_QUERY,
  TRENDING_QUERY,
  POPULAR_QUERY,
  TOP_RATED_QUERY,
  TOP_AIRING_QUERY,
  UPCOMING_QUERY,
  JUST_FINISHED_QUERY,
  TOP_MOVIES_QUERY,
  SEASONAL_QUERY,
  FILTER_QUERY,
  GENRES_AND_TAGS_QUERY,
  RANDOM_ANIME_QUERY,
  DETAIL_QUERY,
} from "../lib/anilist";

export const animeRoutes = new Hono<{ Bindings: Bindings }>();

// GET /anime/spotlight
animeRoutes.get("/anime/spotlight", async (c) => {
  const data = await queryAniList(SPOTLIGHT_QUERY, {}, c.env.KV, "spotlight", 900);
  const media = data?.Page?.media || [];
  return c.json(media);
});

// GET /anime/trending
animeRoutes.get("/anime/trending", async (c) => {
  const page = parseInt(c.req.query("page") || "1", 10);
  const perPage = Math.min(50, parseInt(c.req.query("perPage") || "24", 10));

  const data = await queryAniList(TRENDING_QUERY, { page, perPage }, c.env.KV, `trending_${page}_${perPage}`, 600);
  const pageInfo = data?.Page?.pageInfo || {};
  const results = data?.Page?.media || [];

  return c.json({
    page: pageInfo.currentPage || page,
    perPage: pageInfo.perPage || perPage,
    total: pageInfo.total || 0,
    hasNextPage: Boolean(pageInfo.hasNextPage),
    results,
  });
});

// GET /anime/popular
animeRoutes.get("/anime/popular", async (c) => {
  const page = parseInt(c.req.query("page") || "1", 10);
  const perPage = Math.min(50, parseInt(c.req.query("perPage") || "24", 10));

  const data = await queryAniList(POPULAR_QUERY, { page, perPage }, c.env.KV, `popular_${page}_${perPage}`, 900);
  const pageInfo = data?.Page?.pageInfo || {};
  const results = data?.Page?.media || [];

  return c.json({
    page: pageInfo.currentPage || page,
    perPage: pageInfo.perPage || perPage,
    total: pageInfo.total || 0,
    hasNextPage: Boolean(pageInfo.hasNextPage),
    results,
  });
});

// GET /anime/top-rated
animeRoutes.get("/anime/top-rated", async (c) => {
  const page = parseInt(c.req.query("page") || "1", 10);
  const perPage = Math.min(50, parseInt(c.req.query("perPage") || "24", 10));

  const data = await queryAniList(TOP_RATED_QUERY, { page, perPage }, c.env.KV, `top_rated_${page}_${perPage}`, 1800);
  const pageInfo = data?.Page?.pageInfo || {};
  const results = data?.Page?.media || [];

  return c.json({
    page: pageInfo.currentPage || page,
    perPage: pageInfo.perPage || perPage,
    total: pageInfo.total || 0,
    hasNextPage: Boolean(pageInfo.hasNextPage),
    results,
  });
});

// GET /anime/top-airing
animeRoutes.get("/anime/top-airing", async (c) => {
  const page = parseInt(c.req.query("page") || "1", 10);
  const perPage = Math.min(50, parseInt(c.req.query("perPage") || "24", 10));

  const data = await queryAniList(TOP_AIRING_QUERY, { page, perPage }, c.env.KV, `top_airing_${page}_${perPage}`, 900);
  const pageInfo = data?.Page?.pageInfo || {};
  const results = data?.Page?.media || [];

  return c.json({
    page: pageInfo.currentPage || page,
    perPage: pageInfo.perPage || perPage,
    total: pageInfo.total || 0,
    hasNextPage: Boolean(pageInfo.hasNextPage),
    results,
  });
});

// GET /anime/upcoming
animeRoutes.get("/anime/upcoming", async (c) => {
  const page = parseInt(c.req.query("page") || "1", 10);
  const perPage = Math.min(50, parseInt(c.req.query("perPage") || "24", 10));

  const data = await queryAniList(UPCOMING_QUERY, { page, perPage }, c.env.KV, `upcoming_${page}_${perPage}`, 1800);
  const pageInfo = data?.Page?.pageInfo || {};
  const results = data?.Page?.media || [];

  return c.json({
    page: pageInfo.currentPage || page,
    perPage: pageInfo.perPage || perPage,
    total: pageInfo.total || 0,
    hasNextPage: Boolean(pageInfo.hasNextPage),
    results,
  });
});

// GET /anime/just-finished
animeRoutes.get("/anime/just-finished", async (c) => {
  const page = parseInt(c.req.query("page") || "1", 10);
  const perPage = Math.min(50, parseInt(c.req.query("perPage") || "24", 10));

  const data = await queryAniList(JUST_FINISHED_QUERY, { page, perPage }, c.env.KV, `just_finished_${page}_${perPage}`, 1800);
  const pageInfo = data?.Page?.pageInfo || {};
  const results = data?.Page?.media || [];

  return c.json({
    page: pageInfo.currentPage || page,
    perPage: pageInfo.perPage || perPage,
    total: pageInfo.total || 0,
    hasNextPage: Boolean(pageInfo.hasNextPage),
    results,
  });
});

// GET /anime/top-movies
animeRoutes.get("/anime/top-movies", async (c) => {
  const page = parseInt(c.req.query("page") || "1", 10);
  const perPage = Math.min(50, parseInt(c.req.query("perPage") || "24", 10));

  const data = await queryAniList(TOP_MOVIES_QUERY, { page, perPage }, c.env.KV, `top_movies_${page}_${perPage}`, 1800);
  const pageInfo = data?.Page?.pageInfo || {};
  const results = data?.Page?.media || [];

  return c.json({
    page: pageInfo.currentPage || page,
    perPage: pageInfo.perPage || perPage,
    total: pageInfo.total || 0,
    hasNextPage: Boolean(pageInfo.hasNextPage),
    results,
  });
});

// GET /anime/seasonal
animeRoutes.get("/anime/seasonal", async (c) => {
  const page = parseInt(c.req.query("page") || "1", 10);
  const perPage = Math.min(50, parseInt(c.req.query("perPage") || "24", 10));
  const seasonYear = c.req.query("year") ? parseInt(c.req.query("year")!, 10) : undefined;
  const season = c.req.query("season") ? c.req.query("season")!.toUpperCase() : undefined;

  const data = await queryAniList(
    SEASONAL_QUERY,
    { page, perPage, seasonYear, season },
    c.env.KV,
    `seasonal_${seasonYear}_${season}_${page}_${perPage}`,
    1800
  );

  const pageInfo = data?.Page?.pageInfo || {};
  const results = data?.Page?.media || [];

  return c.json({
    page: pageInfo.currentPage || page,
    perPage: pageInfo.perPage || perPage,
    total: pageInfo.total || 0,
    hasNextPage: Boolean(pageInfo.hasNextPage),
    results,
  });
});

// GET /anime/filter
animeRoutes.get("/anime/filter", async (c) => {
  const page = parseInt(c.req.query("page") || "1", 10);
  const perPage = Math.min(50, parseInt(c.req.query("perPage") || "24", 10));
  const search = c.req.query("search") || undefined;
  const genre = c.req.query("genre");
  const genres = genre ? [genre] : undefined;
  const tag = c.req.query("tag");
  const tags = tag ? [tag] : undefined;
  const seasonYear = c.req.query("year") ? parseInt(c.req.query("year")!, 10) : undefined;
  const season = c.req.query("season") ? c.req.query("season")!.toUpperCase() : undefined;
  const format = c.req.query("format") ? c.req.query("format")!.toUpperCase() : undefined;
  const status = c.req.query("status") ? c.req.query("status")!.toUpperCase() : undefined;
  const sort = c.req.query("sort") ? [c.req.query("sort")!.toUpperCase()] : ["POPULARITY_DESC"];

  const variables = {
    page,
    perPage,
    search,
    genres,
    tags,
    seasonYear,
    season,
    format,
    status,
    sort,
  };

  const data = await queryAniList(FILTER_QUERY, variables, c.env.KV, "filter", 600);
  const pageInfo = data?.Page?.pageInfo || {};
  const results = data?.Page?.media || [];

  return c.json({
    page: pageInfo.currentPage || page,
    perPage: pageInfo.perPage || perPage,
    total: pageInfo.total || 0,
    hasNextPage: Boolean(pageInfo.hasNextPage),
    results,
  });
});

// GET /anime/genres (and fallback /genres)
animeRoutes.get("/anime/genres", async (c) => {
  const data = await queryAniList(GENRES_AND_TAGS_QUERY, {}, c.env.KV, "genres_tags", 86400);
  const genres = data?.GenreCollection || [
    "Action",
    "Adventure",
    "Comedy",
    "Drama",
    "Ecchi",
    "Fantasy",
    "Horror",
    "Mahou Shoujo",
    "Mecha",
    "Music",
    "Mystery",
    "Psychological",
    "Romance",
    "Sci-Fi",
    "Slice of Life",
    "Sports",
    "Supernatural",
    "Thriller",
  ];
  return c.json(genres);
});

// GET /anime/tags
animeRoutes.get("/anime/tags", async (c) => {
  const data = await queryAniList(GENRES_AND_TAGS_QUERY, {}, c.env.KV, "genres_tags", 86400);
  const tags = data?.MediaTagCollection || [];
  return c.json(
    tags
      .filter((t: any) => !t.isAdult)
      .map((t: any) => ({
        id: t.id,
        name: t.name,
        description: t.description || "",
        category: t.category || "",
      }))
  );
});

// GET /anime/random
animeRoutes.get("/anime/random", async (c) => {
  const randomPage = Math.floor(Math.random() * 5) + 1;
  const data = await queryAniList(RANDOM_ANIME_QUERY, { page: randomPage }, c.env.KV, `rand_pool_${randomPage}`, 3600);
  const list = data?.Page?.media || [];
  if (list.length === 0) return c.json({ id: 16498, title: "Attack on Titan" });

  const chosen = list[Math.floor(Math.random() * list.length)];
  return c.json({ id: chosen.id, title: chosen.title?.english || chosen.title?.romaji || "Anime" });
});

// GET /anime/:id
animeRoutes.get("/anime/:id", async (c) => {
  const id = parseInt(c.req.param("id"), 10);
  if (isNaN(id)) return c.json({ error: "InvalidId" }, 400);

  const data = await queryAniList(DETAIL_QUERY, { id }, c.env.KV, `anime_detail_${id}`, 3600);
  const media = data?.Media;
  if (!media) return c.json({ error: "NotFound" }, 404);

  return c.json(media);
});

// GET /anime/:id/characters
animeRoutes.get("/anime/:id/characters", async (c) => {
  const id = parseInt(c.req.param("id"), 10);
  if (isNaN(id)) return c.json({ error: "InvalidId" }, 400);

  const page = parseInt(c.req.query("page") || "1", 10);
  const perPage = Math.min(50, parseInt(c.req.query("perPage") || "25", 10));

  const data = await queryAniList(DETAIL_QUERY, { id }, c.env.KV, `anime_detail_${id}`, 3600);
  const edges = data?.Media?.characters?.edges || [];

  return c.json({
    page,
    perPage,
    total: edges.length,
    hasNextPage: false,
    results: edges,
  });
});

// GET /anime/:id/staff
animeRoutes.get("/anime/:id/staff", async (c) => {
  const id = parseInt(c.req.param("id"), 10);
  if (isNaN(id)) return c.json({ error: "InvalidId" }, 400);

  const page = parseInt(c.req.query("page") || "1", 10);
  const perPage = Math.min(50, parseInt(c.req.query("perPage") || "25", 10));

  const data = await queryAniList(DETAIL_QUERY, { id }, c.env.KV, `anime_detail_${id}`, 3600);
  const studios = data?.Media?.studios?.nodes || [];

  return c.json({
    page,
    perPage,
    total: studios.length,
    hasNextPage: false,
    results: studios,
  });
});

// GET /anime/:id/relations
animeRoutes.get("/anime/:id/relations", async (c) => {
  const id = parseInt(c.req.param("id"), 10);
  if (isNaN(id)) return c.json({ error: "InvalidId" }, 400);

  const data = await queryAniList(DETAIL_QUERY, { id }, c.env.KV, `anime_detail_${id}`, 3600);
  const relations = data?.Media?.relations?.edges || [];
  return c.json(
    relations.map((edge: any) => ({
      relationType: edge.relationType,
      id: edge.node?.id,
      title: edge.node?.title,
      format: edge.node?.format,
      status: edge.node?.status,
      coverImage: edge.node?.coverImage,
      averageScore: edge.node?.averageScore,
      year: edge.node?.startDate?.year,
    }))
  );
});

// GET /anime/:id/recommendations
animeRoutes.get("/anime/:id/recommendations", async (c) => {
  const id = parseInt(c.req.param("id"), 10);
  if (isNaN(id)) return c.json({ error: "InvalidId" }, 400);

  const page = parseInt(c.req.query("page") || "1", 10);
  const perPage = Math.min(24, parseInt(c.req.query("perPage") || "12", 10));

  const data = await queryAniList(DETAIL_QUERY, { id }, c.env.KV, `anime_detail_${id}`, 3600);
  const nodes = data?.Media?.recommendations?.nodes || [];
  const recs = nodes
    .filter((n: any) => n.mediaRecommendation)
    .map((n: any) => {
      const rec = n.mediaRecommendation;
      return {
        id: rec.id,
        rating: n.rating,
        userRating: n.userRating,
        title: rec.title,
        coverImage: rec.coverImage,
        format: rec.format,
        status: rec.status,
        episodes: rec.episodes,
        averageScore: rec.averageScore,
        year: rec.startDate?.year,
      };
    });

  return c.json({
    page,
    perPage,
    total: recs.length,
    hasNextPage: false,
    results: recs,
  });
});

// GET /anime/:id/episodes
animeRoutes.get("/anime/:id/episodes", async (c) => {
  const id = parseInt(c.req.param("id"), 10);
  if (isNaN(id)) return c.json({ error: "InvalidId" }, 400);

  const data = await queryAniList(DETAIL_QUERY, { id }, c.env.KV, `anime_detail_${id}`, 3600);
  const media = data?.Media;
  if (!media) return c.json({ error: "NotFound" }, 404);

  const streaming = media.streamingEpisodes || [];
  const totalEpisodes = media.episodes || streaming.length || 12;
  const episodes: any[] = [];

  if (streaming.length > 0) {
    for (let idx = 0; idx < streaming.length; idx++) {
      const item = streaming[idx];
      const epNum = idx + 1;
      episodes.push({
        number: epNum,
        title: item.title || `Episode ${epNum}`,
        thumbnail: item.thumbnail,
        url: item.url,
        site: item.site,
        airingAt: null,
        isAired: true,
      });
    }
  } else {
    const displayCount = Math.min(totalEpisodes, 500);
    for (let epNum = 1; epNum <= displayCount; epNum++) {
      episodes.push({
        number: epNum,
        title: `Episode ${epNum}`,
        thumbnail: media.coverImage?.large,
        url: null,
        site: null,
        airingAt: null,
        isAired: true,
      });
    }
  }

  return c.json(episodes);
});

// GET /anime/:id/reviews
animeRoutes.get("/anime/:id/reviews", async (c) => {
  const id = parseInt(c.req.param("id"), 10);
  if (isNaN(id)) return c.json({ error: "InvalidId" }, 400);

  const data = await queryAniList(DETAIL_QUERY, { id }, c.env.KV, `anime_detail_${id}`, 3600);
  const malId = data?.Media?.idMal;
  if (!malId) return c.json([]);

  try {
    const jikanRes = await fetch(`https://api.jikan.moe/v4/anime/${malId}/reviews`);
    if (jikanRes.ok) {
      const jikanData: any = await jikanRes.json();
      const reviews = (jikanData.data || []).slice(0, 10).map((r: any) => ({
        id: r.mal_id,
        username: r.user?.username || "Anonymous",
        avatar: r.user?.images?.jpg?.image_url || null,
        score: r.score,
        date: r.date,
        review: r.review,
        tags: r.tags || [],
        reactions: r.reactions || {},
      }));
      return c.json(reviews);
    }
  } catch {
    // Jikan fallback
  }

  return c.json([]);
});
