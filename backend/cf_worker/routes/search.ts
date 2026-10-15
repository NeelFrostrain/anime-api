import { Hono } from "hono";
import { Bindings } from "../types";
import {
  queryAniList,
  SEARCH_QUERY,
  SUGGESTIONS_QUERY,
  FILTER_QUERY,
  GENRES_QUERY,
  SCHEDULE_QUERY,
  CHARACTER_DETAIL_QUERY,
  STAFF_DETAIL_QUERY,
  STUDIO_DETAIL_QUERY,
  RANDOM_ANIME_QUERY,
} from "../lib/anilist";

export const searchRoutes = new Hono<{ Bindings: Bindings }>();

// GET /search
searchRoutes.get("/search", async (c) => {
  const query = c.req.query("q") || c.req.query("query") || "";
  const page = parseInt(c.req.query("page") || "1", 10);
  const perPage = Math.min(50, parseInt(c.req.query("perPage") || "24", 10));

  if (!query.trim()) {
    return c.json({ page: 1, perPage, total: 0, hasNextPage: false, results: [] });
  }

  const data = await queryAniList(
    SEARCH_QUERY,
    { search: query.trim(), page, perPage },
    c.env.KV,
    `search_${query.trim().toLowerCase()}_${page}_${perPage}`,
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

const handleSuggestions = async (c: any) => {
  const query = c.req.query("q") || c.req.query("query") || "";
  if (!query.trim()) return c.json([]);

  const data = await queryAniList(
    SUGGESTIONS_QUERY,
    { search: query.trim() },
    c.env.KV,
    `sug_${query.trim().toLowerCase()}`,
    1800
  );

  const mediaList = data?.Page?.media || [];
  const suggestions = mediaList.map((item: any) => ({
    id: item.id,
    title: item.title?.english || item.title?.romaji || "Anime",
    titleRomaji: item.title?.romaji || "",
    poster: item.coverImage?.large || item.coverImage?.medium || "",
    color: item.coverImage?.color || "#8b7cf6",
    format: item.format || null,
    status: item.status || null,
    year: item.startDate?.year || null,
    episodes: item.episodes || null,
    score: item.averageScore || null,
  }));

  return c.json(suggestions);
};

// GET /search/suggestions and /suggestions
searchRoutes.get("/search/suggestions", handleSuggestions);
searchRoutes.get("/suggestions", handleSuggestions);

// GET /filter
searchRoutes.get("/filter", async (c) => {
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

// GET /genres
searchRoutes.get("/genres", async (c) => {
  const data = await queryAniList(GENRES_QUERY, {}, c.env.KV, "genres", 86400);
  return c.json({
    genres: data?.GenreCollection || [
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
    ],
  });
});

// GET /schedule
searchRoutes.get("/schedule", async (c) => {
  const dateParam = c.req.query("date");
  let targetDate: Date;
  if (dateParam && /^\d{4}-\d{2}-\d{2}$/.test(dateParam)) {
    targetDate = new Date(`${dateParam}T00:00:00Z`);
  } else {
    targetDate = new Date();
  }
  const dateStr = targetDate.toISOString().split("T")[0];
  const startOfDay = new Date(Date.UTC(targetDate.getUTCFullYear(), targetDate.getUTCMonth(), targetDate.getUTCDate(), 0, 0, 0));
  const airingAt_greater = Math.floor(startOfDay.getTime() / 1000);
  const airingAt_lesser = airingAt_greater + 86400;

  const data = await queryAniList(
    SCHEDULE_QUERY,
    { airingAt_greater, airingAt_lesser, page: 1, perPage: 50 },
    c.env.KV,
    `schedule_${dateStr}`,
    1800
  );

  const schedules = data?.Page?.airingSchedules || [];
  return c.json({
    date: dateStr,
    total: schedules.length,
    results: schedules,
  });
});

// GET /schedule/week
searchRoutes.get("/schedule/week", async (c) => {
  const now = new Date();
  const startOfDay = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0));
  const startTimestamp = Math.floor(startOfDay.getTime() / 1000);
  const endTimestamp = startTimestamp + 7 * 86400;

  const data = await queryAniList(
    SCHEDULE_QUERY,
    { airingAt_greater: startTimestamp, airingAt_lesser: endTimestamp, page: 1, perPage: 100 },
    c.env.KV,
    `week_schedule_${startTimestamp}`,
    1800
  );

  const schedules: any[] = data?.Page?.airingSchedules || [];
  const days: any[] = [];
  const dayNamesShort = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const dayNamesFull = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

  for (let d = 0; d < 7; d++) {
    const curDate = new Date((startTimestamp + d * 86400) * 1000);
    const dateStr = curDate.toISOString().split("T")[0];
    const dayOfWeek = dayNamesShort[curDate.getUTCDay()];
    const fullDayName = dayNamesFull[curDate.getUTCDay()];
    const dayStart = startTimestamp + d * 86400;
    const dayEnd = dayStart + 86400;

    const episodes = schedules.filter((s: any) => s.airingAt >= dayStart && s.airingAt < dayEnd);
    days.push({
      date: dateStr,
      dayOfWeek,
      fullDayName,
      isToday: d === 0,
      count: episodes.length,
      episodes,
    });
  }

  return c.json(days);
});

// GET /character/:id
searchRoutes.get("/character/:id", async (c) => {
  const id = parseInt(c.req.param("id"), 10);
  if (isNaN(id)) return c.json({ error: "InvalidId" }, 400);

  const data = await queryAniList(CHARACTER_DETAIL_QUERY, { id }, c.env.KV, `char_${id}`, 86400);
  const char = data?.Character;
  if (!char) return c.json({ error: "NotFound" }, 404);
  return c.json(char);
});

// GET /staff/:id
searchRoutes.get("/staff/:id", async (c) => {
  const id = parseInt(c.req.param("id"), 10);
  if (isNaN(id)) return c.json({ error: "InvalidId" }, 400);

  const data = await queryAniList(STAFF_DETAIL_QUERY, { id }, c.env.KV, `staff_${id}`, 86400);
  const staff = data?.Staff;
  if (!staff) return c.json({ error: "NotFound" }, 404);
  return c.json(staff);
});

// GET /studio/:id
searchRoutes.get("/studio/:id", async (c) => {
  const id = parseInt(c.req.param("id"), 10);
  if (isNaN(id)) return c.json({ error: "InvalidId" }, 400);

  const page = parseInt(c.req.query("page") || "1", 10);
  const perPage = Math.min(50, parseInt(c.req.query("perPage") || "24", 10));

  const data = await queryAniList(
    STUDIO_DETAIL_QUERY,
    { id, page, perPage },
    c.env.KV,
    `studio_${id}_${page}_${perPage}`,
    86400
  );
  const studio = data?.Studio;
  if (!studio) return c.json({ error: "NotFound" }, 404);

  const mediaData = studio.media || {};
  const nodes = mediaData.nodes || [];
  const pageInfo = mediaData.pageInfo || {};

  return c.json({
    id: studio.id,
    name: studio.name,
    isAnimationStudio: studio.isAnimationStudio || false,
    favourites: studio.favourites,
    pagination: {
      page: pageInfo.currentPage || page,
      perPage: pageInfo.perPage || perPage,
      total: pageInfo.total || nodes.length,
      hasNextPage: Boolean(pageInfo.hasNextPage),
    },
    media: nodes,
  });
});

// GET /random
searchRoutes.get("/random", async (c) => {
  const randomPage = Math.floor(Math.random() * 20) + 1;
  const data = await queryAniList(RANDOM_ANIME_QUERY, { page: randomPage }, c.env.KV, `rand_pool_${randomPage}`, 3600);
  const list = data?.Page?.media || [];
  if (list.length === 0) return c.json({ id: 21 }); // One Piece fallback

  const chosen = list[Math.floor(Math.random() * list.length)];
  return c.json({ id: chosen.id });
});
