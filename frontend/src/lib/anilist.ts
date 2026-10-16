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
} from "@/types/anime";

const ANILIST_URL = "https://graphql.anilist.co";

export const MEDIA_FRAGMENT = `
fragment MediaFields on Media {
  id
  idMal
  title {
    romaji
    english
    native
    userPreferred
  }
  synonyms
  coverImage {
    extraLarge
    large
    medium
    color
  }
  bannerImage
  format
  status
  description(asHtml: false)
  episodes
  duration
  season
  seasonYear
  startDate {
    year
    month
    day
  }
  endDate {
    year
    month
    day
  }
  averageScore
  meanScore
  popularity
  favourites
  genres
  countryOfOrigin
  isAdult
  nextAiringEpisode {
    airingAt
    timeUntilAiring
    episode
  }
}
`;

export const SPOTLIGHT_QUERY = `
${MEDIA_FRAGMENT}
query GetSpotlight {
  Page(page: 1, perPage: 10) {
    media(type: ANIME, sort: [TRENDING_DESC, POPULARITY_DESC], isAdult: false) {
      ...MediaFields
      trailer {
        id
        site
        thumbnail
      }
    }
  }
}
`;

export const TRENDING_QUERY = `
${MEDIA_FRAGMENT}
query GetTrending($page: Int = 1, $perPage: Int = 20) {
  Page(page: $page, perPage: $perPage) {
    pageInfo {
      total
      perPage
      currentPage
      lastPage
      hasNextPage
    }
    media(type: ANIME, sort: TRENDING_DESC, isAdult: false) {
      ...MediaFields
    }
  }
}
`;

export const POPULAR_QUERY = `
${MEDIA_FRAGMENT}
query GetPopular($page: Int = 1, $perPage: Int = 20) {
  Page(page: $page, perPage: $perPage) {
    pageInfo {
      total
      perPage
      currentPage
      lastPage
      hasNextPage
    }
    media(type: ANIME, sort: POPULARITY_DESC, isAdult: false) {
      ...MediaFields
    }
  }
}
`;

export const TOP_RATED_QUERY = `
${MEDIA_FRAGMENT}
query GetTopRated($page: Int = 1, $perPage: Int = 20) {
  Page(page: $page, perPage: $perPage) {
    pageInfo {
      total
      perPage
      currentPage
      lastPage
      hasNextPage
    }
    media(type: ANIME, sort: SCORE_DESC, isAdult: false) {
      ...MediaFields
    }
  }
}
`;

export const UPCOMING_QUERY = `
${MEDIA_FRAGMENT}
query GetUpcoming($page: Int = 1, $perPage: Int = 20) {
  Page(page: $page, perPage: $perPage) {
    pageInfo {
      total
      perPage
      currentPage
      lastPage
      hasNextPage
    }
    media(type: ANIME, status: NOT_YET_RELEASED, sort: POPULARITY_DESC, isAdult: false) {
      ...MediaFields
    }
  }
}
`;

export const TOP_AIRING_QUERY = `
${MEDIA_FRAGMENT}
query GetTopAiring($page: Int = 1, $perPage: Int = 20) {
  Page(page: $page, perPage: $perPage) {
    pageInfo {
      total
      perPage
      currentPage
      lastPage
      hasNextPage
    }
    media(type: ANIME, status: RELEASING, sort: [POPULARITY_DESC, SCORE_DESC], isAdult: false) {
      ...MediaFields
    }
  }
}
`;

export const JUST_FINISHED_QUERY = `
${MEDIA_FRAGMENT}
query GetJustFinished($page: Int = 1, $perPage: Int = 20) {
  Page(page: $page, perPage: $perPage) {
    pageInfo {
      total
      perPage
      currentPage
      lastPage
      hasNextPage
    }
    media(type: ANIME, status: FINISHED, sort: END_DATE_DESC, isAdult: false) {
      ...MediaFields
    }
  }
}
`;

export const TOP_MOVIES_QUERY = `
${MEDIA_FRAGMENT}
query GetTopMovies($page: Int = 1, $perPage: Int = 20) {
  Page(page: $page, perPage: $perPage) {
    pageInfo {
      total
      perPage
      currentPage
      lastPage
      hasNextPage
    }
    media(type: ANIME, format: MOVIE, sort: SCORE_DESC, isAdult: false) {
      ...MediaFields
    }
  }
}
`;

