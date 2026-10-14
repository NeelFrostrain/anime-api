"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { Play, Info, Star, Clock, Sparkles, ChevronLeft, ChevronRight, Bookmark, Check } from "lucide-react";
import { AnimeCardData } from "@/types/anime";
import { formatScore } from "@/lib/utils";
import { useWatchlistStore } from "@/stores/watchlist";
import { useMounted } from "@/hooks/useMounted";

interface SpotlightHeroProps {
  spotlightList: AnimeCardData[];
}

export function SpotlightHero({ spotlightList }: SpotlightHeroProps) {
  const mounted = useMounted();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const { addItem, getItem } = useWatchlistStore();

  const total = spotlightList.length;
  const currentAnime = spotlightList[currentIndex] || spotlightList[0];

  // Auto rotate every 8 seconds with progress bar
  useEffect(() => {
    if (total <= 1) return;
    const interval = 80; // 80ms * 100 steps = 8000ms
    const timer = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          setCurrentIndex((idx) => (idx + 1) % total);
          return 0;
        }
        return prev + 1;
      });
    }, interval);

    return () => clearInterval(timer);
  }, [total, currentIndex]);

  if (!currentAnime) return null;

  const title = currentAnime.title.english || currentAnime.title.romaji || "Spotlight Anime";
  const banner = currentAnime.bannerImage || currentAnime.coverImage.extraLarge || currentAnime.coverImage.large;

  const isInWatchlist = mounted ? !!getItem(currentAnime.id) : false;

  const handleNext = () => {
    setCurrentIndex((prev) => (prev + 1) % total);
    setProgress(0);
  };

  const handlePrev = () => {
    setCurrentIndex((prev) => (prev - 1 + total) % total);
    setProgress(0);
  };

  const handleWatchlist = () => {
    if (!isInWatchlist) {
      addItem({
        animeId: currentAnime.id,
        animeTitle: title,
        animePoster: currentAnime.coverImage.large,
        animeFormat: currentAnime.format,
        animeYear: currentAnime.startDate?.year || currentAnime.seasonYear,
        status: "PLANNING",
        totalEpisodes: currentAnime.episodes,
      });
    }
  };

  return (
    <section className="relative w-full h-[500px] sm:h-[560px] md:h-[620px] lg:h-[660px] max-h-[720px] overflow-hidden select-none">
      {/* Background Banner Art - Main Focus */}
      <div className="absolute inset-0">
        {banner && (
          <Image
            src={banner}
            alt={title}
            fill
            priority
            className="object-cover object-center scale-100 transition-all duration-1000 ease-out"
          />
        )}
        {/* Subtle Gradient Overlays - Gentle so background image is sharp and vivid */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0c] via-[#0a0a0c]/40 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#0a0a0c]/85 via-[#0a0a0c]/30 to-transparent" />
      </div>

      {/* Hero Content Container */}
      <div className="relative z-10 w-full flex h-full flex-col justify-end px-4 sm:px-6 md:px-8 lg:px-10 xl:px-12 pb-6 sm:pb-8 md:pb-9">
        <div className="max-w-2xl space-y-3 sm:space-y-3.5">
          {/* Spotlight Badge & Meta Chips */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="flex items-center gap-1.5 rounded-full bg-[var(--accent)] text-white px-3 py-1 text-xs font-bold uppercase tracking-wider shadow-sm">
              <Sparkles className="h-3 w-3" />
              Spotlight #{currentIndex + 1}
            </span>

            {currentAnime.format && (
              <span className="rounded-md border border-white/15 bg-white/10 px-2.5 py-1 text-xs font-semibold text-zinc-200 uppercase backdrop-blur-sm">
                {currentAnime.format}
              </span>
            )}

            {currentAnime.averageScore && (
              <span className="flex items-center gap-1 rounded-md border border-amber-500/30 bg-amber-500/15 px-2.5 py-1 text-xs font-bold text-amber-300 backdrop-blur-sm">
                <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                {formatScore(currentAnime.averageScore)}
              </span>
            )}

            {currentAnime.duration && (
              <span className="flex items-center gap-1 rounded-md border border-white/10 bg-white/5 px-2.5 py-1 text-xs font-medium text-zinc-300 backdrop-blur-sm">
                <Clock className="h-3 w-3" />
                {currentAnime.duration}m
              </span>
            )}

            {currentAnime.episodes && (
              <span className="text-xs font-medium text-zinc-300 px-1">
                {currentAnime.episodes} Episodes
              </span>
            )}
          </div>

          {/* Title */}
          <h1 className="font-display font-extrabold text-2xl sm:text-3xl md:text-4xl lg:text-5xl text-white tracking-tight line-clamp-1 sm:line-clamp-2 leading-tight">
            {title}
          </h1>

          {/* 2-Line Synopsis */}
          <p className="line-clamp-2 text-xs sm:text-sm text-zinc-300/90 leading-relaxed max-w-xl">
            {currentAnime.description || "No description available for this anime."}
          </p>

          {/* Genre Chips */}
          <div className="flex flex-wrap gap-2 pt-0.5">
            {currentAnime.genres?.slice(0, 4).map((g) => (
              <span
                key={g}
                className="rounded-md border border-white/10 bg-white/5 px-2.5 py-1 text-xs text-zinc-300"
              >
                {g}
              </span>
            ))}
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-3 pt-2">
            <Link
              href={`/anime/${currentAnime.id}/watch`}
              className="flex items-center gap-2 rounded-md bg-[var(--accent)] hover:brightness-110 text-white font-bold text-xs sm:text-sm px-5 py-2.5 transition-all active:scale-95 shadow-md shadow-[var(--accent)]/20"
            >
              <Play className="h-3.5 w-3.5 fill-white" />
              <span>WHERE TO WATCH</span>
            </Link>

            <Link
              href={`/anime/${currentAnime.id}`}
              className="flex items-center gap-1.5 rounded-md border border-white/20 bg-white/10 hover:bg-white/20 text-white font-semibold text-xs sm:text-sm px-4 py-2.5 backdrop-blur-md transition-all active:scale-95"
            >
              <Info className="h-3.5 w-3.5" />
              <span>DETAILS</span>
            </Link>

            <button
              onClick={handleWatchlist}
              className="flex items-center gap-1.5 rounded-md border border-white/20 bg-black/40 hover:bg-white/10 text-zinc-200 text-xs sm:text-sm px-4 py-2.5 backdrop-blur-md transition-all active:scale-95"
            >
              {isInWatchlist ? (
                <>
                  <Check className="h-3.5 w-3.5 text-emerald-400" />
                  <span className="text-emerald-400 font-medium">In Library</span>
                </>
              ) : (
                <>
                  <Bookmark className="h-3.5 w-3.5" />
                  <span>+ Watchlist</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Carousel Bottom Controls & Progress Dots */}
        <div className="mt-6 sm:mt-7 flex items-center justify-between border-t border-white/10 pt-4">
          {/* Progress Indicators */}
          <div className="flex items-center gap-2">
            {spotlightList.slice(0, 10).map((item, idx) => (
              <button
                key={item.id}
                onClick={() => {
                  setCurrentIndex(idx);
                  setProgress(0);
                }}
                className="relative h-1.5 rounded-full overflow-hidden transition-all duration-300 bg-white/20"
                style={{ width: currentIndex === idx ? 40 : 12 }}
              >
                {currentIndex === idx && (
                  <div
                    className="h-full bg-[var(--accent)]"
                    style={{ width: `${progress}%` }}
                  />
                )}
              </button>
            ))}
          </div>

          {/* Prev/Next Buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrev}
              className="flex h-9 w-9 items-center justify-center rounded-md border border-white/10 bg-white/5 text-zinc-300 hover:bg-white/15 hover:text-white transition-colors"
              aria-label="Previous Spotlight"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              onClick={handleNext}
              className="flex h-9 w-9 items-center justify-center rounded-md border border-white/10 bg-white/5 text-zinc-300 hover:bg-white/15 hover:text-white transition-colors"
              aria-label="Next Spotlight"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
