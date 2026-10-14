# GraphQL query strings for AniList v2 API

MEDIA_FRAGMENT = """
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
"""

SPOTLIGHT_QUERY = f"""
{MEDIA_FRAGMENT}
query GetSpotlight {{
  Page(page: 1, perPage: 10) {{
    media(type: ANIME, sort: [TRENDING_DESC, POPULARITY_DESC], isAdult: false) {{
      ...MediaFields
      trailer {{
        id
        site
        thumbnail
      }}
    }}
  }}
}}
"""

TRENDING_QUERY = f"""
{MEDIA_FRAGMENT}
query GetTrending($page: Int = 1, $perPage: Int = 20) {{
  Page(page: $page, perPage: $perPage) {{
    pageInfo {{
      total
      perPage
      currentPage
      lastPage
      hasNextPage
    }}
    media(type: ANIME, sort: TRENDING_DESC, isAdult: false) {{
      ...MediaFields
    }}
  }}
}}
"""

POPULAR_QUERY = f"""
{MEDIA_FRAGMENT}
query GetPopular($page: Int = 1, $perPage: Int = 20) {{
  Page(page: $page, perPage: $perPage) {{
    pageInfo {{
      total
      perPage
      currentPage
      lastPage
      hasNextPage
    }}
    media(type: ANIME, sort: POPULARITY_DESC, isAdult: false) {{
      ...MediaFields
    }}
  }}
}}
"""

TOP_RATED_QUERY = f"""
{MEDIA_FRAGMENT}
query GetTopRated($page: Int = 1, $perPage: Int = 20) {{
  Page(page: $page, perPage: $perPage) {{
    pageInfo {{
      total
      perPage
      currentPage
      lastPage
      hasNextPage
    }}
    media(type: ANIME, sort: SCORE_DESC, isAdult: false) {{
      ...MediaFields
    }}
  }}
}}
"""

UPCOMING_QUERY = f"""
{MEDIA_FRAGMENT}
query GetUpcoming($page: Int = 1, $perPage: Int = 20) {{
  Page(page: $page, perPage: $perPage) {{
    pageInfo {{
      total
      perPage
      currentPage
      lastPage
      hasNextPage
    }}
    media(type: ANIME, status: NOT_YET_RELEASED, sort: POPULARITY_DESC, isAdult: false) {{
      ...MediaFields
    }}
  }}
}}
"""

TOP_AIRING_QUERY = f"""
{MEDIA_FRAGMENT}
query GetTopAiring($page: Int = 1, $perPage: Int = 20) {{
  Page(page: $page, perPage: $perPage) {{
    pageInfo {{
      total
      perPage
      currentPage
      lastPage
      hasNextPage
    }}
    media(type: ANIME, status: RELEASING, sort: [POPULARITY_DESC, SCORE_DESC], isAdult: false) {{
      ...MediaFields
    }}
  }}
}}
"""

JUST_FINISHED_QUERY = f"""
{MEDIA_FRAGMENT}
query GetJustFinished($page: Int = 1, $perPage: Int = 20) {{
  Page(page: $page, perPage: $perPage) {{
    pageInfo {{
      total
      perPage
      currentPage
      lastPage
      hasNextPage
    }}
    media(type: ANIME, status: FINISHED, sort: END_DATE_DESC, isAdult: false) {{
      ...MediaFields
    }}
  }}
}}
"""

TOP_MOVIES_QUERY = f"""
{MEDIA_FRAGMENT}
query GetTopMovies($page: Int = 1, $perPage: Int = 20) {{
  Page(page: $page, perPage: $perPage) {{
    pageInfo {{
      total
      perPage
      currentPage
      lastPage
      hasNextPage
    }}
    media(type: ANIME, format: MOVIE, sort: SCORE_DESC, isAdult: false) {{
      ...MediaFields
    }}
  }}
}}
"""

SEASONAL_QUERY = f"""
{MEDIA_FRAGMENT}
query GetSeasonal($season: MediaSeason, $seasonYear: Int, $page: Int = 1, $perPage: Int = 24) {{
  Page(page: $page, perPage: $perPage) {{
    pageInfo {{
      total
      perPage
      currentPage
      lastPage
      hasNextPage
    }}
    media(type: ANIME, season: $season, seasonYear: $seasonYear, sort: POPULARITY_DESC, isAdult: false) {{
      ...MediaFields
    }}
  }}
}}
"""

FILTER_QUERY = f"""
{MEDIA_FRAGMENT}
query FilterAnime(
  $page: Int = 1,
  $perPage: Int = 24,
  $search: String,
  $genres: [String],
  $tags: [String],
  $seasonYear: Int,
  $season: MediaSeason,
  $format: MediaFormat,
  $status: MediaStatus,
  $countryOfOrigin: CountryCode,
  $sort: [MediaSort] = [POPULARITY_DESC]
) {{
  Page(page: $page, perPage: $perPage) {{
    pageInfo {{
      total
      perPage
      currentPage
      lastPage
      hasNextPage
    }}
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
    ) {{
      ...MediaFields
    }}
  }}
}}
"""

SEARCH_QUERY = f"""
{MEDIA_FRAGMENT}
query SearchAnime($search: String!, $page: Int = 1, $perPage: Int = 24) {{
  Page(page: $page, perPage: $perPage) {{
    pageInfo {{
      total
      perPage
      currentPage
      lastPage
      hasNextPage
    }}
    media(type: ANIME, search: $search, sort: SEARCH_MATCH, isAdult: false) {{
      ...MediaFields
    }}
  }}
}}
"""

