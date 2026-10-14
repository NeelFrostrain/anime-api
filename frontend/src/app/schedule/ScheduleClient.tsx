"use client";

import React, { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  Calendar,
  Clock,
  Filter,
  Bookmark,
  ExternalLink,
  Star,
  Play,
  Sparkles,
} from "lucide-react";
import { DaySchedule } from "@/types/anime";
import { formatAiringTime, formatTimeUntil, formatScore } from "@/lib/utils";
import { useWatchlistStore } from "@/stores/watchlist";
import { useMounted } from "@/hooks/useMounted";

interface ScheduleClientProps {
  initialWeekData: DaySchedule[];
}

export function ScheduleClient({ initialWeekData }: ScheduleClientProps) {
  const mounted = useMounted();
  const [selectedDayIdx, setSelectedDayIdx] = useState(0);
  const [myListOnly, setMyListOnly] = useState(false);

  const { items: storeItems } = useWatchlistStore();
  const watchlistItems = mounted ? storeItems : [];
  const watchlistIds = new Set(watchlistItems.map((item) => item.animeId));

  const currentDay = initialWeekData[selectedDayIdx] || initialWeekData[0];
  const allEpisodes = currentDay?.episodes || [];

  const episodes = myListOnly
    ? allEpisodes.filter((ep) => watchlistIds.has(ep.media.id))
    : allEpisodes;

  const userTimezone =
    mounted && typeof Intl !== "undefined"
      ? Intl.DateTimeFormat().resolvedOptions().timeZone
      : "Local Time";

  return (
    <div className="space-y-4 sm:space-y-5">
      {/* Page Title & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-3">
        <div>
          <div className="inline-flex items-center gap-1.5 rounded border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-400 mb-1">
            <Calendar className="h-3 w-3" />
            <span>Weekly Airing Calendar</span>
          </div>
          <h1 className="font-display text-xl sm:text-2xl font-extrabold text-white">
            Anime Airing Schedule
          </h1>
          <p className="text-[11px] text-zinc-400 mt-0.5">
            Times converted to your local timezone:{" "}
            <span className="font-mono text-zinc-200">{userTimezone}</span>
          </p>
        </div>

        {/* My List Only Toggle */}
        <button
          onClick={() => setMyListOnly(!myListOnly)}
          className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-bold transition-all ${
            myListOnly
              ? "bg-[var(--accent)] text-white"
              : "border border-white/15 bg-white/5 text-zinc-300 hover:bg-white/10"
          }`}
        >
          <Bookmark className="h-3.5 w-3.5" />
          <span>My Watchlist Only ({watchlistItems.length})</span>
        </button>
      </div>

      {/* 7-Day Tabs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-1.5">
        {initialWeekData.map((day, idx) => {
          const isSelected = selectedDayIdx === idx;

          return (
            <button
              key={day.date}
              onClick={() => setSelectedDayIdx(idx)}
              className={`flex flex-col items-center justify-center rounded-md p-2 text-center transition-all ${
                isSelected
                  ? "bg-[var(--accent)] text-white border border-transparent"
                  : "border border-white/10 bg-[#131318] text-zinc-300 hover:border-white/20 hover:bg-white/5"
              }`}
            >
              <span className="text-[10px] font-bold uppercase tracking-wider">
                {day.dayOfWeek}
              </span>
              <span className="text-sm font-extrabold font-display my-0.5">
                {new Date(day.date).getDate()}
              </span>
              <span className={`text-[9px] ${isSelected ? "text-white/80" : "text-zinc-500"}`}>
                {day.count} shows
              </span>
            </button>
          );
        })}
      </div>

      {/* Day Overview Summary */}
      <div className="flex items-center justify-between">
        <h2 className="font-display text-sm sm:text-base font-bold text-white">
          {currentDay?.fullDayName} — {currentDay?.date}
        </h2>
        <span className="text-[11px] text-zinc-400 font-semibold">
          Showing {episodes.length} episodes
        </span>
      </div>

      {/* Schedule Episodes Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 ultrawide:grid-cols-6 gap-2 sm:gap-2.5">
        {episodes.map((item) => {
          const media = item.media;
          const title = media.title.english || media.title.romaji || "Anime";
          const timeStr = formatAiringTime(item.airingAt);
          const timeUntil = item.timeUntilAiring ? formatTimeUntil(item.timeUntilAiring) : null;
          const isAiringNow = item.timeUntilAiring ? item.timeUntilAiring <= 0 && item.timeUntilAiring > -3600 : false;
          const isAlreadyAired = item.timeUntilAiring ? item.timeUntilAiring < -3600 : false;

          return (
            <div
              key={item.id}
              className={`group flex items-start gap-2.5 rounded-md border p-2.5 transition-all duration-150 ${
                isAiringNow
                  ? "border-emerald-500 bg-emerald-500/10"
                  : "border-white/10 bg-[#131318] hover:border-white/25"
              }`}
            >
              {/* Poster */}
              <Link
                href={`/anime/${media.id}`}
                className="relative aspect-[2/3] w-14 sm:w-16 shrink-0 overflow-hidden rounded bg-zinc-900 border border-white/10"
              >
                {media.coverImage?.large ? (
                  <Image
                    src={media.coverImage.large}
                    alt={title}
                    fill
                    className="object-cover transition-transform group-hover:scale-105"
                    sizes="80px"
                  />
                ) : null}
              </Link>

              {/* Info & Countdown */}
              <div className="flex-1 min-w-0 space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="rounded-md bg-white/10 px-2 py-0.5 font-mono text-[11px] font-bold text-white">
                    EP {item.episode}
                  </span>
                  <span suppressHydrationWarning className="flex items-center gap-1 font-mono text-xs font-semibold text-zinc-300">
                    <Clock className="h-3 w-3 text-zinc-400" />
                    {timeStr}
                  </span>
                </div>

                <Link
                  href={`/anime/${media.id}`}
                  className="line-clamp-2 text-xs font-bold text-zinc-100 group-hover:text-[var(--accent)] transition-colors"
                >
                  {title}
                </Link>

                {/* Countdown / Status badge */}
                <div className="pt-1 flex items-center justify-between">
                  {isAiringNow ? (
                    <span className="flex items-center gap-1 rounded-md bg-emerald-500 text-black px-2 py-0.5 text-[10px] font-extrabold uppercase animate-pulse">
                      Airing Now
                    </span>
                  ) : timeUntil ? (
                    <span className="text-[11px] font-medium text-emerald-400">
                      in {timeUntil}
                    </span>
                  ) : isAlreadyAired ? (
                    <span className="text-[10px] text-zinc-500 font-medium">Aired</span>
                  ) : null}

                  {/* Watch hub button */}
                  <Link
                    href={`/anime/${media.id}/watch?ep=${item.episode}`}
                    className="flex items-center gap-1 text-[11px] font-semibold text-[var(--accent)] hover:underline"
                  >
                    <Play className="h-3 w-3 fill-current" />
                    <span>Watch</span>
                  </Link>
                </div>

                {/* Platform chips */}
                {media.streamingPlatforms && media.streamingPlatforms.length > 0 && (
                  <div className="flex flex-wrap gap-1 pt-1 border-t border-white/5">
                    {media.streamingPlatforms.slice(0, 2).map((p, idx) => (
                      <span key={idx} className="rounded bg-white/5 px-1.5 py-0.5 text-[9px] text-zinc-400">
                        {p.site}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {episodes.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-center border border-dashed border-white/10 rounded-md bg-white/[0.01]">
          <Calendar className="h-10 w-10 text-zinc-600 mb-2" />
          <p className="text-sm font-semibold text-zinc-300">
            {myListOnly
              ? "None of the anime in your watchlist air on this day."
              : "No scheduled broadcasts on this date."}
          </p>
        </div>
      )}
    </div>
  );
}
