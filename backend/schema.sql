-- Kuromi Anime API - Cloudflare D1 Database Schema

-- 1. Users Table
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE NOT NULL,
    username TEXT UNIQUE NOT NULL,
    hashed_password TEXT NOT NULL,
    avatar TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);

-- 2. User Settings Table
CREATE TABLE IF NOT EXISTS user_settings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title_language TEXT DEFAULT 'english',
    theme_accent TEXT DEFAULT '#8b7cf6',
    adult_filter INTEGER DEFAULT 1
);

CREATE INDEX IF NOT EXISTS idx_user_settings_user_id ON user_settings(user_id);

-- 3. Watchlist Items Table
CREATE TABLE IF NOT EXISTS watchlist_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    anime_id INTEGER NOT NULL,
    anime_title TEXT NOT NULL,
    anime_poster TEXT,
    anime_format TEXT,
    anime_year INTEGER,
    status TEXT DEFAULT 'PLANNING', -- WATCHING, PLANNING, COMPLETED, PAUSED, DROPPED
    progress INTEGER DEFAULT 0,
    total_episodes INTEGER,
    score REAL,
    notes TEXT,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, anime_id)
);

CREATE INDEX IF NOT EXISTS idx_watchlist_user_id ON watchlist_items(user_id);
CREATE INDEX IF NOT EXISTS idx_watchlist_status ON watchlist_items(status);
CREATE INDEX IF NOT EXISTS idx_watchlist_anime_id ON watchlist_items(anime_id);

-- 4. History Items Table
CREATE TABLE IF NOT EXISTS history_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    anime_id INTEGER NOT NULL,
    anime_title TEXT NOT NULL,
    anime_poster TEXT,
    episode INTEGER DEFAULT 1,
    episode_title TEXT,
    playback_position REAL DEFAULT 0.0,
    playback_duration REAL DEFAULT 0.0,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, anime_id)
);

CREATE INDEX IF NOT EXISTS idx_history_user_id ON history_items(user_id);
CREATE INDEX IF NOT EXISTS idx_history_anime_id ON history_items(anime_id);
CREATE INDEX IF NOT EXISTS idx_history_updated_at ON history_items(updated_at DESC);
