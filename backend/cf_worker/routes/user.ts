import { Hono } from "hono";
import { Bindings, WatchlistRow, HistoryRow, UserSettingsRow } from "../types";
import { getAuthUser } from "./auth";

export const userRoutes = new Hono<{ Bindings: Bindings }>();

// 1. GET /watchlist
userRoutes.get("/watchlist", async (c) => {
  const authUser = await getAuthUser(c);
  if (!authUser) return c.json([]);

  const status = c.req.query("status");
  let query = "SELECT * FROM watchlist_items WHERE user_id = ?1";
  const params: any[] = [authUser.id];

  if (status) {
    query += " AND status = ?2";
    params.push(status.toUpperCase());
  }
  query += " ORDER BY updated_at DESC";

  const { results } = await c.env.DB.prepare(query).bind(...params).all<WatchlistRow>();

  return c.json(
    results.map((r) => ({
      id: r.id,
      userId: r.user_id,
      animeId: r.anime_id,
      animeTitle: r.anime_title,
      animePoster: r.anime_poster,
      animeFormat: r.anime_format,
      animeYear: r.anime_year,
      status: r.status,
      progress: r.progress,
      totalEpisodes: r.total_episodes,
      score: r.score,
      notes: r.notes,
      updatedAt: r.updated_at,
    }))
  );
});

// 2. POST /watchlist
userRoutes.post("/watchlist", async (c) => {
  const authUser = await getAuthUser(c);
  if (!authUser) return c.json({ error: "Unauthorized" }, 401);

  const body = await c.req.json().catch(() => ({}));
  const {
    animeId,
    animeTitle,
    animePoster,
    animeFormat,
    animeYear,
    status = "PLANNING",
    progress = 0,
    totalEpisodes,
    score,
    notes,
  } = body;

  if (!animeId || !animeTitle) {
    return c.json({ error: "ValidationError", detail: "animeId and animeTitle are required" }, 400);
  }

  // Upsert into D1
  await c.env.DB.prepare(`
    INSERT INTO watchlist_items (
      user_id, anime_id, anime_title, anime_poster, anime_format, anime_year,
      status, progress, total_episodes, score, notes, updated_at
    ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, CURRENT_TIMESTAMP)
    ON CONFLICT(user_id, anime_id) DO UPDATE SET
      status = excluded.status,
      progress = excluded.progress,
      total_episodes = COALESCE(excluded.total_episodes, watchlist_items.total_episodes),
      score = COALESCE(excluded.score, watchlist_items.score),
      notes = COALESCE(excluded.notes, watchlist_items.notes),
      updated_at = CURRENT_TIMESTAMP
  `)
    .bind(
      authUser.id,
      animeId,
      animeTitle,
      animePoster || null,
      animeFormat || null,
      animeYear || null,
      status.toUpperCase(),
      progress,
      totalEpisodes || null,
      score ?? null,
      notes || null
    )
    .run();

  const item = await c.env.DB.prepare(
    "SELECT * FROM watchlist_items WHERE user_id = ?1 AND anime_id = ?2 LIMIT 1"
  )
    .bind(authUser.id, animeId)
    .first<WatchlistRow>();

  if (!item) return c.json(null);

  return c.json({
    id: item.id,
    userId: item.user_id,
    animeId: item.anime_id,
    animeTitle: item.anime_title,
    animePoster: item.anime_poster,
    animeFormat: item.anime_format,
    animeYear: item.anime_year,
    status: item.status,
    progress: item.progress,
    totalEpisodes: item.total_episodes,
    score: item.score,
    notes: item.notes,
    updatedAt: item.updated_at,
  });
});

