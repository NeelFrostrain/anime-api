# Kuromi Anime API - Cloudflare Worker

A high-performance, edge-native backend for the Kuromi Anime platform built on **Cloudflare Workers**, **Cloudflare D1 Database** (serverless SQLite at the edge), and **Cloudflare Workers KV** (distributed key-value cache).

---

## Architecture

- **Runtime**: Cloudflare Workers (V8 Edge Isolates, 0ms cold starts, global CDN)
- **Framework**: [Hono](https://hono.dev/) v4 (ultra-fast, typed web framework)
- **Database**: Cloudflare D1 (`DB` binding) for users, watchlists, watch history, and settings
- **Cache**: Cloudflare Workers KV (`KV` binding) for AniList GraphQL responses & stream extraction cache
- **Proxy**: Low-latency edge streaming for HLS M3U8 playlists, TS video segments, and ASS-to-WebVTT subtitle conversion

---

## Project Structure

```
backend/
├── src/
│   ├── index.ts           # Main Hono app, middleware, proxies & route mounts
│   ├── types.ts           # D1 & KV bindings, TypeScript models
│   ├── lib/
│   │   ├── anilist.ts     # AniList GraphQL queries & KV caching engine
│   │   ├── crypto.ts      # Web Crypto PBKDF2 password hashing & JWT
│   │   ├── extractor.ts   # Episode lists and stream source extraction
│   │   └── proxy.ts       # Edge M3U8, TS segment & WebVTT subtitle proxy
│   └── routes/
│       ├── anime.ts       # Discovery (spotlight, trending, details, etc.)
│       ├── auth.ts        # Registration, login, JWT cookies, /me
│       ├── extract.ts     # Episode & stream extraction endpoints
│       ├── search.ts      # Search, suggestions, filters, week schedule
│       └── user.ts        # Watchlist, history, user stats & settings
├── schema.sql             # Cloudflare D1 SQLite database schema
├── wrangler.toml          # Cloudflare Worker configuration & resource bindings
├── package.json
└── legacy_python/         # Archived previous Python/FastAPI backend
```

---

## Local Development

### 1. Install Dependencies
```bash
npm install
```

### 2. Initialize Local D1 Database
Create the local tables in the Wrangler D1 emulator:
```bash
npm run db:migrate:local
```

### 3. Start Development Server
```bash
npm run dev
```
The worker will listen on `http://127.0.0.1:8000` (matching the Next.js frontend proxy configuration).

---

## Production Deployment to Cloudflare

### Step 1: Login to Cloudflare
```bash
npx wrangler login
```

### Step 2: Create Cloudflare D1 Database
```bash
npx wrangler d1 create anime-d1
```
Copy the generated `database_id` and update `wrangler.toml`:
```toml
[[d1_databases]]
binding = "DB"
database_name = "anime-d1"
database_id = "YOUR_D1_DATABASE_ID_HERE"
```

### Step 3: Run Database Migrations on Cloudflare D1
Execute the schema against your live Cloudflare D1 database:
```bash
npm run db:migrate:remote
```

### Step 4: Create Cloudflare Workers KV Namespace
```bash
npx wrangler kv:namespace create ANIME_CACHE
```
Copy the generated `id` and update `wrangler.toml`:
```toml
[[kv_namespaces]]
binding = "KV"
id = "YOUR_KV_NAMESPACE_ID_HERE"
```

### Step 5: Deploy the Worker
```bash
npm run deploy
```
Wrangler will output your live URL:
`https://anime-api.<your-subdomain>.workers.dev`

---

## Environment Variables / Secrets

Configured in `wrangler.toml` or set via `npx wrangler secret put`:

| Variable | Description | Default |
|---|---|---|
| `JWT_SECRET` | Secret key for signing authentication tokens | Configurable in wrangler.toml |
| `ACCESS_TOKEN_EXPIRE_SECONDS` | Token lifespan | `604800` (7 days) |
| `COOKIE_NAME` | Cookie key for session auth | `kuromi_token` |
| `APP_NAME` | Application title | `Kuromi` |

---

## API Endpoints

### Health & Discovery
- `GET /health` or `GET /api/v1/health`
- `GET /api/v1/anime/spotlight`
- `GET /api/v1/anime/trending?page=1&perPage=24`
- `GET /api/v1/anime/popular?page=1&perPage=24`
- `GET /api/v1/anime/top-rated?page=1&perPage=24`
- `GET /api/v1/anime/top-airing?page=1&perPage=24`
- `GET /api/v1/anime/upcoming?page=1&perPage=24`
- `GET /api/v1/anime/just-finished?page=1&perPage=24`
- `GET /api/v1/anime/top-movies?page=1&perPage=24`
- `GET /api/v1/anime/:id`
- `GET /api/v1/anime/:id/characters`
- `GET /api/v1/anime/:id/staff`
- `GET /api/v1/anime/:id/relations`
- `GET /api/v1/anime/:id/recommendations`

### Search & Schedule
- `GET /api/v1/search?q=naruto&page=1`
- `GET /api/v1/suggestions?q=one+piece`
- `GET /api/v1/filter?genre=Action&year=2024&format=TV`
- `GET /api/v1/genres`
- `GET /api/v1/schedule`
- `GET /api/v1/schedule/week`
- `GET /api/v1/character/:id`
- `GET /api/v1/staff/:id`
- `GET /api/v1/random`

### Authentication (Cloudflare D1)
- `POST /api/v1/auth/register` (body: `{ email, username, password }`)
- `POST /api/v1/auth/login` (body: `{ email, password }`)
- `POST /api/v1/auth/logout`
- `GET /api/v1/auth/me`

### User Library (Cloudflare D1)
- `GET /api/v1/user/watchlist?status=WATCHING`
- `POST /api/v1/user/watchlist`
- `PATCH /api/v1/user/watchlist/:anime_id`
- `DELETE /api/v1/user/watchlist/:anime_id`
- `GET /api/v1/user/history`
- `POST /api/v1/user/history`
- `DELETE /api/v1/user/history/:anime_id`
- `GET /api/v1/user/settings`
- `PATCH /api/v1/user/settings`
- `GET /api/v1/user/stats`

### Streaming & Extraction
- `GET /api/v1/episodes/:id`
- `GET /api/v1/extract/:id?e=1&type=sub&provider=gogoanime`
- `GET /api/v1/sources?episodeId=...&provider=...&anilistId=...`
- `GET /api/v1/providers/status`

### Edge Proxies
- `GET /proxy_m3u8?url=...&referer=...` (HLS playlist proxy with URL rewriting)
- `GET /proxy_segment?url=...&referer=...` (TS/MP4 chunk stream with Range support)
- `GET /proxy_subtitle?url=...&offset=0&speed=1.0` (ASS to WebVTT subtitle conversion)
