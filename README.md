# KUROMI — Premium Anime Discovery & Tracking Platform

<p align="center">
  <img src="https://images.unsplash.com/photo-1578632767115-351597cf2477?w=1200&auto=format&fit=crop&q=80" alt="KUROMI Banner" width="100%" style="border-radius: 12px;" />
</p>

KUROMI is a state-of-the-art, full-screen anime discovery, tracking, and franchise exploration platform built with Next.js 16 (React 19 App Router) and a high-performance FastAPI backend.

Designed from the ground up for cinematic dark aesthetics, instant navigation, and complete legal compliance, KUROMI integrates seamlessly with AniList's GraphQL ecosystem and official licensed streaming services.

---

## 🌟 Key Features

### 🖥️ Full-Screen Visual Experience
- **Edge-to-Edge Responsive Layout**: Fully responsive interface engineered to maximize screen real estate across ultrawide monitors, desktops, laptops, tablets, and mobile devices.
- **Dynamic Color Extraction**: Spotlight hero cards and detail banners extract and apply dominant color accents dynamically to glowing badges, buttons, and progress rings.
- **Cinematic Dark Design**: Built with deep zinc neutrals, subtle border glassmorphism, glowing accents, and fluid micro-animations powered by Framer Motion.

### 🔍 Discovery & Exploration
- **Spotlight Hero Slider**: Featuring top trending anime with 8-second auto-rotation, teaser synopsis, trailer modal, and quick watch links.
- **Advanced Multi-Filter Search**: Filter by genres (multi-select), release year, season, format (TV, Movie, OVA, ONA, Special), airing status, and sort criteria.
- **Command Palette (`Ctrl+K` / `Cmd+K`)**: Instant search dialog with live autocomplete, keyboard navigation, and quick links.
- **Dynamic Franchise Timeline**: Interactive visual timeline tracing prequels, sequels, spin-offs, and alternative versions.
- **Dedicated Hubs**: Pages for `/trending`, `/popular`, `/top-rated`, `/upcoming`, `/movies`, `/random`, `/schedule`, and `/genre/[slug]`.

### ⏱️ Airing Schedule & Calendar
- **Interactive 7-Day Airing Calendar**: Auto-converted to local user timezone with live countdown timers.
- **"My Watchlist Only" Filter**: Toggle to isolate airing episodes only for anime currently in your watchlist.

### 🎬 Watch Hub & Player
- **Official Legal Streaming Integrations**: One-click deep links to licensed providers (Crunchyroll, Netflix, HIDIVE, Hulu, Amazon Prime, YouTube).
- **Embedded Custom Video Player**: Powered by `hls.js` with custom controls, resolution quality selector, playback speed, skip intro (+85s), cinema lights-off mode, and keyboard shortcuts (`Space`, `F`, `M`, `J`, `L`, `0-9`).

### 📚 Library Tracking & Watchlist
- **Comprehensive Status Tracking**: Watching, Plan to Watch, Completed, On Hold, Dropped.
- **Quick Progress Increment**: Increment watched episodes directly from the card with automatic completion detection.
- **One-Click AniList Sync**: Import your entire public anime library from AniList by simply typing your username.
- **JSON Import & Export**: Download and restore full library backups locally.

### 🎨 Customization & AMOLED Mode
- **Theme Accent Switcher**: Choose from Kuromi Violet, Emerald Blossom, Cyber Rose, Neon Cyan, Amber Sunset, and Electric Indigo.
- **AMOLED Pitch-Black Mode**: High-contrast true-black mode for OLED displays.
- **Title Language Selector**: Toggle display names across English, Romaji, and Native Japanese.

---

## 🚀 Quick Start

### 1. Prerequisites
- **Node.js**: v18.18+ or v20+
- **Python**: 3.10+ (tested through Python 3.14)
- **Git**

### 2. Clone Repository
```bash
git clone https://github.com/aryaniiil/kuhi-anime-api.git
cd anime-api
```

