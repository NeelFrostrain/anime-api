export const SITE_CONFIG = {
  name: "KUROMI",
  tagline: "Discover, Track, and Explore Anime",
  description: "A cinematic, modern anime discovery and tracking platform powered by AniList. Track your watchlist, discover seasonal gems, and view official legal streams.",
  author: "KUROMI Team",
  url: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
  apiBaseUrl: process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1",
  disclaimer: "Metadata provided by AniList and legal partners. This site does not host, upload, or stream any copyrighted video files.",
  defaultAccent: "#8b7cf6",
};

export const NAV_ITEMS = [
  { label: "Home", href: "/" },
  { label: "Browse", href: "/browse" },
  { label: "Trending", href: "/trending" },
  { label: "Popular", href: "/popular" },
  { label: "Top Rated", href: "/top-rated" },
  { label: "Upcoming", href: "/upcoming" },
  { label: "Movies", href: "/movies" },
  { label: "Schedule", href: "/schedule" },
];

export const GENRES = [
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
];

export const FORMATS = [
  { label: "TV Show", value: "TV" },
  { label: "Movie", value: "MOVIE" },
  { label: "TV Short", value: "TV_SHORT" },
  { label: "Special", value: "SPECIAL" },
  { label: "OVA", value: "OVA" },
  { label: "ONA", value: "ONA" },
  { label: "Music", value: "MUSIC" },
];

export const STATUS_OPTIONS = [
  { label: "Airing", value: "RELEASING" },
  { label: "Finished", value: "FINISHED" },
  { label: "Not Yet Aired", value: "NOT_YET_RELEASED" },
  { label: "Cancelled", value: "CANCELLED" },
  { label: "Hiatus", value: "HIATUS" },
];

export const SEASONS = ["WINTER", "SPRING", "SUMMER", "FALL"] as const;

export const WATCHLIST_STATUS_LABELS: Record<string, { label: string; color: string }> = {
  WATCHING: { label: "Watching", color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20" },
  PLANNING: { label: "Plan to Watch", color: "text-blue-400 bg-blue-500/10 border-blue-500/20" },
  COMPLETED: { label: "Completed", color: "text-purple-400 bg-purple-500/10 border-purple-500/20" },
  PAUSED: { label: "On Hold", color: "text-amber-400 bg-amber-500/10 border-amber-500/20" },
  DROPPED: { label: "Dropped", color: "text-rose-400 bg-rose-500/10 border-rose-500/20" },
};

export const EXTRACTION_PROVIDERS = [
  { id: "auto", name: "Auto (Fastest Race)", shortName: "Auto", detail: "Fastest Race" },
  { id: "anibd", name: "AniBD", shortName: "AniBD", detail: "Direct / Raw" },
  { id: "anikoto", name: "Anikoto", shortName: "Anikoto", detail: "HLS Stream" },
  { id: "animegg", name: "Animegg", shortName: "Animegg", detail: "MP4 / HLS" },
  { id: "animeonsen", name: "AnimeOnsen", shortName: "AnimeOnsen", detail: "Multi-Quality" },
  { id: "anineko", name: "Anineko", shortName: "Anineko", detail: "HD Stream" },
  { id: "aniwaves", name: "Aniwaves", shortName: "Aniwaves", detail: "HD Multi-Audio" },
  { id: "anizone", name: "Anizone", shortName: "Anizone", detail: "Clean HLS" },
  { id: "kaa", name: "Kaa", shortName: "Kaa", detail: "Dual Audio" },
  { id: "miruro", name: "Miruro", shortName: "Miruro", detail: "Multi-Source Pipe" },
  { id: "mkissa", name: "MKissa", shortName: "MKissa", detail: "Multi-Host" },
  { id: "reanime", name: "Reanime", shortName: "Reanime", detail: "Multi-Sub Softsubs" },
] as const;

export const PROVIDER_NAMES: Record<string, string> = {
  auto: "Auto (Fastest)",
  anibd: "AniBD",
  anikoto: "Anikoto",
  animegg: "Animegg",
  animeonsen: "AnimeOnsen",
  anineko: "Anineko",
  aniwaves: "Aniwaves",
  anizone: "Anizone",
  kaa: "Kaa",
  miruro: "Miruro",
  mkissa: "MKissa",
  reanime: "Reanime",
};