export const SEARCH_QUERY = `
${MEDIA_FRAGMENT}
query SearchAnime($search: String!, $page: Int = 1, $perPage: Int = 20) {
  Page(page: $page, perPage: $perPage) {
    pageInfo {
      total
      perPage
      currentPage
      lastPage
      hasNextPage
    }
    media(type: ANIME, search: $search, sort: SEARCH_MATCH, isAdult: false) {
      ...MediaFields
    }
  }
}
`;

export const SUGGESTIONS_QUERY = `
query Suggestions($search: String!) {
  Page(page: 1, perPage: 8) {
    media(type: ANIME, search: $search, sort: SEARCH_MATCH, isAdult: false) {
      id
      title {
        romaji
        english
        native
      }
      coverImage {
        medium
        large
        color
      }
      format
      status
      startDate {
        year
      }
      episodes
      averageScore
    }
  }
}
`;

export const SEASONAL_QUERY = `
${MEDIA_FRAGMENT}
query GetSeasonal($season: MediaSeason, $seasonYear: Int, $page: Int = 1, $perPage: Int = 24) {
  Page(page: $page, perPage: $perPage) {
    pageInfo {
      total
      perPage
      currentPage
      lastPage
      hasNextPage
    }
    media(type: ANIME, season: $season, seasonYear: $seasonYear, sort: POPULARITY_DESC, isAdult: false) {
      ...MediaFields
    }
  }
}
`;

export const GENRES_AND_TAGS_QUERY = `
query GetGenresAndTags {
  GenreCollection
  MediaTagCollection {
    id
    name
    description
    category
    isAdult
  }
}
`;

export const FILTER_QUERY = `
${MEDIA_FRAGMENT}
query FilterAnime(
  $page: Int = 1,
  $perPage: Int = 20,
  $search: String,
  $genres: [String],
  $tags: [String],
  $seasonYear: Int,
  $season: MediaSeason,
  $format: MediaFormat,
  $status: MediaStatus,
  $countryOfOrigin: CountryCode,
  $sort: [MediaSort] = [POPULARITY_DESC]
) {
  Page(page: $page, perPage: $perPage) {
    pageInfo {
      total
      perPage
      currentPage
      lastPage
      hasNextPage
    }
    media(
      type: ANIME,
      search: $search,
      genre_in: $genres,
      tag_in: $tags,
      seasonYear: $seasonYear,
      season: $season,
      format: $format,
      status: $status,
      countryOfOrigin: $countryOfOrigin,
      sort: $sort,
      isAdult: false
    ) {
      ...MediaFields
    }
  }
}
`;

export const DETAIL_QUERY = `
query GetAnimeDetail($id: Int!) {
  Media(id: $id, type: ANIME) {
    id
    idMal
    title {
      romaji
      english
      native
      userPreferred
    }
    synonyms
    coverImage {
      extraLarge
      large
      medium
      color
    }
    bannerImage
    format
    status
    description(asHtml: false)
    episodes
    duration
    season
    seasonYear
    startDate {
      year
      month
      day
    }
    endDate {
      year
      month
      day
    }
    averageScore
    meanScore
    popularity
    favourites
    trending
    genres
    tags {
      id
      name
      description
      rank
      isMediaSpoiler
    }
    countryOfOrigin
    isAdult
    source
    hashtag
    trailer {
      id
      site
      thumbnail
    }
    streamingEpisodes {
      title
      thumbnail
      url
      site
    }
    studios(isMain: true) {
      nodes {
        id
        name
        isAnimationStudio
      }
    }
    nextAiringEpisode {
      airingAt
      timeUntilAiring
      episode
    }
    characters(sort: [ROLE, RELEVANCE], perPage: 12) {
      edges {
        role
        node {
          id
          name {
            userPreferred
            native
          }
          image {
            medium
            large
          }
        }
        voiceActors(language: JAPANESE, sort: RELEVANCE) {
          id
          name {
            userPreferred
            native
          }
          image {
            medium
            large
          }
          languageV2
        }
      }
    }
    relations {
      edges {
        relationType(version: 2)
        node {
          id
          title {
            romaji
            english
            native
          }
          coverImage {
            large
          }
          bannerImage
          format
          type
          status
          episodes
          averageScore
          startDate {
            year
          }
        }
      }
    }
    recommendations(sort: RATING_DESC, perPage: 10) {
      nodes {
        mediaRecommendation {
          id
          title {
            romaji
            english
            native
          }
          coverImage {
            large
            extraLarge
          }
          bannerImage
          format
          episodes
          status
          averageScore
          startDate {
            year
          }
        }
      }
    }
  }
}
`;

