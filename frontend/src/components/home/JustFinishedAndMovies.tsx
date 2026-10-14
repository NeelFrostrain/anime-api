"use client";

import React, { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { CheckCircle2, Film, Star, ChevronRight } from "lucide-react";
import { AnimeCardData } from "@/types/anime";
import { formatScore } from "@/lib/utils";

interface JustFinishedAndMoviesProps {
  justFinished: AnimeCardData[];
  topMovies: AnimeCardData[];
}

export function JustFinishedAndMovies({ justFinished, topMovies }: JustFinishedAndMoviesProps) {
  const [hoveredFinishedArt, setHoveredFinishedArt] = useState<string | null>(null);
  const [hoveredMovieArt, setHoveredMovieArt] = useState<string | null>(null);

  const finishedList = justFinished.slice(0, 5);
  const moviesList = topMovies.slice(0, 5);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 sm:gap-6 my-6">
      {/* JUST FINISHED COLUMN */}
      <div className="relative overflow-hidden rounded-md border border-white/10 bg-[#131318] p-4 sm:p-5 shadow-sm transition-all">
        {/* Background art on hover */}
        {hoveredFinishedArt && (
          <div className="absolute inset-0 z-0 opacity-15 transition-opacity duration-500 pointer-events-none">
            <Image
              src={hoveredFinishedArt}
              alt="hover art"
              fill
              className="object-cover blur-sm scale-105"
            />
            <div className="absolute inset-0 bg-[#131318]/70" />
          </div>
        )}

        <div className="relative z-10 flex items-center justify-between pb-3 border-b border-white/10 mb-3">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-blue-400" />
            <h3 className="font-display font-bold text-xs sm:text-sm text-white">Just Finished</h3>
          </div>
          <Link
            href="/just-finished"
            className="text-xs font-semibold text-[var(--accent)] hover:underline inline-flex items-center gap-0.5"
          >
            View More <ChevronRight className="h-3 w-3" />
          </Link>
        </div>

        <div className="relative z-10 space-y-2">
          {finishedList.map((anime) => {
            const title = anime.title.english || anime.title.romaji || "Anime";
            const poster = anime.coverImage.large || anime.coverImage.medium;
            const banner = anime.bannerImage || poster;

            return (
              <Link
                key={anime.id}
                href={`/anime/${anime.id}`}
                onMouseEnter={() => setHoveredFinishedArt(banner)}
                onMouseLeave={() => setHoveredFinishedArt(null)}
                className="group flex items-center gap-3 rounded-md border border-white/5 bg-white/[0.02] p-2 sm:p-2.5 hover:border-white/15 hover:bg-white/10 transition-all"
              >
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
                <div className="flex-1 min-w-0">
                  <h4 className="line-clamp-1 text-xs sm:text-[13px] font-semibold text-zinc-100 group-hover:text-[var(--accent)] transition-colors leading-snug">
                    {title}
                  </h4>
                  <div className="flex items-center gap-2 text-[11px] text-zinc-400 mt-1">
                    <span>{anime.episodes || "?"} eps</span>
                    {anime.startDate?.year && <span>• {anime.startDate.year}</span>}
                  </div>
                </div>
                {anime.averageScore && (
                  <div className="flex items-center gap-1 rounded-md bg-amber-500/10 px-2 py-0.5 text-[11px] font-bold text-amber-300 border border-amber-500/20 shrink-0">
                    <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                    <span>{formatScore(anime.averageScore)}</span>
                  </div>
                )}
              </Link>
            );
          })}
        </div>
      </div>

      {/* TOP MOVIES COLUMN */}
      <div className="relative overflow-hidden rounded-md border border-white/10 bg-[#131318] p-4 sm:p-5 shadow-sm transition-all">
        {/* Background art on hover */}
        {hoveredMovieArt && (
          <div className="absolute inset-0 z-0 opacity-15 transition-opacity duration-500 pointer-events-none">
            <Image
              src={hoveredMovieArt}
              alt="hover art"
              fill
              className="object-cover blur-sm scale-105"
            />
            <div className="absolute inset-0 bg-[#131318]/70" />
          </div>
        )}

        <div className="relative z-10 flex items-center justify-between pb-3 border-b border-white/10 mb-3">
          <div className="flex items-center gap-2">
            <Film className="h-4 w-4 text-purple-400" />
            <h3 className="font-display font-bold text-xs sm:text-sm text-white">Top Anime Movies</h3>
          </div>
          <Link
            href="/movies"
            className="text-xs font-semibold text-[var(--accent)] hover:underline inline-flex items-center gap-0.5"
          >
            View More <ChevronRight className="h-3 w-3" />
          </Link>
        </div>

        <div className="relative z-10 space-y-2">
          {moviesList.map((anime) => {
            const title = anime.title.english || anime.title.romaji || "Anime Movie";
            const poster = anime.coverImage.large || anime.coverImage.medium;
            const banner = anime.bannerImage || poster;

            return (
              <Link
                key={anime.id}
                href={`/anime/${anime.id}`}
                onMouseEnter={() => setHoveredMovieArt(banner)}
                onMouseLeave={() => setHoveredMovieArt(null)}
                className="group flex items-center gap-3 rounded-md border border-white/5 bg-white/[0.02] p-2 sm:p-2.5 hover:border-white/15 hover:bg-white/10 transition-all"
              >
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
                <div className="flex-1 min-w-0">
                  <h4 className="line-clamp-1 text-xs sm:text-[13px] font-semibold text-zinc-100 group-hover:text-[var(--accent)] transition-colors leading-snug">
                    {title}
                  </h4>
                  <div className="flex items-center gap-2 text-[11px] text-zinc-400 mt-1">
                    {anime.duration && <span>{anime.duration} mins</span>}
                    {anime.startDate?.year && <span>• {anime.startDate.year}</span>}
                  </div>
                </div>
                {anime.averageScore && (
                  <div className="flex items-center gap-1 rounded-md bg-amber-500/10 px-2 py-0.5 text-[11px] font-bold text-amber-300 border border-amber-500/20 shrink-0">
                    <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                    <span>{formatScore(anime.averageScore)}</span>
                  </div>
                )}
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
