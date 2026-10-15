import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { Bindings } from "./types";
import { authRoutes } from "./routes/auth";
import { userRoutes } from "./routes/user";
import { animeRoutes } from "./routes/anime";
import { searchRoutes } from "./routes/search";
import { extractRoutes } from "./routes/extract";
import { handleM3u8Proxy, handleSegmentProxy, handleSubtitleProxy } from "./lib/proxy";

const app = new Hono<{ Bindings: Bindings }>();

// Global Middleware
app.use("*", logger());
app.use(
  "*",
  cors({
    origin: (origin) => origin || "*",
    allowHeaders: ["Content-Type", "Authorization", "X-Requested-With", "Range"],
    allowMethods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS", "HEAD"],
    exposeHeaders: ["Content-Length", "Content-Range", "Set-Cookie"],
    credentials: true,
    maxAge: 86400,
  })
);

// Health check endpoints
app.get("/health", (c) => {
  return c.json({
    status: "healthy",
    app: c.env.APP_NAME || "Kuromi",
    version: "2.0.0 (Cloudflare Worker)",
    runtime: "edge",
    time: Math.floor(Date.now() / 1000),
  });
});

app.get("/api/v1/health", (c) => {
  return c.json({
    status: "healthy",
    app: c.env.APP_NAME || "Kuromi",
    version: "2.0.0 (Cloudflare Worker)",
    runtime: "edge",
    time: Math.floor(Date.now() / 1000),
  });
});

// Stream & Subtitle Edge Proxies
app.get("/proxy_m3u8", async (c) => {
  const url = c.req.query("url");
  if (!url) return c.text("Missing url query param", 400);

  const referer = c.req.query("referer") || null;
  const workerOrigin = new URL(c.req.url).origin;
  return handleM3u8Proxy(url, referer, workerOrigin);
});

app.get("/proxy_segment", async (c) => {
  const url = c.req.query("url");
  if (!url) return c.text("Missing url query param", 400);

  const referer = c.req.query("referer") || null;
  return handleSegmentProxy(url, referer, c.req.raw);
});

app.get("/proxy_subtitle", async (c) => {
  const url = c.req.query("url");
  if (!url) return c.text("Missing url query param", 400);

  const referer = c.req.query("referer") || null;
  const offset = parseFloat(c.req.query("offset") || "0") || 0;
  const speed = parseFloat(c.req.query("speed") || "1.0") || 1.0;
  return handleSubtitleProxy(url, offset, speed, referer);
});

// Also support /api/v1/proxy_* aliases
app.get("/api/v1/proxy_m3u8", async (c) => {
  const url = c.req.query("url");
  if (!url) return c.text("Missing url query param", 400);
  const referer = c.req.query("referer") || null;
  const workerOrigin = new URL(c.req.url).origin;
  return handleM3u8Proxy(url, referer, workerOrigin);
});

app.get("/api/v1/proxy_segment", async (c) => {
  const url = c.req.query("url");
  if (!url) return c.text("Missing url query param", 400);
  const referer = c.req.query("referer") || null;
  return handleSegmentProxy(url, referer, c.req.raw);
});

app.get("/api/v1/proxy_subtitle", async (c) => {
  const url = c.req.query("url");
  if (!url) return c.text("Missing url query param", 400);
  const referer = c.req.query("referer") || null;
  const offset = parseFloat(c.req.query("offset") || "0") || 0;
  const speed = parseFloat(c.req.query("speed") || "1.0") || 1.0;
  return handleSubtitleProxy(url, offset, speed, referer);
});

// Mount modular routers under /api/v1
app.route("/api/v1/auth", authRoutes);
app.route("/api/v1/user", userRoutes);
app.route("/api/v1", animeRoutes);
app.route("/api/v1", searchRoutes);
app.route("/api/v1", extractRoutes);

// Mount routers at root for direct calls
app.route("/auth", authRoutes);
app.route("/user", userRoutes);
app.route("/", animeRoutes);
app.route("/", searchRoutes);
app.route("/", extractRoutes);

// 404 Handler
app.notFound((c) => {
  return c.json(
    {
      error: "NotFound",
      message: `Endpoint '${c.req.path}' not found`,
    },
    404
  );
});

// Global Error Handler
app.onError((err, c) => {
  console.error("Worker error:", err);
  return c.json(
    {
      error: "InternalServerError",
      message: err.message || "An unexpected error occurred",
    },
    500
  );
});

export default app;
