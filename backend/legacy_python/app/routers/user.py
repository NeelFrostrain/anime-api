import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from backend.app.database import get_db
from backend.app.models.user import User, UserSettings
from backend.app.models.watchlist import WatchlistItem
from backend.app.models.history import HistoryItem
from backend.app.schemas.user import (
    WatchlistCreate, WatchlistUpdate, WatchlistResponse,
    HistoryCreate, HistoryResponse, SettingsUpdate, SettingsResponse
)
from backend.app.deps import get_current_user, get_optional_user

router = APIRouter(prefix="/user", tags=["User Library & Tracking"])

@router.get("/watchlist", response_model=List[WatchlistResponse])
async def get_watchlist(
    status: Optional[str] = Query(None, description="WATCHING, PLANNING, COMPLETED, PAUSED, DROPPED"),
    current_user: Optional[User] = Depends(get_optional_user),
    db: Session = Depends(get_db)
):
    if not current_user:
        return []
    query = db.query(WatchlistItem).filter(WatchlistItem.user_id == current_user.id)
    if status:
        query = query.filter(WatchlistItem.status == status.upper())
    return query.order_by(WatchlistItem.updated_at.desc()).all()

@router.post("/watchlist", response_model=Optional[WatchlistResponse])
async def add_or_update_watchlist(
    item_in: WatchlistCreate,
    current_user: Optional[User] = Depends(get_optional_user),
    db: Session = Depends(get_db)
):
    if not current_user:
        return None
    item = db.query(WatchlistItem).filter(
        WatchlistItem.user_id == current_user.id,
        WatchlistItem.anime_id == item_in.animeId
    ).first()

    if item:
        item.status = item_in.status.upper()
        item.progress = item_in.progress
        item.total_episodes = item_in.totalEpisodes or item.total_episodes
        item.score = item_in.score if item_in.score is not None else item.score
        item.notes = item_in.notes if item_in.notes is not None else item.notes
        item.updated_at = datetime.datetime.now(datetime.timezone.utc)
    else:
        item = WatchlistItem(
            user_id=current_user.id,
            anime_id=item_in.animeId,
            anime_title=item_in.animeTitle,
            anime_poster=item_in.animePoster,
            anime_format=item_in.animeFormat,
            anime_year=item_in.animeYear,
            status=item_in.status.upper(),
            progress=item_in.progress,
            total_episodes=item_in.totalEpisodes,
            score=item_in.score,
            notes=item_in.notes,
        )
        db.add(item)

    db.commit()
    db.refresh(item)
    return item

@router.patch("/watchlist/{anime_id}", response_model=Optional[WatchlistResponse])
async def patch_watchlist(
    anime_id: int,
    item_update: WatchlistUpdate,
    current_user: Optional[User] = Depends(get_optional_user),
    db: Session = Depends(get_db)
):
    if not current_user:
        return None
    item = db.query(WatchlistItem).filter(
        WatchlistItem.user_id == current_user.id,
        WatchlistItem.anime_id == anime_id
    ).first()

    if not item:
        return None

    if item_update.status:
        item.status = item_update.status.upper()
    if item_update.progress is not None:
        item.progress = item_update.progress
    if item_update.score is not None:
        item.score = item_update.score
    if item_update.notes is not None:
        item.notes = item_update.notes

    item.updated_at = datetime.datetime.now(datetime.timezone.utc)
    db.commit()
    db.refresh(item)
    return item

@router.delete("/watchlist/{anime_id}")
async def delete_watchlist_item(
    anime_id: int,
    current_user: Optional[User] = Depends(get_optional_user),
    db: Session = Depends(get_db)
):
    if not current_user:
        return {"message": "Item removed from watchlist"}
    item = db.query(WatchlistItem).filter(
        WatchlistItem.user_id == current_user.id,
        WatchlistItem.anime_id == anime_id
    ).first()

    if not item:
        return {"message": "Item removed from watchlist"}

    db.delete(item)
    db.commit()
    return {"message": "Item removed from watchlist"}

@router.get("/history", response_model=List[HistoryResponse])
async def get_history(
    limit: int = Query(20, ge=1, le=50),
    current_user: Optional[User] = Depends(get_optional_user),
    db: Session = Depends(get_db)
):
    if not current_user:
        return []
    return (
        db.query(HistoryItem)
        .filter(HistoryItem.user_id == current_user.id)
        .order_by(HistoryItem.updated_at.desc())
        .limit(limit)
        .all()
    )

@router.post("/history", response_model=Optional[HistoryResponse])
async def update_history(
    hist_in: HistoryCreate,
    current_user: Optional[User] = Depends(get_optional_user),
    db: Session = Depends(get_db)
):
    if not current_user:
        return None
    item = db.query(HistoryItem).filter(
        HistoryItem.user_id == current_user.id,
        HistoryItem.anime_id == hist_in.animeId
    ).first()

    if item:
        item.episode = hist_in.episode
        item.episode_title = hist_in.episodeTitle or item.episode_title
        item.playback_position = hist_in.playbackPosition
        item.playback_duration = hist_in.playbackDuration
        item.updated_at = datetime.datetime.now(datetime.timezone.utc)
    else:
        item = HistoryItem(
            user_id=current_user.id,
            anime_id=hist_in.animeId,
            anime_title=hist_in.animeTitle,
            anime_poster=hist_in.animePoster,
            episode=hist_in.episode,
            episode_title=hist_in.episodeTitle,
            playback_position=hist_in.playbackPosition,
            playback_duration=hist_in.playbackDuration,
        )
        db.add(item)

    db.commit()
    db.refresh(item)
    return item

@router.get("/settings", response_model=SettingsResponse)
async def get_user_settings(
    current_user: Optional[User] = Depends(get_optional_user),
    db: Session = Depends(get_db)
):
    if not current_user:
        return SettingsResponse(
            titleLanguage="english",
            themeAccent="#8b7cf6",
            adultFilter=True,
        )
    settings_obj = db.query(UserSettings).filter(UserSettings.user_id == current_user.id).first()
    if not settings_obj:
        settings_obj = UserSettings(user_id=current_user.id)
        db.add(settings_obj)
        db.commit()
        db.refresh(settings_obj)
    return settings_obj

@router.patch("/settings", response_model=SettingsResponse)
async def update_user_settings(
    update_in: SettingsUpdate,
    current_user: Optional[User] = Depends(get_optional_user),
    db: Session = Depends(get_db)
):
    if not current_user:
        return SettingsResponse(
            titleLanguage=update_in.titleLanguage or "english",
            themeAccent=update_in.themeAccent or "#8b7cf6",
            adultFilter=update_in.adultFilter if update_in.adultFilter is not None else True,
        )
    settings_obj = db.query(UserSettings).filter(UserSettings.user_id == current_user.id).first()
    if not settings_obj:
        settings_obj = UserSettings(user_id=current_user.id)
        db.add(settings_obj)

    if update_in.titleLanguage:
        settings_obj.title_language = update_in.titleLanguage
    if update_in.themeAccent:
        settings_obj.theme_accent = update_in.themeAccent
    if update_in.adultFilter is not None:
        settings_obj.adult_filter = update_in.adultFilter

    db.commit()
    db.refresh(settings_obj)
    return settings_obj
