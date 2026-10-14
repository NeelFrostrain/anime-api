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

export const GENRES_QUERY = `
query GetGenres {
  GenreCollection
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

export const RANDOM_ANIME_QUERY = `
query GetRandomAnime($page: Int = 1) {
  Page(page: $page, perPage: 50) {
    media(type: ANIME, sort: POPULARITY_DESC, isAdult: false, format_in: [TV, MOVIE, OVA, ONA]) {
      id
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

// Generic AniList GraphQL fetcher with Cloudflare Workers KV Cache
export async function queryAniList<T = any>(
  query: string,
  variables: Record<string, any> = {},
  kv?: KVNamespace,
  cacheKeyPrefix?: string,
  ttlSeconds = 600
): Promise<T> {
  let cacheKey: string | null = null;
  if (kv && cacheKeyPrefix) {
    const varHash = Object.keys(variables).length > 0 ? JSON.stringify(variables) : "";
    cacheKey = `anilist:${cacheKeyPrefix}:${varHash}`;
    try {
      const cached = await kv.get(cacheKey, "json");
      if (cached) {
        return cached as T;
      }
    } catch {
      // KV read failed, fallback to network
    }
  }

  const response = await fetch(ANILIST_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Accept": "application/json",
      "User-Agent": "KuromiWorker/2.0 (+https://github.com/NeelFrostrain/anime-api)",
    },
    body: JSON.stringify({ query, variables }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`AniList upstream error ${response.status}: ${errText}`);
  }

  const result = (await response.json()) as { data?: T; errors?: any[] };
  if (result.errors && (!result.data || Object.keys(result.data).length === 0)) {
    throw new Error(`AniList GraphQL Error: ${result.errors[0]?.message || "Unknown error"}`);
  }

  const data = result.data as T;

  if (kv && cacheKey && data) {
    try {
      await kv.put(cacheKey, JSON.stringify(data), { expirationTtl: ttlSeconds });
    } catch {
      // KV write failed, ignore
    }
  }

  return data;
}