SUGGESTIONS_QUERY = """
query Suggestions($search: String!) {
  Page(page: 1, perPage: 6) {
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
"""

DETAIL_QUERY = """
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
    source
    genres
    tags {
      id
      name
      description
      rank
      isMediaSpoiler
    }
    averageScore
    meanScore
    popularity
    favourites
    countryOfOrigin
    isAdult
    nextAiringEpisode {
      airingAt
      timeUntilAiring
      episode
    }
    trailer {
      id
      site
      thumbnail
    }
    studios {
      edges {
        isMain
        node {
          id
          name
          isAnimationStudio
        }
      }
    }
    externalLinks {
      id
      url
      site
      type
      icon
      color
      language
    }
    streamingEpisodes {
      title
      thumbnail
      url
      site
    }
    airingSchedule(notYetAired: false, perPage: 100) {
      nodes {
        id
        airingAt
        episode
        timeUntilAiring
      }
    }
  }
}
"""

CHARACTERS_QUERY = """
query GetAnimeCharacters($id: Int!, $page: Int = 1, $perPage: Int = 25) {
  Media(id: $id, type: ANIME) {
    id
    characters(page: $page, perPage: $perPage, sort: [ROLE, RELEVANCE]) {
      pageInfo {
        total
        perPage
        currentPage
        lastPage
        hasNextPage
      }
      edges {
        role
        node {
          id
          name {
            full
            native
          }
          image {
            large
            medium
          }
        }
        voiceActors(language: JAPANESE, sort: [RELEVANCE]) {
          id
          name {
            full
            native
          }
          languageV2
          image {
            large
            medium
          }
        }
      }
    }
  }
}
"""

STAFF_QUERY = """
query GetAnimeStaff($id: Int!, $page: Int = 1, $perPage: Int = 25) {
  Media(id: $id, type: ANIME) {
    id
    staff(page: $page, perPage: $perPage, sort: [RELEVANCE]) {
      pageInfo {
        total
        perPage
        currentPage
        lastPage
        hasNextPage
      }
      edges {
        role
        node {
          id
          name {
            full
            native
          }
          image {
            large
            medium
          }
          primaryOccupations
        }
      }
    }
  }
}
"""

RELATIONS_QUERY = """
query GetAnimeRelations($id: Int!) {
  Media(id: $id, type: ANIME) {
    id
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
          format
          status
          coverImage {
            large
            color
          }
          averageScore
          startDate {
            year
          }
        }
      }
    }
  }
}
"""

RECOMMENDATIONS_QUERY = """
query GetAnimeRecommendations($id: Int!, $page: Int = 1, $perPage: Int = 12) {
  Media(id: $id, type: ANIME) {
    id
    recommendations(page: $page, perPage: $perPage, sort: [RATING_DESC]) {
      pageInfo {
        total
        perPage
        currentPage
        lastPage
        hasNextPage
      }
      nodes {
        id
        rating
        userRating
        mediaRecommendation {
          id
          title {
            romaji
            english
            native
          }
          coverImage {
            large
            color
          }
          format
          averageScore
          episodes
          status
          startDate {
            year
          }
        }
      }
    }
  }
}
"""

SCHEDULE_QUERY = """
query GetAiringSchedule($airingAt_greater: Int, $airingAt_lesser: Int, $page: Int = 1, $perPage: Int = 50) {
  Page(page: $page, perPage: $perPage) {
    pageInfo {
      total
      perPage
      currentPage
      lastPage
      hasNextPage
    }
    airingSchedules(airingAt_greater: $airingAt_greater, airingAt_lesser: $airingAt_lesser, sort: TIME) {
      id
      airingAt
      episode
      timeUntilAiring
      media {
        id
        title {
          romaji
          english
          native
        }
        coverImage {
          large
          color
        }
        bannerImage
        format
        status
        genres
        averageScore
        popularity
        episodes
        countryOfOrigin
        isAdult
        externalLinks {
          id
          site
          url
          type
          icon
          color
        }
      }
    }
  }
}
"""

GENRES_AND_TAGS_QUERY = """
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
"""

CHARACTER_DETAIL_QUERY = """
query GetCharacterDetail($id: Int!) {
  Character(id: $id) {
    id
    name {
      full
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
    media(type: ANIME, sort: [POPULARITY_DESC], perPage: 25) {
      edges {
        characterRole
        node {
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
          startDate {
            year
          }
          averageScore
        }
      }
    }
  }
}
"""

STAFF_DETAIL_QUERY = """
query GetStaffDetail($id: Int!) {
  Staff(id: $id) {
    id
    name {
      full
      native
      alternative
    }
    image {
      large
      medium
    }
    description(asHtml: false)
    primaryOccupations
    gender
    dateOfBirth {
      year
      month
      day
    }
    dateOfDeath {
      year
      month
      day
    }
    age
    yearsActive
    homeTown
    bloodType
    favourites
    characterMedia(sort: [POPULARITY_DESC], perPage: 25) {
      edges {
        characters {
          id
          name {
            full
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
            color
          }
          format
          startDate {
            year
          }
        }
      }
    }
    staffMedia(sort: [POPULARITY_DESC], perPage: 25) {
      edges {
        staffRole
        node {
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
          startDate {
            year
          }
        }
      }
    }
  }
}
"""

STUDIO_DETAIL_QUERY = """
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
"""
