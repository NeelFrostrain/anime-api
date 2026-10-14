export interface AnimeTitle {
  romaji: string;
  english: string;
  native: string;
  userPreferred: string;
}

export interface AnimeCover {
  extraLarge: string;
  large: string;
  medium: string;
  color: string;
}

export interface DateInfo {
  year: number | null;
  month: number | null;
  day: number | null;
}

export interface NextAiringEpisode {
  airingAt: number;
  timeUntilAiring: number;
  episode: number;
}

export interface Trailer {
  id: string | null;
  site: string | null;
  thumbnail: string | null;
}

export interface AnimeCardData {
  id: number;
  idMal?: number | null;
  title: AnimeTitle;
  coverImage: AnimeCover;
  accentColor: string;
  bannerImage: string | null;
  format: string | null;
  status: string | null;
  description: string | null;
  episodes: number | null;
  duration: number | null;
  season: string | null;
  seasonYear: number | null;
  startDate: DateInfo | null;
  averageScore: number | null;
  meanScore: number | null;
  popularity: number | null;
  favourites: number | null;
  genres: string[];
  countryOfOrigin: string | null;
  isAdult: boolean;
  nextAiringEpisode: NextAiringEpisode | null;
  trailer: Trailer | null;
  streamingPlatforms?: Array<{ site: string; url: string }>;
}

export interface Studio {
  id: number;
  name: string;
  isMain: boolean;
  isAnimationStudio: boolean;
}

export interface Tag {
  id: number;
  name: string;
  description: string | null;
  rank: number | null;
  isMediaSpoiler: boolean;
}

export interface ExternalLink {
  id: number;
  url: string;
  site: string;
  type?: string | null;
  icon?: string | null;
  color?: string | null;
  language?: string | null;
}

export interface StreamingEpisode {
  title: string | null;
  thumbnail: string | null;
  url: string | null;
  site: string | null;
}

export interface AiringHistory {
  id: number;
  airingAt: number;
  episode: number;
  timeUntilAiring: number | null;
}

export interface AnimeDetailData extends AnimeCardData {
  endDate: DateInfo | null;
  synonyms: string[];
  source: string | null;
  studios: Studio[];
  tags: Tag[];
  externalLinks: ExternalLink[];
  streamingLinks: ExternalLink[];
  airingScheduleHistory: AiringHistory[];
  streamingEpisodes: StreamingEpisode[];
}

export interface VoiceActor {
  id: number;
  name: string;
  native: string | null;
  language: string;
  image: string;
}

export interface CharacterItem {
  id: number;
  role: string | null;
  name: {
    full: string;
    native: string;
  };
  image: string;
  voiceActors: VoiceActor[];
}

export interface StaffItem {
  id: number;
  role: string | null;
  name: {
    full: string;
    native: string;
  };
  image: string;
  occupations: string[];
}

export interface RelationItem {
  relationType: string;
  id: number;
  title: AnimeTitle;
  format: string | null;
  status: string | null;
  coverImage: {
    large: string;
    color: string;
  };
  averageScore: number | null;
  year: number | null;
}

export interface RecommendationItem {
  id: number;
  rating: number | null;
  userRating: string | null;
  title: AnimeTitle;
  coverImage: {
    large: string;
    color: string;
  };
  format: string | null;
  status: string | null;
  episodes: number | null;
  averageScore: number | null;
  year: number | null;
}

export interface ScheduleItem {
  id: number;
  airingAt: number;
  episode: number;
  timeUntilAiring: number | null;
  media: AnimeCardData;
}

export interface DaySchedule {
  date: string;
  dayOfWeek: string;
  fullDayName: string;
  isToday: boolean;
  count: number;
  episodes: ScheduleItem[];
}

export interface SuggestionItem {
  id: number;
  title: string;
  titleRomaji: string;
  poster: string;
  color: string;
  format: string | null;
  status: string | null;
  year: number | null;
  episodes: number | null;
  score: number | null;
}

export interface PaginationResponse<T> {
  page: number;
  perPage: number;
  total: number;
  hasNextPage: boolean;
  results: T[];
}

export interface ReviewItem {
  id: number;
  username: string;
  avatar: string | null;
  score: number | null;
  date: string | null;
  review: string;
  tags: string[];
  reactions: Record<string, any>;
}

export interface SubtitleTrack {
  url: string;
  lang?: string;
  language?: string;
  label?: string;
  srclang?: string;
  format?: string;
  default?: boolean;
  referer?: string;
}

export interface StreamSource {
  url: string;
  type?: string; // "hls", "mp4", "embed"
  quality?: string;
  audio?: "sub" | "dub" | "raw";
  server?: string;
  embed?: string;
  referer?: string;
  priority?: number;
  isActive?: boolean;
  isM3U8?: boolean;
  subtitles?: SubtitleTrack[];
}

export interface StreamExtractionResult {
  anilistId: number;
  episode: number;
  type: "sub" | "dub";
  provider: string;
  defaultProvider?: string;
  requestedProvider?: string;
  streams: StreamSource[];
  subtitles: SubtitleTrack[];
}

export interface ProviderStatus {
  defaultProvider: string;
  ranking: string[];
  available: string[];
  latency: Record<string, { avg_seconds: number | null; episodes_seconds: number | null; failures: number }>;
}