// 3. PATCH /watchlist/:anime_id
userRoutes.patch("/watchlist/:anime_id", async (c) => {
  const authUser = await getAuthUser(c);
  if (!authUser) return c.json({ error: "Unauthorized" }, 401);

  const animeId = parseInt(c.req.param("anime_id"), 10);
  const body = await c.req.json().catch(() => ({}));
  const { status, progress, score, notes } = body;

  const item = await c.env.DB.prepare(
    "SELECT * FROM watchlist_items WHERE user_id = ?1 AND anime_id = ?2 LIMIT 1"
  )
    .bind(authUser.id, animeId)
    .first<WatchlistRow>();

  if (!item) {
    return c.json({ error: "NotFound", detail: "Item not in watchlist" }, 404);
  }

  const newStatus = status ? status.toUpperCase() : item.status;
  const newProgress = progress !== undefined ? progress : item.progress;
  const newScore = score !== undefined ? score : item.score;
  const newNotes = notes !== undefined ? notes : item.notes;

  await c.env.DB.prepare(`
    UPDATE watchlist_items
    SET status = ?1, progress = ?2, score = ?3, notes = ?4, updated_at = CURRENT_TIMESTAMP
    WHERE user_id = ?5 AND anime_id = ?6
  `)
    .bind(newStatus, newProgress, newScore, newNotes, authUser.id, animeId)
    .run();

  const updated = await c.env.DB.prepare(
    "SELECT * FROM watchlist_items WHERE user_id = ?1 AND anime_id = ?2 LIMIT 1"
  )
    .bind(authUser.id, animeId)
    .first<WatchlistRow>();

  return c.json({
    id: updated!.id,
    userId: updated!.user_id,
    animeId: updated!.anime_id,
    animeTitle: updated!.anime_title,
    animePoster: updated!.anime_poster,
    animeFormat: updated!.anime_format,
    animeYear: updated!.anime_year,
    status: updated!.status,
    progress: updated!.progress,
    totalEpisodes: updated!.total_episodes,
    score: updated!.score,
    notes: updated!.notes,
    updatedAt: updated!.updated_at,
  });
});

// 4. DELETE /watchlist/:anime_id
userRoutes.delete("/watchlist/:anime_id", async (c) => {
  const authUser = await getAuthUser(c);
  if (!authUser) return c.json({ error: "Unauthorized" }, 401);

  const animeId = parseInt(c.req.param("anime_id"), 10);
  await c.env.DB.prepare(
    "DELETE FROM watchlist_items WHERE user_id = ?1 AND anime_id = ?2"
  )
    .bind(authUser.id, animeId)
    .run();

  return c.json({ message: "Removed from watchlist" });
});

// 5. GET /history
userRoutes.get("/history", async (c) => {
  const authUser = await getAuthUser(c);
  if (!authUser) return c.json([]);

  const { results } = await c.env.DB.prepare(
    "SELECT * FROM history_items WHERE user_id = ?1 ORDER BY updated_at DESC LIMIT 50"
  )
    .bind(authUser.id)
    .all<HistoryRow>();

  return c.json(
    results.map((r) => ({
      id: r.id,
      userId: r.user_id,
      animeId: r.anime_id,
      animeTitle: r.anime_title,
      animePoster: r.anime_poster,
      episode: r.episode,
      episodeTitle: r.episode_title,
      playbackPosition: r.playback_position,
      playbackDuration: r.playback_duration,
      updatedAt: r.updated_at,
    }))
  );
});

// 6. POST /history
userRoutes.post("/history", async (c) => {
  const authUser = await getAuthUser(c);
  if (!authUser) return c.json({ error: "Unauthorized" }, 401);

  const body = await c.req.json().catch(() => ({}));
  const {
    animeId,
    animeTitle,
    animePoster,
    episode = 1,
    episodeTitle,
    playbackPosition = 0.0,
    playbackDuration = 0.0,
  } = body;

  if (!animeId || !animeTitle) {
    return c.json({ error: "ValidationError", detail: "animeId and animeTitle required" }, 400);
  }

  // Upsert history item
  await c.env.DB.prepare(`
    INSERT INTO history_items (
      user_id, anime_id, anime_title, anime_poster, episode, episode_title,
      playback_position, playback_duration, updated_at
    ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, CURRENT_TIMESTAMP)
    ON CONFLICT(user_id, anime_id) DO UPDATE SET
      anime_title = excluded.anime_title,
      anime_poster = COALESCE(excluded.anime_poster, history_items.anime_poster),
      episode = excluded.episode,
      episode_title = excluded.episode_title,
      playback_position = excluded.playback_position,
      playback_duration = excluded.playback_duration,
      updated_at = CURRENT_TIMESTAMP
  `)
    .bind(
      authUser.id,
      animeId,
      animeTitle,
      animePoster || null,
      episode,
      episodeTitle || null,
      playbackPosition,
      playbackDuration
    )
    .run();

  const item = await c.env.DB.prepare(
    "SELECT * FROM history_items WHERE user_id = ?1 AND anime_id = ?2 LIMIT 1"
  )
    .bind(authUser.id, animeId)
    .first<HistoryRow>();

  return c.json({
    id: item!.id,
    userId: item!.user_id,
    animeId: item!.anime_id,
    animeTitle: item!.anime_title,
    animePoster: item!.anime_poster,
    episode: item!.episode,
    episodeTitle: item!.episode_title,
    playbackPosition: item!.playback_position,
    playbackDuration: item!.playback_duration,
    updatedAt: item!.updated_at,
  });
});