export const SCHEDULE_QUERY = `
query GetSchedule($airingAt_greater: Int, $airingAt_lesser: Int, $page: Int = 1, $perPage: Int = 50) {
  Page(page: $page, perPage: $perPage) {
    pageInfo {
      total
      perPage
      currentPage
      lastPage
      hasNextPage
    }
    airingSchedules(
      airingAt_greater: $airingAt_greater,
      airingAt_lesser: $airingAt_lesser,
      sort: TIME
    ) {
      id
      airingAt
      timeUntilAiring
      episode
      media {
        id
        idMal
        title {
          romaji
          english
          native
          userPreferred
        }
        coverImage {
          extraLarge
          large
          medium
          color
        }
        bannerImage
        format
        status
        episodes
        duration
        averageScore
        popularity
        genres
        countryOfOrigin
        isAdult
        studios(isMain: true) {
          nodes {
            id
            name
          }
        }
      }
    }
  }
}
`;

export const CHARACTER_DETAIL_QUERY = `
query GetCharacterDetail($id: Int!) {
  Character(id: $id) {
    id
    name {
      userPreferred
      native
      alternative
    }
    image {
      large
      medium
    }
    description(asHtml: false)
    gender
    dateOfBirth {
      year
      month
      day
    }
    age
    bloodType
    favourites
    media(sort: POPULARITY_DESC, perPage: 25) {
      nodes {
        id
        title {
          romaji
          english
          userPreferred
        }
        coverImage {
          large
        }
        format
        startDate {
          year
        }
        averageScore
      }
    }
  }
}
`;

export const STAFF_DETAIL_QUERY = `
query GetStaffDetail($id: Int!) {
  Staff(id: $id) {
    id
    name {
      userPreferred
      native
    }
    image {
      large
      medium
    }
    description(asHtml: false)
    gender
    dateOfBirth {
      year
      month
      day
    }
    age
    homeTown
    favourites
    characterMedia(sort: POPULARITY_DESC, perPage: 25) {
      edges {
        characters {
          id
          name {
            userPreferred
          }
          image {
            medium
          }
        }
        node {
          id
          title {
            romaji
            english
          }
          coverImage {
            large
          }
          format
          startDate {
            year
          }
        }
      }
    }
  }
}
`;

export const STUDIO_DETAIL_QUERY = `
query GetStudioDetail($id: Int!, $page: Int = 1, $perPage: Int = 24) {
  Studio(id: $id) {
    id
    name
    isAnimationStudio
    favourites
    media(page: $page, perPage: $perPage, sort: [POPULARITY_DESC]) {
      pageInfo {
        total
        perPage
        currentPage
        lastPage
        hasNextPage
      }
      nodes {
        id
        title {
          romaji
          english
        }
        coverImage {
          large
          color
        }
        format
        status
        episodes
        averageScore
        startDate {
          year
        }
      }
    }
  }
}
`;

export const RANDOM_ANIME_QUERY = `
query GetRandomAnime($page: Int = 1) {
  Page(page: $page, perPage: 50) {
    media(type: ANIME, sort: POPULARITY_DESC, isAdult: false, format_in: [TV, MOVIE, OVA, ONA]) {
      id
    }
  }
}
`;

// In-memory query cache for AniList requests to avoid hitting AniList's rate limits
const anilistMemoryCache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL_MS = 60 * 1000; // 1 minute in-memory cache

