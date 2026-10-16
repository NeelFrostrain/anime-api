import { Hono } from "hono";
import { Bindings } from "../types";
import { fetchEpisodesList, extractStreamSources, getProvidersStatus } from "../lib/extractor";

export const extractRoutes = new Hono<{ Bindings: Bindings }>();

// GET /episodes/:id
extractRoutes.get("/episodes/:id", async (c) => {
  const anilistId = parseInt(c.req.param("id"), 10);
  if (isNaN(anilistId)) {
    return c.json({ error: "InvalidId" }, 400);
  }

  const episodes = await fetchEpisodesList(anilistId, c.env.KV);
  return c.json(episodes);
});

// GET /extract/:query
extractRoutes.get("/extract/:query", async (c) => {
  const query = c.req.param("query");
  const episode = parseInt(c.req.query("e") || c.req.query("episode") || "1", 10);
  const audio = (c.req.query("type") || c.req.query("audio") || "sub").toLowerCase() as "sub" | "dub";
  const provider = c.req.query("provider") || null;
  const passedTitle = c.req.query("title") || c.req.query("q") || null;

  const result = await extractStreamSources(query, episode, audio, provider, c.env.KV, passedTitle);
  return c.json(result);
});

// GET /sources
extractRoutes.get("/sources", async (c) => {
  const anilistId = parseInt(c.req.query("anilistId") || "0", 10);
  const episode = parseInt(c.req.query("episode") || "1", 10);
  const category = (c.req.query("category") || "sub").toLowerCase() as "sub" | "dub";
  const provider = c.req.query("provider") || "gogoanime";

  const result = await extractStreamSources(anilistId, episode, category, provider, c.env.KV);
  return c.json(result);
});

// GET /providers/status
extractRoutes.get("/providers/status", async (c) => {
  return c.json(getProvidersStatus());
});

// GET /bridge-status
extractRoutes.get("/bridge-status", async (c) => {
  return c.json(getProvidersStatus());
});