// 7. DELETE /history/:anime_id
userRoutes.delete("/history/:anime_id", async (c) => {
  const authUser = await getAuthUser(c);
  if (!authUser) return c.json({ error: "Unauthorized" }, 401);

  const animeId = parseInt(c.req.param("anime_id"), 10);
  await c.env.DB.prepare(
    "DELETE FROM history_items WHERE user_id = ?1 AND anime_id = ?2"
  )
    .bind(authUser.id, animeId)
    .run();

  return c.json({ message: "History item deleted" });
});

// 8. GET /settings
userRoutes.get("/settings", async (c) => {
  const authUser = await getAuthUser(c);
  if (!authUser) {
    return c.json({
      titleLanguage: "english",
      themeAccent: "#8b7cf6",
      adultFilter: true,
    });
  }

  const settings = await c.env.DB.prepare(
    "SELECT title_language, theme_accent, adult_filter FROM user_settings WHERE user_id = ?1 LIMIT 1"
  )
    .bind(authUser.id)
    .first<UserSettingsRow>();

  return c.json({
    titleLanguage: settings?.title_language || "english",
    themeAccent: settings?.theme_accent || "#8b7cf6",
    adultFilter: Boolean(settings ? settings.adult_filter : 1),
  });
});

// 9. PATCH /settings
userRoutes.patch("/settings", async (c) => {
  const authUser = await getAuthUser(c);
  if (!authUser) return c.json({ error: "Unauthorized" }, 401);

  const body = await c.req.json().catch(() => ({}));
  const { titleLanguage, themeAccent, adultFilter } = body;

  const current = await c.env.DB.prepare(
    "SELECT * FROM user_settings WHERE user_id = ?1 LIMIT 1"
  )
    .bind(authUser.id)
    .first<UserSettingsRow>();

  const newLang = titleLanguage || current?.title_language || "english";
  const newAccent = themeAccent || current?.theme_accent || "#8b7cf6";
  const newAdult = adultFilter !== undefined ? (adultFilter ? 1 : 0) : current?.adult_filter ?? 1;

  await c.env.DB.prepare(`
    INSERT INTO user_settings (user_id, title_language, theme_accent, adult_filter)
    VALUES (?1, ?2, ?3, ?4)
    ON CONFLICT(user_id) DO UPDATE SET
      title_language = excluded.title_language,
      theme_accent = excluded.theme_accent,
      adult_filter = excluded.adult_filter
  `)
    .bind(authUser.id, newLang, newAccent, newAdult)
    .run();

  return c.json({
    titleLanguage: newLang,
    themeAccent: newAccent,
    adultFilter: Boolean(newAdult),
  });
});

// 10. GET /stats
userRoutes.get("/stats", async (c) => {
  const authUser = await getAuthUser(c);
  if (!authUser) {
    return c.json({
      totalWatchlist: 0,
      totalEpisodesWatched: 0,
      totalHoursWatched: 0,
      statusBreakdown: {},
    });
  }

  const watchlistCounts = await c.env.DB.prepare(`
    SELECT status, COUNT(*) as count FROM watchlist_items
    WHERE user_id = ?1 GROUP BY status
  `)
    .bind(authUser.id)
    .all<{ status: string; count: number }>();

  const historyStats = await c.env.DB.prepare(`
    SELECT COUNT(*) as total_episodes, SUM(playback_position) as total_seconds
    FROM history_items WHERE user_id = ?1
  `)
    .bind(authUser.id)
    .first<{ total_episodes: number; total_seconds: number | null }>();

  const statusMap: Record<string, number> = {};
  let totalWatchlist = 0;
  for (const row of watchlistCounts.results) {
    statusMap[row.status] = row.count;
    totalWatchlist += row.count;
  }

  const totalSeconds = historyStats?.total_seconds || 0;
  const totalHours = Math.round((totalSeconds / 3600) * 10) / 10;

  return c.json({
    totalWatchlist,
    totalEpisodesWatched: historyStats?.total_episodes || 0,
    totalHoursWatched: totalHours,
    statusBreakdown: statusMap,
  });
});
