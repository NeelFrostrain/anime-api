import datetime
from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from backend.app.database import Base

def utc_now():
    return datetime.datetime.now(datetime.timezone.utc)

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    username = Column(String(100), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    avatar = Column(String(500), nullable=True)
    created_at = Column(DateTime, default=utc_now)

    # Relationships
    watchlist_items = relationship("WatchlistItem", back_populates="user", cascade="all, delete-orphan")
    history_items = relationship("HistoryItem", back_populates="user", cascade="all, delete-orphan")
    settings = relationship("UserSettings", back_populates="user", uselist=False, cascade="all, delete-orphan")

    @property
    def createdAt(self):
        return self.created_at

class UserSettings(Base):
    __tablename__ = "user_settings"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), index=True, nullable=False)
    title_language = Column(String(50), default="english")  # english, romaji, native
    theme_accent = Column(String(50), default="#8b7cf6")    # default violet
    adult_filter = Column(Boolean, default=True)

    user = relationship("User", back_populates="settings")

    @property
    def titleLanguage(self):
        return self.title_language

    @property
    def themeAccent(self):
        return self.theme_accent

    @property
    def adultFilter(self):
        return self.adult_filter
