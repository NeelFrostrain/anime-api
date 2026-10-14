export interface Bindings {
  DB: D1Database;
  KV: KVNamespace;
  APP_NAME?: string;
  JWT_SECRET?: string;
  ACCESS_TOKEN_EXPIRE_SECONDS?: string;
  COOKIE_NAME?: string;
  ANILIST_GRAPHQL_URL?: string;
}

export interface UserRow {
  id: number;
  email: string;
  username: string;
  hashed_password: string;
  avatar: string | null;
  created_at: string;
}

export interface UserSettingsRow {
  id: number;
  user_id: number;
  title_language: string;
  theme_accent: string;
  adult_filter: number;
}

export interface WatchlistRow {
  id: number;
  user_id: number;
  anime_id: number;
  anime_title: string;
  anime_poster: string | null;
  anime_format: string | null;
  anime_year: number | null;
  status: string;
  progress: number;
  total_episodes: number | null;
  score: number | null;
  notes: string | null;
  updated_at: string;
}

export interface HistoryRow {
  id: number;
  user_id: number;
  anime_id: number;
  anime_title: string;
  anime_poster: string | null;
  episode: number;
  episode_title: string | null;
  playback_position: number;
  playback_duration: number;
  updated_at: string;
}

export interface JWTPayload {
  sub: string;
  email: string;
  username: string;
  exp: number;
  iat: number;
}
