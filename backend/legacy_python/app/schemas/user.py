from typing import Optional, List
from datetime import datetime
from pydantic import BaseModel, ConfigDict, EmailStr, Field

class UserCreate(BaseModel):
    email: EmailStr
    username: str = Field(..., min_length=3, max_length=50)
    password: str = Field(..., min_length=6)

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    email: EmailStr
    username: str
    avatar: Optional[str] = None
    createdAt: Optional[datetime] = None

class Token(BaseModel):
    accessToken: str
    tokenType: str = "bearer"
    user: UserResponse

class WatchlistCreate(BaseModel):
    animeId: int
    animeTitle: str
    animePoster: Optional[str] = None
    animeFormat: Optional[str] = None
    animeYear: Optional[int] = None
    status: str = "PLANNING"  # WATCHING, PLANNING, COMPLETED, PAUSED, DROPPED
    progress: int = 0
    totalEpisodes: Optional[int] = None
    score: Optional[float] = None
    notes: Optional[str] = None

class WatchlistUpdate(BaseModel):
    status: Optional[str] = None
    progress: Optional[int] = None
    score: Optional[float] = None
    notes: Optional[str] = None

class WatchlistResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    animeId: int
    animeTitle: str
    animePoster: Optional[str] = None
    animeFormat: Optional[str] = None
    animeYear: Optional[int] = None
    status: str
    progress: int
    totalEpisodes: Optional[int] = None
    score: Optional[float] = None
    notes: Optional[str] = None
    updatedAt: Optional[datetime] = None

class HistoryCreate(BaseModel):
    animeId: int
    animeTitle: str
    animePoster: Optional[str] = None
    episode: int = 1
    episodeTitle: Optional[str] = None
    playbackPosition: float = 0.0
    playbackDuration: float = 0.0

class HistoryResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    animeId: int
    animeTitle: str
    animePoster: Optional[str] = None
    episode: int
    episodeTitle: Optional[str] = None
    playbackPosition: float
    playbackDuration: float
    updatedAt: Optional[datetime] = None

class SettingsUpdate(BaseModel):
    titleLanguage: Optional[str] = None  # english, romaji, native
    themeAccent: Optional[str] = None
    adultFilter: Optional[bool] = None

class SettingsResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    titleLanguage: str = "english"
    themeAccent: str = "#8b7cf6"
    adultFilter: bool = True