// Direct AniList Fetcher running in Node.js (SSR) or browser
export async function queryAniListDirect<T = any>(
  query: string,
  variables: Record<string, any> = {}
): Promise<T> {
  const cacheKey = JSON.stringify({ query, variables });
  const cached = anilistMemoryCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.data as T;
  }

  const isServer = typeof window === "undefined";
  const fetchConfig: RequestInit = {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Accept": "application/json",
    },
    body: JSON.stringify({ query, variables }),
    ...(isServer ? { next: { revalidate: 300 } as any } : {}),
  };

  let response: Response | null = null;
  const retries = 2;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      response = await fetch(ANILIST_URL, fetchConfig);
      if (response.status === 429 && attempt < retries) {
        const retryAfter = parseInt(response.headers.get("Retry-After") || "2", 10);
        const delay = Math.min(Math.max(retryAfter * 1000, 1500), 5000);
        await new Promise((r) => setTimeout(r, delay));
        continue;
      }
      break;
    } catch (e) {
      if (attempt === retries) throw e;
      await new Promise((r) => setTimeout(r, 1000));
    }
  }

  if (!response || !response.ok) {
    const status = response?.status || 500;
    const errText = response ? await response.text() : "Network error";
    throw new Error(`AniList error ${status}: ${errText}`);
  }

  const result = (await response.json()) as { data?: T; errors?: any[] };
  if (result.errors && (!result.data || Object.keys(result.data).length === 0)) {
    throw new Error(`AniList GraphQL Error: ${result.errors[0]?.message || "Unknown error"}`);
  }

  if (result.data) {
    anilistMemoryCache.set(cacheKey, { data: result.data, timestamp: Date.now() });
    if (anilistMemoryCache.size > 200) {
      const firstKey = anilistMemoryCache.keys().next().value;
      if (firstKey) anilistMemoryCache.delete(firstKey);
    }
  }

  return result.data as T;
}

