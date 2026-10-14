export interface User {
  id: number;
  email: string;
  username: string;
  avatar?: string | null;
  createdAt?: string | null;
}

export type WatchlistStatus = "WATCHING" | "PLANNING" | "COMPLETED" | "PAUSED" | "DROPPED";

export interface WatchlistItem {
  id: number;
  animeId: number;
  animeTitle: string;
  animePoster: string | null;
  animeFormat: string | null;
  animeYear: number | null;
  status: WatchlistStatus;
  progress: number;
  totalEpisodes: number | null;
  score: number | null;
  notes: string | null;
  updatedAt: string | null;
}

export interface HistoryItem {
  id: number;
  animeId: number;
  animeTitle: string;
  animePoster: string | null;
  episode: number;
  episodeTitle: string | null;
  playbackPosition: number; // in seconds
  playbackDuration: number; // in seconds
  updatedAt: string | null;
}

export interface UserSettings {
  titleLanguage: "english" | "romaji" | "native";
  themeAccent: string;
  adultFilter: boolean;
}
