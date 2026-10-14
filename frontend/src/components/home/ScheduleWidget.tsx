"use client";

import React, { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Calendar, Clock, ChevronRight } from "lucide-react";
import { DaySchedule } from "@/types/anime";
import { formatAiringTime, formatTimeUntil } from "@/lib/utils";

interface ScheduleWidgetProps {
  weekDays: DaySchedule[];
}

export function ScheduleWidget({ weekDays }: ScheduleWidgetProps) {
  const [selectedDayIdx, setSelectedDayIdx] = useState(0);

  if (!weekDays || weekDays.length === 0) return null;

  const currentDay = weekDays[selectedDayIdx] || weekDays[0];
  const episodes = currentDay?.episodes?.slice(0, 8) || [];

  return (
    <div className="rounded-md border border-white/10 bg-[#131318] p-4 sm:p-4.5 shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-white/10 mb-3">
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-emerald-400" />
          <h3 className="font-display font-bold text-xs sm:text-sm text-white">Estimated Airing Schedule</h3>
        </div>
        <Link
          href="/schedule"
          className="text-xs font-semibold text-[var(--accent)] hover:underline inline-flex items-center gap-0.5"
        >
          Full Week <ChevronRight className="h-3 w-3" />
        </Link>
      </div>

      {/* Day Selector Buttons */}
      <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none pb-2 mb-3">
        {weekDays.map((day, idx) => (
          <button
            key={day.date}
            onClick={() => setSelectedDayIdx(idx)}
            className={`flex flex-col items-center rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-all ${
              selectedDayIdx === idx
                ? "bg-[var(--accent)] text-white shadow-sm"
                : "border border-white/10 bg-white/5 text-zinc-400 hover:text-white hover:bg-white/10"
            }`}
          >
            <span>{day.dayOfWeek}</span>
            <span className="text-[10px] font-normal opacity-75">{day.count} shows</span>
          </button>
        ))}
      </div>

      {/* Episodes List */}
      <div className="space-y-2">
        {episodes.length > 0 ? (
          episodes.map((ep) => {
            const title = ep.media.title.english || ep.media.title.romaji || "Anime";
            const timeStr = formatAiringTime(ep.airingAt);
            const timeUntil = ep.timeUntilAiring ? formatTimeUntil(ep.timeUntilAiring) : null;
            const poster = ep.media.coverImage?.large || ep.media.coverImage?.medium;

            return (
              <Link
                key={ep.id}
                href={`/anime/${ep.media.id}`}
                className="group flex items-center justify-between rounded-lg border border-white/5 bg-white/[0.02] p-2 sm:p-2.5 hover:border-white/15 hover:bg-white/5 transition-all gap-3"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="relative h-14 w-10 shrink-0 overflow-hidden rounded-md bg-zinc-800 border border-white/10">
                    {poster && (
                      <Image
                        src={poster}
                        alt={title}
                        fill
                        className="object-cover transition-transform group-hover:scale-105"
                        sizes="40px"
                      />
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="line-clamp-1 text-xs sm:text-[13px] font-semibold text-zinc-100 group-hover:text-[var(--accent)] transition-colors leading-snug">
                      {title}
                    </p>
                    <span className="text-[11px] font-medium text-emerald-400 mt-0.5 block">
                      Episode {ep.episode}
                    </span>
                  </div>
                </div>

                <div className="flex flex-col items-end shrink-0 pl-2">
                  <span suppressHydrationWarning className="flex items-center gap-1 text-xs font-mono font-medium text-zinc-300">
                    <Clock className="h-3 w-3 text-zinc-400" />
                    {timeStr}
                  </span>
                  {timeUntil && (
                    <span className="text-[11px] text-zinc-400 mt-0.5">{timeUntil}</span>
                  )}
                </div>
              </Link>
            );
          })
        ) : (
          <p className="text-center py-6 text-xs text-zinc-400">
            No airing episodes scheduled for this day.
          </p>
        )}
      </div>
    </div>
  );
}
