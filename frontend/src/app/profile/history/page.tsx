"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";
import { Clock, Play, Trash2, ChevronLeft } from "lucide-react";
import { useHistoryStore } from "@/stores/history";
import { formatDuration } from "@/lib/utils";
import { ProgressBar } from "@/components/ui/ProgressBar";

export default function HistoryPage() {
  const { items } = useHistoryStore();

  return (
    <div className="w-full px-4 sm:px-6 md:px-8 lg:px-10 xl:px-12 py-8 space-y-8 min-h-screen">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-white/10 pb-6">
        <div>
          <Link
            href="/profile"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--accent)] hover:underline mb-2"
          >
            <ChevronLeft className="h-4 w-4" />
            Profile Overview
          </Link>
          <h1 className="font-display text-3xl sm:text-4xl font-extrabold text-white flex items-center gap-3">
            <span>Continue Tracking</span>
            <span className="rounded-md bg-white/10 px-3 py-1 text-sm font-bold text-[var(--accent)]">
              {items.length}
            </span>
          </h1>
          <p className="text-xs text-zinc-400 mt-1">
            Pick up right where you left off on recent episodes.
          </p>
        </div>
      </div>

      {/* History Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {items.map((item) => {
          const duration = item.playbackDuration || 1440;
          const pos = item.playbackPosition || 0;

          return (
            <div
              key={item.animeId}
              className="group flex flex-col rounded-md border border-white/10 bg-[#131318] p-3 shadow-xl hover:border-white/20 transition-all"
            >
              <div className="relative aspect-video w-full overflow-hidden rounded-md bg-zinc-900">
                {item.animePoster ? (
                  <Image
                    src={item.animePoster}
                    alt={item.animeTitle}
                    fill
                    className="object-cover transition-transform group-hover:scale-105"
                  />
                ) : null}

                <Link
                  href={`/anime/${item.animeId}/watch?ep=${item.episode}`}
                  className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--accent)] text-white shadow-glow">
                    <Play className="h-5 w-5 fill-white ml-0.5" />
                  </div>
                </Link>

                <div className="absolute bottom-2 left-2 rounded-md bg-black/80 backdrop-blur-md px-2 py-0.5 text-[10px] font-mono font-bold text-white border border-white/10">
                  EP {item.episode} - {formatDuration(pos)}/{formatDuration(duration)}
                </div>
              </div>

              <div className="mt-3 px-1 space-y-2">
                <ProgressBar value={pos} max={duration} />

                <div className="flex items-center justify-between">
                  <div className="min-w-0">
                    <Link
                      href={`/anime/${item.animeId}`}
                      className="line-clamp-1 text-xs font-bold text-white hover:text-[var(--accent)] transition-colors"
                    >
                      {item.animeTitle}
                    </Link>
                    <p className="text-[11px] text-zinc-400 mt-0.5">
                      {item.episodeTitle || `Episode ${item.episode}`}
                    </p>
                  </div>

                  <Link
                    href={`/anime/${item.animeId}/watch?ep=${item.episode}`}
                    className="flex items-center gap-1 rounded-md bg-[var(--accent)] hover:brightness-110 text-white font-bold text-xs px-3 py-1.5 shadow-glow"
                  >
                    Resume
                  </Link>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {items.length === 0 && (
        <div className="py-20 text-center text-zinc-500 text-xs border border-dashed border-white/10 rounded-md">
          No playback history recorded yet. Open any anime in the Watch Hub to start tracking.
        </div>
      )}
    </div>
  );
}
