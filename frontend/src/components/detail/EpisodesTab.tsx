"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import Image from "next/image";
import { Play, Check, Search, Calendar, Film } from "lucide-react";
import { useWatchlistStore } from "@/stores/watchlist";
import { useMounted } from "@/hooks/useMounted";

interface EpisodeItem {
  number: number;
  title: string;
  thumbnail?: string | null;
  url?: string | null;
  site?: string | null;
  airingAt?: number | null;
  isAired?: boolean;
}

interface EpisodesTabProps {
  animeId: number;
  animeTitle: string;
  episodes: EpisodeItem[];
}

export function EpisodesTab({ animeId, animeTitle, episodes }: EpisodesTabProps) {
  const mounted = useMounted();
  const [search, setSearch] = useState("");
  const [selectedRange, setSelectedRange] = useState(0); // 0 = 1-100, 1 = 101-200, etc.

  const { getItem, updateItem, addItem } = useWatchlistStore();
  const watchItem = mounted ? getItem(animeId) : undefined;
  const watchedProgress = watchItem?.progress || 0;

  const pageSize = 100;
  const totalEpisodes = episodes.length;
  const rangeCount = Math.ceil(totalEpisodes / pageSize);

  // Filter episodes by range and search query
  const filteredEpisodes = useMemo(() => {
    let list = episodes;
    if (rangeCount > 1) {
      const start = selectedRange * pageSize;
      list = list.slice(start, start + pageSize);
    }
    if (search.trim()) {
      const lower = search.toLowerCase();
      list = list.filter(
        (ep) =>
          ep.number.toString().includes(lower) ||
          ep.title.toLowerCase().includes(lower)
      );
    }
    return list;
  }, [episodes, selectedRange, rangeCount, search]);

  const toggleWatched = (epNumber: number) => {
    if (!watchItem) {
      addItem({
        animeId,
        animeTitle,
        status: "WATCHING",
        progress: epNumber,
        totalEpisodes: episodes.length,
      });
    } else {
      const newProgress = watchedProgress >= epNumber ? epNumber - 1 : epNumber;
      updateItem(animeId, {
        progress: newProgress,
        status: newProgress >= (watchItem.totalEpisodes || episodes.length) ? "COMPLETED" : "WATCHING",
      });
    }
  };

  return (
    <div className="space-y-3 sm:space-y-4">
      {/* Controls: Search & Range Selector */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 rounded-md border border-white/10 bg-[#131318] p-2.5 sm:p-3">
        {/* Search input */}
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search episode by number or title..."
            className="w-full rounded-md border border-white/10 bg-white/5 pl-8 pr-3 py-1.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-[var(--accent)]"
          />
        </div>

        {/* Range Selector for large series */}
        {rangeCount > 1 && (
          <div className="flex items-center gap-1 overflow-x-auto scrollbar-none">
            {Array.from({ length: rangeCount }).map((_, idx) => {
              const start = idx * pageSize + 1;
              const end = Math.min((idx + 1) * pageSize, totalEpisodes);
              return (
                <button
                  key={idx}
                  onClick={() => setSelectedRange(idx)}
                  className={`rounded px-2.5 py-1 text-xs font-semibold whitespace-nowrap transition-colors ${
                    selectedRange === idx
                      ? "bg-[var(--accent)] text-white"
                      : "border border-white/10 bg-white/5 text-zinc-400 hover:text-white"
                  }`}
                >
                  {start}-{end}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Episode Grid / List */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2.5 sm:gap-3">
        {filteredEpisodes.map((ep) => {
          const isWatched = watchedProgress >= ep.number;

          return (
            <div
              key={ep.number}
              className={`group relative flex flex-col rounded-md border overflow-hidden transition-all duration-150 ${
                isWatched
                  ? "border-emerald-500/20 bg-emerald-500/[0.02]"
                  : "border-white/10 bg-[#131318] hover:border-white/25"
              }`}
            >
              {/* Thumbnail with Watch Hub Play link (only for aired episodes) */}
              {ep.isAired !== false ? (
                <Link
                  href={`/anime/${animeId}/watch?ep=${ep.number}`}
                  className="relative aspect-video w-full overflow-hidden bg-zinc-900 block"
                >
                  {ep.thumbnail ? (
                    <Image
                      src={ep.thumbnail}
                      alt={ep.title}
                      fill
                      className="object-cover transition-transform duration-300 group-hover:scale-105"
                      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-zinc-600">
                      <Film className="h-5 w-5" />
                    </div>
                  )}

                  {/* Play Hover Overlay */}
                  <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--accent)] text-white">
                      <Play className="h-3.5 w-3.5 fill-white ml-0.5" />
                    </div>
                  </div>

                  {/* Badge: Episode Number */}
                  <div className="absolute top-1.5 left-1.5 flex items-center gap-1">
                    <span className="rounded bg-black/80 backdrop-blur-md px-1.5 py-0.5 text-[10px] font-mono font-bold text-white border border-white/10">
                      EP {ep.number}
                    </span>
                  </div>
                </Link>
              ) : (
                <div className="relative aspect-video w-full overflow-hidden bg-zinc-900/80 block cursor-not-allowed">
                  {ep.thumbnail ? (
                    <Image
                      src={ep.thumbnail}
                      alt={ep.title}
                      fill
                      className="object-cover opacity-50 grayscale"
                      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-zinc-600">
                      <Film className="h-5 w-5" />
                    </div>
                  )}

                  {/* Upcoming Overlay */}
                  <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                    <span className="rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2 py-0.5 text-[10px] font-bold">
                      Upcoming
                    </span>
                  </div>

                  <div className="absolute top-1.5 left-1.5">
                    <span className="rounded bg-black/80 px-1.5 py-0.5 text-[10px] font-mono font-bold text-zinc-400 border border-white/10">
                      EP {ep.number}
                    </span>
                  </div>
                </div>
              )}

              {/* Episode Info & Mark Watched Button */}
              <div className="p-2 sm:p-2.5 flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <h4 className="line-clamp-1 text-xs font-semibold text-zinc-100 group-hover:text-[var(--accent)] transition-colors">
                    {ep.title}
                  </h4>
                  {ep.airingAt && (
                    <span className="flex items-center gap-1 text-[10px] text-zinc-400 mt-0.5">
                      <Calendar className="h-3 w-3" />
                      {new Date(ep.airingAt * 1000).toLocaleDateString()}
                    </span>
                  )}
                </div>

                {/* Quick Mark Watched Checkbox */}
                <button
                  onClick={() => toggleWatched(ep.number)}
                  title={isWatched ? "Marked Watched" : "Mark as Watched"}
                  className={`flex h-7 w-7 shrink-0 items-center justify-center rounded border transition-all ${
                    isWatched
                      ? "border-emerald-500 bg-emerald-500/20 text-emerald-400"
                      : "border-white/15 bg-white/5 text-zinc-500 hover:border-white/30 hover:text-white"
                  }`}
                >
                  <Check className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {filteredEpisodes.length === 0 && (
        <div className="py-6 text-center text-xs text-zinc-400">
          No episodes found matching your filter.
        </div>
      )}
    </div>
  );
}
