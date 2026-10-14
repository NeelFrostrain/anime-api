import datetime
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Float
from sqlalchemy.orm import relationship
from backend.app.database import Base

def utc_now():
    return datetime.datetime.now(datetime.timezone.utc)

class HistoryItem(Base):
    __tablename__ = "history_items"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), index=True, nullable=False)
    anime_id = Column(Integer, index=True, nullable=False)
    anime_title = Column(String(500), nullable=False)
    anime_poster = Column(String(500), nullable=True)
    episode = Column(Integer, default=1, nullable=False)
    episode_title = Column(String(500), nullable=True)
    playback_position = Column(Float, default=0.0)  # seconds
    playback_duration = Column(Float, default=0.0)  # seconds
    updated_at = Column(DateTime, default=utc_now, onupdate=utc_now)

    user = relationship("User", back_populates="history_items")

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
    def episodeTitle(self):
        return self.episode_title

    @property
    def playbackPosition(self):
        return self.playback_position

    @property
    def playbackDuration(self):
        return self.playback_duration

    @property
    def updatedAt(self):
        return self.updated_at
