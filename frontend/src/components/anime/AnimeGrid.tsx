import React from "react";
import { AnimeCardData } from "@/types/anime";
import { AnimeCard } from "./AnimeCard";
import { Skeleton } from "../ui/Skeleton";
import { Film } from "lucide-react";

interface AnimeGridProps {
  animeList: AnimeCardData[];
  isLoading?: boolean;
  skeletonCount?: number;
  emptyMessage?: string;
}

export function AnimeGrid({
  animeList,
  isLoading = false,
  skeletonCount = 12,
  emptyMessage = "No anime found matching your criteria.",
}: AnimeGridProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7 3xl:grid-cols-8 4xl:grid-cols-9 ultrawide:grid-cols-10 gap-3 sm:gap-4 lg:gap-5 animate-pulse-subtle">
        {Array.from({ length: skeletonCount }).map((_, i) => (
          <div key={i} className="space-y-2.5">
            <div className="aspect-[2/3] w-full rounded-md bg-white/[0.03] border border-white/[0.06] skeleton-shimmer" />
            <div className="h-3.5 w-3/4 rounded bg-white/[0.06]" />
            <div className="h-2.5 w-1/2 rounded bg-white/[0.04]" />
          </div>
        ))}
      </div>
    );
  }

  if (!animeList || animeList.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center border border-dashed border-white/10 rounded-md bg-white/[0.02] p-8">
        <div className="flex h-14 w-14 items-center justify-center rounded-md bg-white/5 text-zinc-400 mb-3">
          <Film className="h-7 w-7" />
        </div>
        <p className="text-base font-semibold text-zinc-200">{emptyMessage}</p>
        <p className="text-xs text-zinc-500 mt-1">Try adjusting your filters or search keywords.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7 3xl:grid-cols-8 4xl:grid-cols-9 ultrawide:grid-cols-10 gap-3.5 sm:gap-4 md:gap-4.5 lg:gap-5">
      {animeList.map((anime, idx) => (
        <AnimeCard key={`${anime.id}-${idx}`} anime={anime} priority={idx < 6} />
      ))}
    </div>
  );
}
