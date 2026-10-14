"use client";

import React, { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Star, Flame, CalendarClock, ChevronRight } from "lucide-react";
import { AnimeCardData } from "@/types/anime";
import { formatScore } from "@/lib/utils";

interface TopSidebarProps {
  topAiring: AnimeCardData[];
  upcoming: AnimeCardData[];
}

export function TopSidebar({ topAiring, upcoming }: TopSidebarProps) {
  const [tab, setTab] = useState<"airing" | "upcoming">("airing");

  const list = tab === "airing" ? topAiring.slice(0, 7) : upcoming.slice(0, 7);

  return (
    <aside className="rounded-md border border-white/10 bg-[#131318] p-4 sm:p-4.5 shadow-sm">
      {/* Tabs */}
      <div className="flex items-center gap-1.5 border-b border-white/10 pb-3 mb-3">
        <button
          onClick={() => setTab("airing")}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-bold rounded-md transition-all ${
            tab === "airing"
              ? "bg-[var(--accent)] text-white shadow-sm"
              : "text-zinc-400 hover:text-white hover:bg-white/5"
          }`}
        >
          <Flame className="h-3.5 w-3.5" />
          <span>TOP AIRING</span>
        </button>
        <button
          onClick={() => setTab("upcoming")}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-bold rounded-md transition-all ${
            tab === "upcoming"
              ? "bg-[var(--accent)] text-white shadow-sm"
              : "text-zinc-400 hover:text-white hover:bg-white/5"
          }`}
        >
          <CalendarClock className="h-3.5 w-3.5" />
          <span>UPCOMING</span>
        </button>
      </div>

      {/* List items */}
      <div className="space-y-2">
        {list.map((anime, index) => {
          const title = anime.title.english || anime.title.romaji || "Anime";
          const poster = anime.coverImage.large || anime.coverImage.medium;

          return (
            <Link
              key={anime.id}
              href={`/anime/${anime.id}`}
              className="group flex items-center gap-3 rounded-md p-2 transition-colors hover:bg-white/5"
            >
              {/* Rank Number */}
              <span className={`w-6 text-center font-display font-extrabold text-xs sm:text-sm shrink-0 ${
                index === 0 ? "text-amber-400" : index === 1 ? "text-zinc-300" : index === 2 ? "text-amber-600" : "text-zinc-500"
              }`}>
                {index + 1}
              </span>

              {/* Poster Thumb */}
              <div className="relative h-16 w-11 shrink-0 overflow-hidden rounded-md bg-zinc-800 border border-white/10 shadow-sm">
                {poster ? (
                  <Image
                    src={poster}
                    alt={title}
                    fill
                    className="object-cover transition-transform duration-300 group-hover:scale-105"
                    sizes="48px"
                  />
                ) : null}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0 pr-1">
                <h4 className="line-clamp-2 text-xs sm:text-[13px] font-semibold text-zinc-100 group-hover:text-[var(--accent)] transition-colors leading-snug">
                  {title}
                </h4>
                <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-zinc-400 mt-1">
                  {anime.format && <span className="uppercase font-medium text-zinc-400">{anime.format}</span>}
                  {(anime.startDate?.year || anime.seasonYear) && (
                    <span>• {anime.startDate?.year || anime.seasonYear}</span>
                  )}
                  {anime.episodes && <span>• {anime.episodes} eps</span>}
                </div>
              </div>

              {/* Score Badge */}
              {anime.averageScore ? (
                <div className="flex items-center gap-1 rounded-md bg-amber-500/10 px-2 py-0.5 text-[11px] font-bold text-amber-300 border border-amber-500/20 shrink-0">
                  <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                  <span>{formatScore(anime.averageScore)}</span>
                </div>
              ) : null}
            </Link>
          );
        })}
      </div>

      <div className="mt-4 pt-3 border-t border-white/10 text-center">
        <Link
          href={tab === "airing" ? "/top-airing" : "/upcoming"}
          className="text-xs font-semibold text-[var(--accent)] hover:underline inline-flex items-center gap-1"
        >
          View Full List <ChevronRight className="h-3 w-3" />
        </Link>
      </div>
    </aside>
  );
}
