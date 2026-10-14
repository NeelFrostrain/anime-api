import datetime
from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from backend.app.database import Base

def utc_now():
    return datetime.datetime.now(datetime.timezone.utc)

class WatchlistItem(Base):
    __tablename__ = "watchlist_items"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), index=True, nullable=False)
    anime_id = Column(Integer, index=True, nullable=False)
    anime_title = Column(String(500), nullable=False)
    anime_poster = Column(String(500), nullable=True)
    anime_format = Column(String(50), nullable=True)
    anime_year = Column(Integer, nullable=True)
    
    # Status: WATCHING, PLANNING, COMPLETED, PAUSED, DROPPED
    status = Column(String(50), default="PLANNING", index=True, nullable=False)
    progress = Column(Integer, default=0, nullable=False)
    total_episodes = Column(Integer, nullable=True)
    score = Column(Float, nullable=True)
    notes = Column(Text, nullable=True)
    updated_at = Column(DateTime, default=utc_now, onupdate=utc_now)

    user = relationship("User", back_populates="watchlist_items")

    # camelCase properties for Pydantic serialization
    @property
    def animeId(self):
        return self.anime_id

    @property
    def animeTitle(self):
        return self.anime_title

    @property
    def animePoster(self):
        return self.anime_poster

    @property
    def animeFormat(self):
        return self.anime_format

    @property
    def animeYear(self):
        return self.anime_year

    @property
    def totalEpisodes(self):
        return self.total_episodes

    @property
    def updatedAt(self):
        return self.updated_at
