"use client";

import React, { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Plus, Check, Star, Play, Bookmark } from "lucide-react";
import { AnimeCardData } from "@/types/anime";
import { formatScore, getStatusDotColor } from "@/lib/utils";
import { useWatchlistStore } from "@/stores/watchlist";
import { useSettingsStore } from "@/stores/settings";
import { useMounted } from "@/hooks/useMounted";

interface AnimeCardProps {
  anime: AnimeCardData;
  priority?: boolean;
}

export function AnimeCard({ anime, priority = false }: AnimeCardProps) {
  const mounted = useMounted();
  const [isHovered, setIsHovered] = useState(false);
  const settingsLang = useSettingsStore((s) => s.titleLanguage);
  const titleLanguage = mounted ? settingsLang : "english";
  const { addItem, getItem } = useWatchlistStore();

  const watchlistEntry = mounted ? getItem(anime.id) : undefined;
  const isInWatchlist = !!watchlistEntry;

  // Title selection based on user settings
  const displayTitle =
    (titleLanguage === "romaji" ? anime.title.romaji : null) ||
    (titleLanguage === "native" ? anime.title.native : null) ||
    anime.title.english ||
    anime.title.romaji ||
    anime.title.userPreferred ||
    "Untitled Anime";

  const poster = anime.coverImage.large || anime.coverImage.extraLarge || anime.coverImage.medium;
  const accentColor = anime.coverImage.color || anime.accentColor || "#8b7cf6";

  const handleQuickAdd = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isInWatchlist) {
      addItem({
        animeId: anime.id,
        animeTitle: displayTitle,
        animePoster: poster,
        animeFormat: anime.format,
        animeYear: anime.startDate?.year || anime.seasonYear,
        status: "PLANNING",
        totalEpisodes: anime.episodes,
      });
    }
  };

  return (
    <div
      className="group relative flex flex-col transition-all duration-300"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <Link href={`/anime/${anime.id}`} className="block focus:outline-none">
        {/* Poster Container (2:3 Aspect Ratio) */}
        <div
          className="relative aspect-[2/3] w-full overflow-hidden rounded-md bg-zinc-900 border border-white/10 transition-all duration-200 group-hover:-translate-y-1"
        >
          {poster ? (
            <Image
              src={poster}
              alt={displayTitle}
              fill
              priority={priority}
              sizes="(max-width: 640px) 45vw, (max-width: 1024px) 28vw, 16vw"
              className="object-cover transition-transform duration-300 group-hover:scale-105"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-zinc-800 text-zinc-600 text-xs font-semibold">
              No Poster
            </div>
          )}

          {/* Top Gradient & Badges */}
          <div className="absolute inset-x-0 top-0 flex items-center justify-between p-2 bg-gradient-to-b from-black/80 via-black/30 to-transparent">
            {/* Status Dot */}
            <div className="flex items-center gap-1 rounded-full bg-black/60 backdrop-blur-md px-2 py-0.5 text-[10px] font-semibold text-white border border-white/10">
              <span className={`h-1.5 w-1.5 rounded-full ${getStatusDotColor(anime.status)}`} />
              <span className="capitalize">{anime.status?.toLowerCase().replace(/_/g, " ") || "TV"}</span>
            </div>

            {/* Score */}
            {anime.averageScore && (
              <div className="flex items-center gap-1 rounded-full bg-black/60 backdrop-blur-md px-2 py-0.5 text-[10px] font-bold text-amber-300 border border-amber-500/20">
                <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                <span>{formatScore(anime.averageScore)}</span>
              </div>
            )}
          </div>

          {/* Quick Add Overlay Button on Poster */}
          <button
            onClick={handleQuickAdd}
            title={isInWatchlist ? "In Watchlist" : "Add to Watchlist"}
            className="absolute bottom-2 right-2 z-10 flex h-8 w-8 items-center justify-center rounded-md bg-black/75 backdrop-blur-md text-white border border-white/20 opacity-0 group-hover:opacity-100 transition-all duration-150 hover:scale-105 active:scale-95 hover:bg-[var(--accent)]"
          >
            {isInWatchlist ? (
              <Check className="h-4 w-4 text-emerald-400" />
            ) : (
              <Plus className="h-4 w-4" />
            )}
          </button>
        </div>

        {/* Info below poster */}
        <div className="mt-2.5 px-0.5 space-y-1.5">
          <h3
            className="line-clamp-1 sm:line-clamp-2 text-xs sm:text-sm font-semibold text-zinc-100 group-hover:text-[var(--accent)] transition-colors leading-snug"
            title={displayTitle}
          >
            {displayTitle}
          </h3>

          <div className="flex items-center gap-2 text-[11px] text-zinc-400 font-medium">
            {anime.format && <span className="uppercase">{anime.format}</span>}
            {anime.format && " • "}
            {(anime.startDate?.year || anime.seasonYear) && (
              <span> {anime.startDate?.year || anime.seasonYear}</span>
            )}
            {anime.format && " • "}
            {anime.episodes && <span> {anime.episodes} eps</span>}
          </div>
        </div>
      </Link>
    </div>
  );
}
