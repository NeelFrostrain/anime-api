from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field

class AnimeTitle(BaseModel):
    romaji: str = ""
    english: str = ""
    native: str = ""
    userPreferred: str = ""

class AnimeCover(BaseModel):
    extraLarge: str = ""
    large: str = ""
    medium: str = ""
    color: str = "#8b7cf6"

class DateInfo(BaseModel):
    year: Optional[int] = None
    month: Optional[int] = None
    day: Optional[int] = None

class NextAiringEpisode(BaseModel):
    airingAt: int
    timeUntilAiring: int
    episode: int

class Trailer(BaseModel):
    id: Optional[str] = None
    site: Optional[str] = None
    thumbnail: Optional[str] = None

class AnimeCard(BaseModel):
    id: int
    idMal: Optional[int] = None
    title: AnimeTitle
    coverImage: AnimeCover
    accentColor: str = "#8b7cf6"
    bannerImage: Optional[str] = None
    format: Optional[str] = None
    status: Optional[str] = None
    description: Optional[str] = None
    episodes: Optional[int] = None
    duration: Optional[int] = None
    season: Optional[str] = None
    seasonYear: Optional[int] = None
    startDate: Optional[DateInfo] = None
    averageScore: Optional[int] = None
    meanScore: Optional[int] = None
    popularity: Optional[int] = None
    favourites: Optional[int] = None
    genres: List[str] = []
    countryOfOrigin: Optional[str] = None
    isAdult: bool = False
    nextAiringEpisode: Optional[NextAiringEpisode] = None
    trailer: Optional[Trailer] = None

class PaginationResponse(BaseModel):
    page: int
    perPage: int
    total: int
    hasNextPage: bool
    results: List[Any]

class SuggestionItem(BaseModel):
    id: int
    title: str
    titleRomaji: str
    poster: str
    color: str
    format: Optional[str] = None
    status: Optional[str] = None
    year: Optional[int] = None
    episodes: Optional[int] = None
    score: Optional[int] = None

class Studio(BaseModel):
    id: int
    name: str
    isMain: bool = False
    isAnimationStudio: bool = False

class Tag(BaseModel):
    id: int
    name: str
    description: Optional[str] = None
    rank: Optional[int] = None
    isMediaSpoiler: bool = False

class ExternalLink(BaseModel):
    id: int
    url: str
    site: str
    type: Optional[str] = None
    icon: Optional[str] = None
    color: Optional[str] = None
    language: Optional[str] = None

class StreamingEpisode(BaseModel):
    title: Optional[str] = None
    thumbnail: Optional[str] = None
    url: Optional[str] = None
    site: Optional[str] = None

class AiringHistory(BaseModel):
    id: int
    airingAt: int
    episode: int
    timeUntilAiring: Optional[int] = None

class AnimeDetail(AnimeCard):
    endDate: Optional[DateInfo] = None
    synonyms: List[str] = []
    source: Optional[str] = None
    studios: List[Studio] = []
    tags: List[Tag] = []
    externalLinks: List[ExternalLink] = []
    streamingLinks: List[ExternalLink] = []
    airingScheduleHistory: List[AiringHistory] = []
    streamingEpisodes: List[StreamingEpisode] = []

class VoiceActor(BaseModel):
    id: int
    name: str
    native: Optional[str] = None
    language: str = "Japanese"
    image: str

class CharacterItem(BaseModel):
    id: int
    role: Optional[str] = None
    name: Dict[str, str]
    image: str
    voiceActors: List[VoiceActor] = []

class StaffItem(BaseModel):
    id: int
    role: Optional[str] = None
    name: Dict[str, str]
    image: str
    occupations: List[str] = []

class RelationItem(BaseModel):
    relationType: str
    id: int
    title: AnimeTitle
    format: Optional[str] = None
    status: Optional[str] = None
    coverImage: Dict[str, str]
    averageScore: Optional[int] = None
    year: Optional[int] = None

class RecommendationItem(BaseModel):
    id: int
    rating: Optional[int] = None
    userRating: Optional[str] = None
    title: AnimeTitle
    coverImage: Dict[str, str]
    format: Optional[str] = None
    status: Optional[str] = None
    episodes: Optional[int] = None
    averageScore: Optional[int] = None
    year: Optional[int] = None

class ScheduleItem(BaseModel):
    id: int
    airingAt: int
    episode: int
    timeUntilAiring: Optional[int] = None
    media: AnimeCard

class ReviewItem(BaseModel):
    id: int
    username: str
    avatar: Optional[str] = None
    score: Optional[int] = None
    date: Optional[str] = None
    review: str
    tags: List[str] = []
    reactions: Dict[str, Any] = {}
