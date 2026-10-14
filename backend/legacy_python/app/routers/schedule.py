import datetime
from typing import Optional, List, Dict, Any
from fastapi import APIRouter, Query
from backend.app.graphql.queries import SCHEDULE_QUERY
from backend.app.services.anilist import anilist_client
from backend.app.services.transformers import transform_schedule_item

router = APIRouter(prefix="/schedule", tags=["Schedule"])

@router.get("", response_model=Dict[str, Any])
async def get_schedule(
    date: Optional[str] = Query(None, description="Date in YYYY-MM-DD format"),
    tz: Optional[str] = Query("UTC", description="Timezone name"),
):
    """Airing schedule for a specific date, or today if not specified."""
    try:
        target_date = datetime.date.fromisoformat(date) if date else datetime.date.today()
    except ValueError:
        target_date = datetime.date.today()

    start_dt = datetime.datetime.combine(target_date, datetime.time.min, tzinfo=datetime.timezone.utc)
    end_dt = datetime.datetime.combine(target_date, datetime.time.max, tzinfo=datetime.timezone.utc)

    start_timestamp = int(start_dt.timestamp())
    end_timestamp = int(end_dt.timestamp())

    data = await anilist_client.execute_query(
        SCHEDULE_QUERY,
        {
            "airingAt_greater": start_timestamp,
            "airingAt_lesser": end_timestamp,
            "perPage": 50,
        },
        category="schedule",
    )

    schedules_raw = data.get("Page", {}).get("airingSchedules", [])
    items = [transform_schedule_item(item) for item in schedules_raw]

    return {
        "date": target_date.isoformat(),
        "total": len(items),
        "results": items,
    }

@router.get("/week", response_model=List[Dict[str, Any]])
async def get_week_schedule():
    """Returns 7 days of airing schedule starting from current day."""
    today = datetime.date.today()
    days = []

    # Get range for full week
    week_start = datetime.datetime.combine(today, datetime.time.min, tzinfo=datetime.timezone.utc)
    week_end = datetime.datetime.combine(today + datetime.timedelta(days=7), datetime.time.max, tzinfo=datetime.timezone.utc)

    data = await anilist_client.execute_query(
        SCHEDULE_QUERY,
        {
            "airingAt_greater": int(week_start.timestamp()),
            "airingAt_lesser": int(week_end.timestamp()),
            "perPage": 100,
        },
        category="schedule",
    )

    all_items = [transform_schedule_item(s) for s in data.get("Page", {}).get("airingSchedules", [])]

    for day_offset in range(7):
        current_day = today + datetime.timedelta(days=day_offset)
        day_start = int(datetime.datetime.combine(current_day, datetime.time.min, tzinfo=datetime.timezone.utc).timestamp())
        day_end = int(datetime.datetime.combine(current_day, datetime.time.max, tzinfo=datetime.timezone.utc).timestamp())

        day_items = [item for item in all_items if day_start <= item["airingAt"] <= day_end]

        days.append({
            "date": current_day.isoformat(),
            "dayOfWeek": current_day.strftime("%a"),
            "fullDayName": current_day.strftime("%A"),
            "isToday": day_offset == 0,
            "count": len(day_items),
            "episodes": day_items,
        })

    return days