### 3. Backend Setup (FastAPI)
```bash
# Create and activate virtual environment
python -m venv venv
# Windows:
.\venv\Scripts\activate
# macOS/Linux:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Start backend development server
python -m uvicorn api:app --reload --port 8000
```
Backend will be live at `http://127.0.0.1:8000` with interactive Swagger docs at `http://127.0.0.1:8000/docs`.

### 4. Frontend Setup (Next.js)
```bash
cd frontend
npm install
npm run dev
```
Frontend will be live at `http://localhost:3000`.

---

## 🐳 Docker Deployment

Run the entire stack with Docker Compose:

```bash
docker-compose up --build
```

- **Frontend**: `http://localhost:3000`
- **Backend API**: `http://localhost:8000`
- **Health Check**: `http://localhost:8000/health`

---

## 🏷️ Single-Config Rebranding

Renaming the application is effortless:

1. **Backend**: Open `backend/app/config.py` and modify `APP_NAME`:
   ```python
   APP_NAME: str = "MY_APP_NAME"
   ```
2. **Frontend**: Open `frontend/src/lib/constants.ts` and modify `SITE_CONFIG`:
   ```typescript
   export const SITE_CONFIG = {
     name: "MY_APP_NAME",
     description: "...",
     // ...
   };
   ```

---

## 🧪 Testing

Execute the automated backend test suite:

```bash
python -m pytest backend/tests/test_api.py -v
```

All 7 core test suites cover:
- Health and system check (`test_health`)
- Spotlight hero aggregation (`test_spotlight`)
- Trending anime feed (`test_trending`)
- Detail view, franchise relations & recommendations (`test_anime_detail`)
- Search filtering and live autocomplete suggestions (`test_search_and_suggestions`)
- Airing schedule calendar (`test_schedule`)
- User authentication, JWT tokens, and watchlist management (`test_auth_and_user_watchlist`)

---

## 📁 Project Architecture

```
anime-api/
├── backend/
│   ├── app/
│   │   ├── graphql/         # AniList GraphQL queries
│   │   ├── models/          # SQLAlchemy ORM models (User, Watchlist, History)
│   │   ├── routers/         # API endpoints (anime, search, schedule, people, auth, user)
│   │   ├── schemas/         # Pydantic v2 validation models
│   │   ├── services/        # AniList async client, TTL cache & transformers
│   │   ├── config.py        # Centralized app configuration & JWT settings
│   │   ├── database.py      # SQLAlchemy session manager & engine
│   │   ├── deps.py          # Auth dependencies & token hashing
│   │   └── main.py          # FastAPI application entrypoint
│   ├── src/                 # Extraction engine & streaming providers (kaa, anizone, hianime, etc.)
│   ├── tests/               # Pytest automated test suites
│   ├── Dockerfile           # Backend container specification
│   ├── requirements.txt     # Python backend dependencies
│   └── api.py               # Backend standalone entrypoint
├── frontend/
│   ├── src/
│   │   ├── app/             # Next.js 16 App Router pages
│   │   ├── components/      # UI components, headers, players, carousels, command palette
│   │   ├── hooks/           # Debounce & custom client hooks
│   │   ├── lib/             # API client, utilities, and constants
│   │   ├── stores/          # Zustand global state (auth, watchlist, history, preferences)
│   │   └── types/           # TypeScript interfaces & types
│   ├── Dockerfile           # Multi-stage production container
│   ├── tailwind.config.ts   # Design tokens & color system
│   └── next.config.mjs      # Turbopack & proxy configuration
├── docker-compose.yml       # Production orchestration
├── requirements.txt         # Root Python requirements
├── api.py                   # Root runner shortcut
└── README.md                # Documentation
```

---

## ⚖️ Legal & Compliance Notice

KUROMI utilizes official, publicly available APIs including the **AniList GraphQL API** for metadata, synopsis, character details, schedules, and licensed streaming links, alongside the **YouTube API** for trailers. 

KUROMI does not host, stream, scrape, or distribute unauthorized, pirated, or copyrighted video content. All watch features direct users to authorized and licensed distributors (e.g., Crunchyroll, Netflix, HIDIVE, Hulu, Amazon Prime).

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).
