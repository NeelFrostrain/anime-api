"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";
import { Play, Clock } from "lucide-react";
import { useHistoryStore } from "@/stores/history";
import { formatDuration } from "@/lib/utils";
import { ProgressBar } from "../ui/ProgressBar";
import { useMounted } from "@/hooks/useMounted";

export function ContinueTrackingRow() {
  const mounted = useMounted();
  const items = useHistoryStore((s) => s.items);

  if (!mounted || !items || items.length === 0) return null;

  return (
    <div className="space-y-3 sm:space-y-3.5">
      <div className="flex items-center justify-between pb-2">
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-[var(--accent)]" />
          <h2 className="font-display text-base sm:text-lg font-bold text-white tracking-tight">
            Continue Tracking
          </h2>
        </div>
        <Link
          href="/profile/history"
          className="text-xs font-semibold text-[var(--accent)] hover:underline"
        >
          View All History &rarr;
        </Link>
      </div>

      <div className="flex gap-3 sm:gap-4 overflow-x-auto scrollbar-none pb-2">
        {items.slice(0, 6).map((item) => {
          const totalDuration = item.playbackDuration || 1440; // ~24min
          const pos = item.playbackPosition || 0;

          return (
            <Link
              key={item.animeId}
              href={`/anime/${item.animeId}/watch?ep=${item.episode}`}
              className="group relative flex w-56 sm:w-64 shrink-0 flex-col rounded-md border border-white/10 bg-[#131318] p-3 transition-all duration-150 hover:border-white/25 hover:-translate-y-0.5 shadow-sm"
            >
              {/* Thumbnail with overlay */}
              <div className="relative aspect-video w-full overflow-hidden rounded-md bg-zinc-900 border border-white/10">
                {item.animePoster ? (
                  <Image
                    src={item.animePoster}
                    alt={item.animeTitle}
                    fill
                    className="object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-xs text-zinc-600">
                    No Art
                  </div>
                )}
                {/* Play hover button */}
                <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--accent)] text-white shadow-md">
                    <Play className="h-4 w-4 fill-white ml-0.5" />
                  </div>
                </div>

                {/* Episode Progress Badge */}
                <div className="absolute bottom-2 left-2 rounded-md bg-black/80 backdrop-blur-md px-2 py-0.5 text-[10px] font-mono font-semibold text-white border border-white/10">
                  EP {item.episode} - {formatDuration(pos)}/{formatDuration(totalDuration)}
                </div>
              </div>

              {/* Progress bar */}
              <div className="mt-2.5 px-0.5">
                <ProgressBar value={pos} max={totalDuration} />
              </div>

              {/* Title */}
              <div className="mt-2 px-0.5">
                <h4 className="line-clamp-1 text-xs sm:text-sm font-semibold text-zinc-100 group-hover:text-[var(--accent)] transition-colors leading-snug">
                  {item.animeTitle}
                </h4>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
