import {
  AnimeCardData,
  AnimeDetailData,
  PaginationResponse,
  SuggestionItem,
  CharacterItem,
  StaffItem,
  RelationItem,
  RecommendationItem,
  ScheduleItem,
  DaySchedule,
  ReviewItem,
  StreamExtractionResult,
  ProviderStatus,
} from "@/types/anime";
import { User, WatchlistItem, HistoryItem, UserSettings } from "@/types/user";
import { anilist } from "./anilist";

// Base API URL
const BACKEND_TARGET =
  process.env.BACKEND_URL ||
  process.env.INTERNAL_API_URL?.replace(/\/api\/v1\/?$/, "") ||
  "http://127.0.0.1:8000";

const API_BASE =
  typeof window === "undefined"
    ? `${BACKEND_TARGET}/api/v1`
    : (process.env.NEXT_PUBLIC_API_URL || "/api/v1");

interface FetchOptions extends RequestInit {
  params?: Record<string, any>;
  retries?: number;
}

async function request<T>(endpoint: string, options: FetchOptions = {}): Promise<T> {
  const { params, retries = 1, ...customConfig } = options;

  let url = `${API_BASE}${endpoint.startsWith("/") ? endpoint : `/${endpoint}`}`;
  if (params) {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== "") {
        searchParams.append(key, String(value));
      }
    });
    const queryString = searchParams.toString();
    if (queryString) {
      url += (url.includes("?") ? "&" : "?") + queryString;
    }
  }

  const isServer = typeof window === "undefined";
  const isAuthOrUser = endpoint.startsWith("/auth") || endpoint.startsWith("/user");

  const defaultHeaders: HeadersInit = {
    "Content-Type": "application/json",
  };

  const config: RequestInit = {
    ...customConfig,
    headers: {
      ...defaultHeaders,
      ...customConfig.headers,
    },
    ...(isAuthOrUser
      ? { credentials: "include" as const, cache: "no-store" as const }
      : isServer
      ? { next: { revalidate: 300 } as any }
      : {}),
  };

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const response = await fetch(url, config);

      if (!response.ok) {
        if (response.status === 429 && attempt < retries) {
          await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)));
          continue;
        }
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || errorData.message || `HTTP ${response.status} Error`);
      }

      return (await response.json()) as T;
    } catch (err: any) {
      if (attempt === retries) throw err;
      await new Promise((r) => setTimeout(r, 500 * (attempt + 1)));
    }
  }

  throw new Error("Network request failed after retries");
}