// Higher level data access methods
export const anilist = {
  getSpotlight: async (): Promise<AnimeCardData[]> => {
    const data = await queryAniListDirect(SPOTLIGHT_QUERY);
    return data?.Page?.media || [];
  },

  getTrending: async (page = 1, perPage = 20): Promise<PaginationResponse<AnimeCardData>> => {
    const data = await queryAniListDirect(TRENDING_QUERY, { page, perPage });
    const pageInfo = data?.Page?.pageInfo || {};
    return {
      page: pageInfo.currentPage || page,
      perPage: pageInfo.perPage || perPage,
      total: pageInfo.total || 0,
      hasNextPage: Boolean(pageInfo.hasNextPage),
      results: data?.Page?.media || [],
    };
  },

  getPopular: async (page = 1, perPage = 20): Promise<PaginationResponse<AnimeCardData>> => {
    const data = await queryAniListDirect(POPULAR_QUERY, { page, perPage });
    const pageInfo = data?.Page?.pageInfo || {};
    return {
      page: pageInfo.currentPage || page,
      perPage: pageInfo.perPage || perPage,
      total: pageInfo.total || 0,
      hasNextPage: Boolean(pageInfo.hasNextPage),
      results: data?.Page?.media || [],
    };
  },

  getTopRated: async (page = 1, perPage = 20): Promise<PaginationResponse<AnimeCardData>> => {
    const data = await queryAniListDirect(TOP_RATED_QUERY, { page, perPage });
    const pageInfo = data?.Page?.pageInfo || {};
    return {
      page: pageInfo.currentPage || page,
      perPage: pageInfo.perPage || perPage,
      total: pageInfo.total || 0,
      hasNextPage: Boolean(pageInfo.hasNextPage),
      results: data?.Page?.media || [],
    };
  },

  getTopAiring: async (page = 1, perPage = 20): Promise<PaginationResponse<AnimeCardData>> => {
    const data = await queryAniListDirect(TOP_AIRING_QUERY, { page, perPage });
    const pageInfo = data?.Page?.pageInfo || {};
    return {
      page: pageInfo.currentPage || page,
      perPage: pageInfo.perPage || perPage,
      total: pageInfo.total || 0,
      hasNextPage: Boolean(pageInfo.hasNextPage),
      results: data?.Page?.media || [],
    };
  },

  getUpcoming: async (page = 1, perPage = 20): Promise<PaginationResponse<AnimeCardData>> => {
    const data = await queryAniListDirect(UPCOMING_QUERY, { page, perPage });
    const pageInfo = data?.Page?.pageInfo || {};
    return {
      page: pageInfo.currentPage || page,
      perPage: pageInfo.perPage || perPage,
      total: pageInfo.total || 0,
      hasNextPage: Boolean(pageInfo.hasNextPage),
      results: data?.Page?.media || [],
    };
  },

  getJustFinished: async (page = 1, perPage = 20): Promise<PaginationResponse<AnimeCardData>> => {
    const data = await queryAniListDirect(JUST_FINISHED_QUERY, { page, perPage });
    const pageInfo = data?.Page?.pageInfo || {};
    return {
      page: pageInfo.currentPage || page,
      perPage: pageInfo.perPage || perPage,
      total: pageInfo.total || 0,
      hasNextPage: Boolean(pageInfo.hasNextPage),
      results: data?.Page?.media || [],
    };
  },

  getTopMovies: async (page = 1, perPage = 20): Promise<PaginationResponse<AnimeCardData>> => {
    const data = await queryAniListDirect(TOP_MOVIES_QUERY, { page, perPage });
    const pageInfo = data?.Page?.pageInfo || {};
    return {
      page: pageInfo.currentPage || page,
      perPage: pageInfo.perPage || perPage,
      total: pageInfo.total || 0,
      hasNextPage: Boolean(pageInfo.hasNextPage),
      results: data?.Page?.media || [],
    };
  },

  getSeasonal: async (year?: number, season?: string, page = 1, perPage = 24): Promise<PaginationResponse<AnimeCardData>> => {
    const data = await queryAniListDirect(SEASONAL_QUERY, {
      seasonYear: year,
      season: season?.toUpperCase(),
      page,
      perPage,
    });
    const pageInfo = data?.Page?.pageInfo || {};
    return {
      page: pageInfo.currentPage || page,
      perPage: pageInfo.perPage || perPage,
      total: pageInfo.total || 0,
      hasNextPage: Boolean(pageInfo.hasNextPage),
      results: data?.Page?.media || [],
    };
  },

  filterAnime: async (params: Record<string, any>): Promise<PaginationResponse<AnimeCardData>> => {
    const { page = 1, perPage = 20, search, genre, genres, tag, tags, year, season, format, status, sort } = params;
    const variables = {
      page: parseInt(String(page), 10) || 1,
      perPage: Math.min(50, parseInt(String(perPage), 10) || 20),
      search: search || undefined,
      genres: genres || (genre ? [genre] : undefined),
      tags: tags || (tag ? [tag] : undefined),
      seasonYear: year ? parseInt(String(year), 10) : undefined,
      season: season ? String(season).toUpperCase() : undefined,
      format: format ? String(format).toUpperCase() : undefined,
      status: status ? String(status).toUpperCase() : undefined,
      sort: sort ? [String(sort).toUpperCase()] : ["POPULARITY_DESC"],
    };

    const data = await queryAniListDirect(FILTER_QUERY, variables);
    const pageInfo = data?.Page?.pageInfo || {};
    return {
      page: pageInfo.currentPage || variables.page,
      perPage: pageInfo.perPage || variables.perPage,
      total: pageInfo.total || 0,
      hasNextPage: Boolean(pageInfo.hasNextPage),
      results: data?.Page?.media || [],
    };
  },

  getGenres: async (): Promise<string[]> => {
    const data = await queryAniListDirect(GENRES_AND_TAGS_QUERY);
    return data?.GenreCollection || [
      "Action", "Adventure", "Comedy", "Drama", "Ecchi", "Fantasy",
      "Horror", "Mahou Shoujo", "Mecha", "Music", "Mystery",
      "Psychological", "Romance", "Sci-Fi", "Slice of Life",
      "Sports", "Supernatural", "Thriller",
    ];
  },

  getTags: async (): Promise<Array<{ id: number; name: string; description: string; category: string }>> => {
    const data = await queryAniListDirect(GENRES_AND_TAGS_QUERY);
    const tags = data?.MediaTagCollection || [];
    return tags
      .filter((t: any) => !t.isAdult)
      .map((t: any) => ({
        id: t.id,
        name: t.name,
        description: t.description || "",
        category: t.category || "",
      }));
  },

  getRandomAnime: async (): Promise<{ id: number; title: string }> => {
    const randomPage = Math.floor(Math.random() * 5) + 1;
    const data = await queryAniListDirect(RANDOM_ANIME_QUERY, { page: randomPage });
    const list = data?.Page?.media || [];
    if (list.length === 0) return { id: 16498, title: "Attack on Titan" };
    const chosen = list[Math.floor(Math.random() * list.length)];
    return { id: chosen.id, title: chosen.title?.english || chosen.title?.romaji || "Anime" };
  },

  search: async (q: string, page = 1, perPage = 24): Promise<PaginationResponse<AnimeCardData>> => {
    if (!q.trim()) {
      return { page: 1, perPage, total: 0, hasNextPage: false, results: [] };
    }
    const data = await queryAniListDirect(SEARCH_QUERY, { search: q.trim(), page, perPage });
    const pageInfo = data?.Page?.pageInfo || {};
    return {
      page: pageInfo.currentPage || page,
      perPage: pageInfo.perPage || perPage,
      total: pageInfo.total || 0,
      hasNextPage: Boolean(pageInfo.hasNextPage),
      results: data?.Page?.media || [],
    };
  },

  getSuggestions: async (q: string): Promise<SuggestionItem[]> => {
    if (!q.trim()) return [];
    const data = await queryAniListDirect(SUGGESTIONS_QUERY, { search: q.trim() });
    const mediaList = data?.Page?.media || [];
    return mediaList.map((item: any) => ({
      id: item.id,
      title: item.title?.english || item.title?.romaji || "Anime",
      titleRomaji: item.title?.romaji || "",
      poster: item.coverImage?.large || item.coverImage?.medium || "",
      color: item.coverImage?.color || "#8b7cf6",
      format: item.format || null,
      status: item.status || null,
      year: item.startDate?.year || null,
      episodes: item.episodes || null,
      score: item.averageScore || null,
    }));
  },

  getAnimeDetail: async (id: number | string): Promise<AnimeDetailData> => {
    const numId = parseInt(String(id), 10);
    const data = await queryAniListDirect(DETAIL_QUERY, { id: numId });
    if (!data?.Media) throw new Error("Anime not found");
    const media = data.Media;
    const rawStudios =
      media.studios?.nodes ||
      media.studios?.edges?.map((e: any) => e.node) ||
      (Array.isArray(media.studios) ? media.studios : []);
    const studios = rawStudios.map((s: any) => ({
      id: s.id,
      name: s.name,
      isMain: s.isMain !== undefined ? s.isMain : true,
      isAnimationStudio: Boolean(s.isAnimationStudio),
    }));

    return {
      ...media,
      studios,
    } as AnimeDetailData;
  },

  getAnimeCharacters: async (id: number | string, page = 1, perPage = 25): Promise<PaginationResponse<CharacterItem>> => {
    const numId = parseInt(String(id), 10);
    const data = await queryAniListDirect(DETAIL_QUERY, { id: numId });
    const edges = data?.Media?.characters?.edges || [];
    return {
      page,
      perPage,
      total: edges.length,
      hasNextPage: false,
      results: edges.map((e: any) => ({
        id: e.node?.id,
        role: e.role,
        name: {
          full: e.node?.name?.userPreferred || "",
          native: e.node?.name?.native || "",
        },
        image: e.node?.image?.large || e.node?.image?.medium || "",
        voiceActors: (e.voiceActors || []).map((va: any) => ({
          id: va.id,
          name: va.name?.userPreferred || "",
          native: va.name?.native || null,
          language: va.languageV2 || "Japanese",
          image: va.image?.large || va.image?.medium || "",
        })),
      })),
    };
  },

  getAnimeStaff: async (id: number | string, page = 1, perPage = 25): Promise<PaginationResponse<StaffItem>> => {
    const numId = parseInt(String(id), 10);
    const data = await queryAniListDirect(DETAIL_QUERY, { id: numId });
    const studios = data?.Media?.studios?.nodes || [];
    return {
      page,
      perPage,
      total: studios.length,
      hasNextPage: false,
      results: studios.map((s: any) => ({
        id: s.id,
        role: s.isAnimationStudio ? "Animation Studio" : "Studio",
        name: { full: s.name, native: "" },
        image: "",
        occupations: [],
      })),
    };
  },

  getAnimeRelations: async (id: number | string): Promise<RelationItem[]> => {
    const numId = parseInt(String(id), 10);
    const data = await queryAniListDirect(DETAIL_QUERY, { id: numId });
    const relations = data?.Media?.relations?.edges || [];
    return relations.map((edge: any) => ({
      relationType: edge.relationType,
      id: edge.node?.id,
      title: edge.node?.title,
      format: edge.node?.format,
      status: edge.node?.status,
      coverImage: edge.node?.coverImage,
      averageScore: edge.node?.averageScore,
      year: edge.node?.startDate?.year,
    }));
  },

  getAnimeRecommendations: async (id: number | string, page = 1, perPage = 12): Promise<PaginationResponse<RecommendationItem>> => {
    const numId = parseInt(String(id), 10);
    const data = await queryAniListDirect(DETAIL_QUERY, { id: numId });
    const nodes = data?.Media?.recommendations?.nodes || [];
    const recs = nodes
      .filter((n: any) => n.mediaRecommendation)
      .map((n: any) => {
        const rec = n.mediaRecommendation;
        return {
          id: rec.id,
          rating: n.rating,
          userRating: n.userRating,
          title: rec.title,
          coverImage: rec.coverImage,
          format: rec.format,
          status: rec.status,
          episodes: rec.episodes,
          averageScore: rec.averageScore,
          year: rec.startDate?.year,
        };
      });
    return {
      page,
      perPage,
      total: recs.length,
      hasNextPage: false,
      results: recs,
    };
  },

  getAnimeEpisodes: async (id: number | string, existingMedia?: any) => {
    const numId = parseInt(String(id), 10);
    const mediaPromise = existingMedia
      ? Promise.resolve({ Media: existingMedia })
      : queryAniListDirect(DETAIL_QUERY, { id: numId });

    const [data, anizipData] = await Promise.all([
      mediaPromise,
      fetch(`https://api.ani.zip/mappings?anilist_id=${numId}`, {
        headers: { "User-Agent": "Mozilla/5.0" },
        signal: AbortSignal.timeout(2000),
      })
        .then((r) => (r.ok ? r.json() : null))
        .catch(() => null),
    ]);

    const media = data?.Media;
    if (!media) return [];
    const streaming = media.streamingEpisodes || [];
    const anizipEps = anizipData?.episodes || {};
    const anizipCount = Object.keys(anizipEps).length;
    const totalEpisodes = media.episodes || streaming.length || anizipCount || 12;
    const episodes: any[] = [];

    const displayCount = Math.min(totalEpisodes, 1500);
    for (let epNum = 1; epNum <= displayCount; epNum++) {
      const az = anizipEps[String(epNum)] || anizipEps[epNum];
      const streamItem = streaming[epNum - 1];

      // Title priority: AniZip English/Japanese -> streaming episode title -> Episode N
      const epTitle =
        az?.title?.en ||
        az?.title?.ja ||
        az?.title?.["x-jat"] ||
        streamItem?.title ||
        `Episode ${epNum}`;

      // Thumbnail priority: AniZip real TVDB/TMDB episode screencap -> streaming episode thumbnail -> cover image
      const epThumbnail =
        az?.image ||
        streamItem?.thumbnail ||
        media.coverImage?.extraLarge ||
        media.coverImage?.large;

      const epOverview = az?.overview || null;

      episodes.push({
        number: epNum,
        title: epTitle,
        thumbnail: epThumbnail,
        description: epOverview,
        url: streamItem?.url || null,
        site: streamItem?.site || null,
        airingAt: az?.airDateUtc ? Math.floor(new Date(az.airDateUtc).getTime() / 1000) : null,
        isAired: true,
      });
    }

    return episodes;
  },

  getAnimeReviews: async (id: number | string, existingMalId?: number | null): Promise<ReviewItem[]> => {
    let malId = existingMalId;
    if (!malId) {
      const numId = parseInt(String(id), 10);
      const data = await queryAniListDirect(DETAIL_QUERY, { id: numId });
      malId = data?.Media?.idMal;
    }
    if (!malId) return [];

    try {
      const res = await fetch(`https://api.jikan.moe/v4/anime/${malId}/reviews`, {
        headers: { "User-Agent": "Mozilla/5.0" },
        signal: AbortSignal.timeout(1200),
      });
      if (res.ok) {
        const jikanData: any = await res.json();
        return (jikanData.data || []).slice(0, 10).map((r: any) => ({
          id: r.mal_id,
          username: r.user?.username || "Anonymous",
          avatar: r.user?.images?.jpg?.image_url || null,
          score: r.score,
          date: r.date,
          review: r.review,
          tags: r.tags || [],
          reactions: r.reactions || {},
        }));
      }
    } catch {}
    return [];
  },

  getSchedule: async (date?: string, tz?: string): Promise<{ date: string; total: number; results: ScheduleItem[] }> => {
    let targetDate: Date;
    if (date && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
      targetDate = new Date(`${date}T00:00:00Z`);
    } else {
      targetDate = new Date();
    }
    const dateStr = targetDate.toISOString().split("T")[0];
    const startOfDay = new Date(Date.UTC(targetDate.getUTCFullYear(), targetDate.getUTCMonth(), targetDate.getUTCDate(), 0, 0, 0));
    const airingAt_greater = Math.floor(startOfDay.getTime() / 1000);
    const airingAt_lesser = airingAt_greater + 86400;

    const data = await queryAniListDirect(SCHEDULE_QUERY, { airingAt_greater, airingAt_lesser, page: 1, perPage: 50 });
    const schedules = data?.Page?.airingSchedules || [];
    return {
      date: dateStr,
      total: schedules.length,
      results: schedules,
    };
  },

  getWeekSchedule: async (): Promise<DaySchedule[]> => {
    const now = new Date();
    const startOfDay = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0));
    const startTimestamp = Math.floor(startOfDay.getTime() / 1000);
    const endTimestamp = startTimestamp + 7 * 86400;

    const data = await queryAniListDirect(SCHEDULE_QUERY, {
      airingAt_greater: startTimestamp,
      airingAt_lesser: endTimestamp,
      page: 1,
      perPage: 100,
    });

    const schedules: any[] = data?.Page?.airingSchedules || [];
    const days: DaySchedule[] = [];
    const dayNamesShort = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const dayNamesFull = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

    for (let d = 0; d < 7; d++) {
      const curDate = new Date((startTimestamp + d * 86400) * 1000);
      const dateStr = curDate.toISOString().split("T")[0];
      const dayOfWeek = dayNamesShort[curDate.getUTCDay()];
      const fullDayName = dayNamesFull[curDate.getUTCDay()];
      const dayStart = startTimestamp + d * 86400;
      const dayEnd = dayStart + 86400;

      const episodes = schedules.filter((s: any) => s.airingAt >= dayStart && s.airingAt < dayEnd);
      days.push({
        date: dateStr,
        dayOfWeek,
        fullDayName,
        isToday: d === 0,
        count: episodes.length,
        episodes,
      });
    }

    return days;
  },

  getCharacter: async (id: number | string) => {
    const numId = parseInt(String(id), 10);
    const data = await queryAniListDirect(CHARACTER_DETAIL_QUERY, { id: numId });
    return data?.Character;
  },

  getStaff: async (id: number | string) => {
    const numId = parseInt(String(id), 10);
    const data = await queryAniListDirect(STAFF_DETAIL_QUERY, { id: numId });
    return data?.Staff;
  },

  getStudio: async (id: number | string, page = 1, perPage = 24) => {
    const numId = parseInt(String(id), 10);
    const data = await queryAniListDirect(STUDIO_DETAIL_QUERY, { id: numId, page, perPage });
    const studio = data?.Studio;
    if (!studio) return null;
    const mediaData = studio.media || {};
    return {
      id: studio.id,
      name: studio.name,
      isAnimationStudio: studio.isAnimationStudio || false,
      favourites: studio.favourites,
      pagination: {
        page: mediaData.pageInfo?.currentPage || page,
        perPage: mediaData.pageInfo?.perPage || perPage,
        total: mediaData.pageInfo?.total || (mediaData.nodes || []).length,
        hasNextPage: Boolean(mediaData.pageInfo?.hasNextPage),
      },
      media: mediaData.nodes || [],
    };
  },
};