export const api = {
  // Discovery: direct high-speed queries on server, or route-handler queries on client
  getSpotlight: () =>
    typeof window === "undefined"
      ? anilist.getSpotlight()
      : request<AnimeCardData[]>("/anime/spotlight"),

  getTrending: (page = 1, perPage = 20) =>
    typeof window === "undefined"
      ? anilist.getTrending(page, perPage)
      : request<PaginationResponse<AnimeCardData>>("/anime/trending", { params: { page, perPage } }),

  getPopular: (page = 1, perPage = 20) =>
    typeof window === "undefined"
      ? anilist.getPopular(page, perPage)
      : request<PaginationResponse<AnimeCardData>>("/anime/popular", { params: { page, perPage } }),

  getTopRated: (page = 1, perPage = 20) =>
    typeof window === "undefined"
      ? anilist.getTopRated(page, perPage)
      : request<PaginationResponse<AnimeCardData>>("/anime/top-rated", { params: { page, perPage } }),

  getUpcoming: (page = 1, perPage = 20) =>
    typeof window === "undefined"
      ? anilist.getUpcoming(page, perPage)
      : request<PaginationResponse<AnimeCardData>>("/anime/upcoming", { params: { page, perPage } }),

  getTopAiring: (page = 1, perPage = 20) =>
    typeof window === "undefined"
      ? anilist.getTopAiring(page, perPage)
      : request<PaginationResponse<AnimeCardData>>("/anime/top-airing", { params: { page, perPage } }),

  getJustFinished: (page = 1, perPage = 20) =>
    typeof window === "undefined"
      ? anilist.getJustFinished(page, perPage)
      : request<PaginationResponse<AnimeCardData>>("/anime/just-finished", { params: { page, perPage } }),

  getTopMovies: (page = 1, perPage = 20) =>
    typeof window === "undefined"
      ? anilist.getTopMovies(page, perPage)
      : request<PaginationResponse<AnimeCardData>>("/anime/top-movies", { params: { page, perPage } }),

  getSeasonal: (year?: number, season?: string, page = 1, perPage = 24) =>
    typeof window === "undefined"
      ? anilist.getSeasonal(year, season, page, perPage)
      : request<PaginationResponse<AnimeCardData>>("/anime/seasonal", { params: { year, season, page, perPage } }),

  filterAnime: (params: Record<string, any>) =>
    typeof window === "undefined"
      ? anilist.filterAnime(params)
      : request<PaginationResponse<AnimeCardData>>("/anime/filter", { params }),

  getGenres: () =>
    typeof window === "undefined"
      ? anilist.getGenres()
      : request<string[]>("/anime/genres"),

  getTags: () =>
    typeof window === "undefined"
      ? anilist.getTags()
      : request<Array<{ id: number; name: string; description: string; category: string }>>("/anime/tags"),

  getRandomAnime: () =>
    typeof window === "undefined"
      ? anilist.getRandomAnime()
      : request<{ id: number; title: string }>("/anime/random"),

  // Search
  search: (q: string, page = 1, perPage = 24) =>
    typeof window === "undefined"
      ? anilist.search(q, page, perPage)
      : request<PaginationResponse<AnimeCardData>>("/search", { params: { q, page, perPage } }),

  getSuggestions: (q: string) =>
    typeof window === "undefined"
      ? anilist.getSuggestions(q)
      : request<SuggestionItem[]>("/search/suggestions", { params: { q } }),

  // Detail
  getAnimeDetail: (id: number | string) =>
    typeof window === "undefined"
      ? anilist.getAnimeDetail(id)
      : request<AnimeDetailData>(`/anime/${id}`),

  getAnimeCharacters: (id: number | string, page = 1, perPage = 25) =>
    typeof window === "undefined"
      ? anilist.getAnimeCharacters(id, page, perPage)
      : request<PaginationResponse<CharacterItem>>(`/anime/${id}/characters`, { params: { page, perPage } }),

  getAnimeStaff: (id: number | string, page = 1, perPage = 25) =>
    typeof window === "undefined"
      ? anilist.getAnimeStaff(id, page, perPage)
      : request<PaginationResponse<StaffItem>>(`/anime/${id}/staff`, { params: { page, perPage } }),

  getAnimeRelations: (id: number | string) =>
    typeof window === "undefined"
      ? anilist.getAnimeRelations(id)
      : request<RelationItem[]>(`/anime/${id}/relations`),

  getAnimeRecommendations: (id: number | string, page = 1, perPage = 12) =>
    typeof window === "undefined"
      ? anilist.getAnimeRecommendations(id, page, perPage)
      : request<PaginationResponse<RecommendationItem>>(`/anime/${id}/recommendations`, { params: { page, perPage } }),

  getAnimeEpisodes: (id: number | string, existingMedia?: any) =>
    typeof window === "undefined"
      ? anilist.getAnimeEpisodes(id, existingMedia)
      : request<Array<{ number: number; title: string; thumbnail?: string; url?: string; site?: string; airingAt?: number; isAired?: boolean }>>(`/anime/${id}/episodes`),

  getAnimeReviews: (id: number | string, malId?: number | null) =>
    typeof window === "undefined"
      ? anilist.getAnimeReviews(id, malId)
      : request<ReviewItem[]>(`/anime/${id}/reviews`),

  // Schedule
  getSchedule: (date?: string, tz?: string) =>
    typeof window === "undefined"
      ? anilist.getSchedule(date, tz)
      : request<{ date: string; total: number; results: ScheduleItem[] }>("/schedule", { params: { date, tz } }),

  getWeekSchedule: () =>
    typeof window === "undefined"
      ? anilist.getWeekSchedule()
      : request<DaySchedule[]>("/schedule/week"),

  // People & Studios
  getCharacter: (id: number | string) =>
    typeof window === "undefined"
      ? anilist.getCharacter(id)
      : request<any>(`/character/${id}`),

  getStaff: (id: number | string) =>
    typeof window === "undefined"
      ? anilist.getStaff(id)
      : request<any>(`/staff/${id}`),

  getStudio: (id: number | string, page = 1, perPage = 24) =>
    typeof window === "undefined"
      ? anilist.getStudio(id, page, perPage)
      : request<any>(`/studio/${id}`, { params: { page, perPage } }),

  // Auth: always routed to Cloudflare Worker + D1
  register: (data: { email: string; username: string; password: string }) =>
    request<{ accessToken: string; tokenType: string; user: User }>("/auth/register", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  login: (data: { email: string; password: string }) =>
    request<{ accessToken: string; tokenType: string; user: User }>("/auth/login", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  logout: () => request<{ message: string }>("/auth/logout", { method: "POST" }),
  getMe: () => request<User | null>("/auth/me"),

  // User Library: always routed to Cloudflare Worker + D1
  getWatchlist: (status?: string) =>
    request<WatchlistItem[]>("/user/watchlist", { params: { status } }),

  updateWatchlist: (data: any) =>
    request<WatchlistItem>("/user/watchlist", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  patchWatchlist: (animeId: number, data: any) =>
    request<WatchlistItem>(`/user/watchlist/${animeId}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),

  deleteWatchlistItem: (animeId: number) =>
    request<{ message: string }>(`/user/watchlist/${animeId}`, {
      method: "DELETE",
    }),

  getHistory: (limit = 20) =>
    request<HistoryItem[]>("/user/history", { params: { limit } }),

  updateHistory: (data: any) =>
    request<HistoryItem | null>("/user/history", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  getSettings: () => request<UserSettings>("/user/settings"),

  updateSettings: (data: Partial<UserSettings>) =>
    request<UserSettings>("/user/settings", {
      method: "PATCH",
      body: JSON.stringify(data),
    }),

  // Native Streaming & Extraction Engine (routed to Cloudflare Worker)
  extractEpisode: (
    animeId: number | string,
    episode = 1,
    type: "sub" | "dub" = "sub",
    provider?: string
  ) =>
    request<StreamExtractionResult>(`/extract/${animeId}`, {
      params: { e: episode, type, provider },
      retries: 1,
    }),

  getStreamEpisodes: (animeId: number) =>
    request<any>(`/episodes/${animeId}`),

  getProviderStatus: () =>
    request<ProviderStatus>("/providers/status"),
};
