"use client";

import React, { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  Play,
  Bookmark,
  Share2,
  Calendar,
  Clock,
  Sparkles,
  Tv,
  Check,
  Film,
  ExternalLink as ExtIcon,
  ChevronDown,
} from "lucide-react";
import { AnimeDetailData } from "@/types/anime";
import { formatTimeUntil, formatScore } from "@/lib/utils";
import { RatingRing } from "../ui/RatingRing";
import { TrailerModal } from "./TrailerModal";
import { useWatchlistStore } from "@/stores/watchlist";
import { WatchlistStatus } from "@/types/user";
import { useMounted } from "@/hooks/useMounted";

interface DetailHeaderProps {
  anime: AnimeDetailData;
}

export function DetailHeader({ anime }: DetailHeaderProps) {
  const mounted = useMounted();
  const [titleLang, setTitleLang] = useState<"english" | "romaji" | "native">("english");
  const [trailerOpen, setTrailerOpen] = useState(false);
  const [statusDropdownOpen, setStatusDropdownOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const { addItem, updateItem, removeItem, getItem } = useWatchlistStore();
  const watchItem = mounted ? getItem(anime.id) : undefined;

  const displayTitle =
    (titleLang === "english" && anime.title.english) ||
    (titleLang === "native" && anime.title.native) ||
    anime.title.romaji ||
    anime.title.userPreferred ||
    "Anime";

  const banner = anime.bannerImage || anime.coverImage.extraLarge || anime.coverImage.large;
  const poster = anime.coverImage.extraLarge || anime.coverImage.large;
  const accentColor = anime.coverImage.color || anime.accentColor || "#8b7cf6";

  const nextEp = anime.nextAiringEpisode;

  const handleShare = () => {
    if (typeof window !== "undefined") {
      navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleSetStatus = (status: WatchlistStatus) => {
    setStatusDropdownOpen(false);
    if (!watchItem) {
      addItem({
        animeId: anime.id,
        animeTitle: displayTitle,
        animePoster: poster,
        animeFormat: anime.format,
        animeYear: anime.startDate?.year || anime.seasonYear,
        status,
        totalEpisodes: anime.episodes,
      });
    } else {
      updateItem(anime.id, { status });
    }
  };

  const STATUSES: { label: string; value: WatchlistStatus }[] = [
    { label: "Watching", value: "WATCHING" },
    { label: "Plan to Watch", value: "PLANNING" },
    { label: "Completed", value: "COMPLETED" },
    { label: "On Hold", value: "PAUSED" },
    { label: "Dropped", value: "DROPPED" },
  ];

  return (
    <>
      <div className="relative w-full overflow-hidden bg-[#0a0a0c]">
        {/* Banner with smooth gradient overlays */}
        <div className="relative h-48 sm:h-56 md:h-64 w-full overflow-hidden">
          {banner && (
            <Image
              src={banner}
              alt={displayTitle}
              fill
              priority
              className="object-cover object-center filter blur-[1px] brightness-75 scale-105"
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0c] via-[#0a0a0c]/60 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-r from-[#0a0a0c]/90 via-[#0a0a0c]/40 to-transparent" />
        </div>

        {/* Content Details Block */}
        <div className="relative z-10 w-full px-4 sm:px-6 md:px-8 lg:px-10 xl:px-12 -mt-24 sm:-mt-32 pb-6 sm:pb-8">
          <div className="flex flex-col md:flex-row gap-4 sm:gap-6 items-start">
            {/* Poster Card */}
            <div className="relative aspect-[2/3] w-36 sm:w-44 md:w-52 shrink-0 overflow-hidden rounded-md bg-zinc-900 border-2 border-white/15">
              {poster ? (
                <Image
                  src={poster}
                  alt={displayTitle}
                  fill
                  priority
                  className="object-cover"
                  sizes="(max-width: 768px) 160px, 220px"
                />
              ) : null}

              {/* Score badge top-right */}
              {anime.averageScore && (
                <div className="absolute top-2.5 right-2.5 rounded-full bg-black/75 backdrop-blur-md p-1 border border-white/15 flex justify-center items-center">
                  <RatingRing score={anime.averageScore} size={36} />
                </div>
              )}
            </div>

            {/* Info and Actions */}
            <div className="flex-1 space-y-3">
              {/* Next Airing Countdown Banner if Airing */}
              {nextEp && (
                <div className="inline-flex items-center gap-1.5 rounded-md border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-[11px] font-semibold text-emerald-400 backdrop-blur-md animate-pulse-subtle">
                  <Calendar className="h-3.5 w-3.5" />
                  <span>
                    Episode {nextEp.episode} airs in {formatTimeUntil(nextEp.timeUntilAiring)}
                  </span>
                </div>
              )}

              {/* Title & Language Selector */}
              <div>
                <h1 className="font-display font-extrabold text-xl sm:text-2xl md:text-3xl text-white tracking-tight leading-tight">
                  {displayTitle}
                </h1>

                {/* Subtitle / Alternate Title */}
                <p className="text-xs text-zinc-400 mt-0.5 font-medium">
                  {titleLang === "english" ? anime.title.romaji : anime.title.english}
                </p>

                {/* Title Language Switcher */}
                <div className="flex items-center gap-1.5 mt-1.5">
                  <span className="text-[10px] text-zinc-400 font-medium mr-1">Title:</span>
                  {(["english", "romaji", "native"] as const).map((lang) => (
                    <button
                      key={lang}
                      onClick={() => setTitleLang(lang)}
                      className={`rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase transition-colors ${
                        titleLang === lang
                          ? "bg-white/20 text-white"
                          : "text-zinc-400 hover:text-zinc-200 hover:bg-white/5"
                      }`}
                    >
                      {lang}
                    </button>
                  ))}
                </div>
              </div>

              {/* Metadata Badges Row */}
              <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
                {anime.format && (
                  <span className="rounded border border-white/15 bg-white/10 px-2 py-0.5 font-bold text-white uppercase text-[10px]">
                    {anime.format}
                  </span>
                )}
                {anime.status && (
                  <span className="rounded border border-white/10 bg-white/5 px-2 py-0.5 text-zinc-300 font-medium capitalize">
                    {anime.status.toLowerCase().replace(/_/g, " ")}
                  </span>
                )}
                {(anime.startDate?.year || anime.seasonYear) && (
                  <span className="rounded border border-white/10 bg-white/5 px-2 py-0.5 text-zinc-300 font-medium">
                    {anime.season ? `${anime.season} ` : ""}{anime.startDate?.year || anime.seasonYear}
                  </span>
                )}
                {anime.episodes && (
                  <span className="rounded border border-white/10 bg-white/5 px-2 py-0.5 text-zinc-300 font-medium">
                    {anime.episodes} Eps
                  </span>
                )}
                {anime.duration && (
                  <span className="rounded border border-white/10 bg-white/5 px-2 py-0.5 text-zinc-300 font-medium">
                    {anime.duration}m/ep
                  </span>
                )}
                {(Array.isArray(anime.studios)
                  ? anime.studios
                  : ((anime.studios as any)?.nodes || [])
                )
                  .filter((s: any) => s.isMain !== false)
                  .map((studio: any) => (
                    <Link
                      key={studio.id}
                      href={`/studio/${studio.id}`}
                      className="rounded border border-[var(--accent)]/30 bg-[var(--accent)]/10 px-2 py-0.5 font-semibold text-[var(--accent)] hover:bg-[var(--accent)]/20 transition-colors"
                    >
                      {studio.name}
                    </Link>
                  ))}
              </div>

              {/* Action Buttons Bar */}
              <div className="flex flex-wrap items-center gap-2 pt-1">
                {/* Watch Hub Button */}
                <Link
                  href={`/anime/${anime.id}/watch`}
                  className="flex items-center gap-1.5 rounded-md bg-[var(--accent)] hover:brightness-110 text-white font-bold text-xs px-4 py-2 transition-all active:scale-95"
                >
                  <Play className="h-3.5 w-3.5 fill-white" />
                  <span>WATCH HUB</span>
                </Link>

                {/* Add to Watchlist Dropdown */}
                <div className="relative">
                  <button
                    onClick={() => setStatusDropdownOpen(!statusDropdownOpen)}
                    className="flex items-center gap-1.5 rounded-md border border-white/20 bg-white/10 hover:bg-white/15 text-white font-semibold text-xs px-3 py-2 backdrop-blur-md transition-all active:scale-95"
                  >
                    <Bookmark className="h-3.5 w-3.5" />
                    <span>{watchItem ? watchItem.status : "Add to List"}</span>
                    <ChevronDown className="h-3 w-3 ml-0.5 text-zinc-400" />
                  </button>

                  {statusDropdownOpen && (
                    <>
                      <div
                        className="fixed inset-0 z-40"
                        onClick={() => setStatusDropdownOpen(false)}
                      />
                      <div className="absolute left-0 mt-1 w-44 rounded-md border border-white/10 bg-[#131318] p-1 z-50">
                        {STATUSES.map((st) => (
                          <button
                            key={st.value}
                            onClick={() => handleSetStatus(st.value)}
                            className={`flex w-full items-center justify-between rounded px-2.5 py-1.5 text-xs font-medium transition-colors ${
                              watchItem?.status === st.value
                                ? "bg-[var(--accent)] text-white font-semibold"
                                : "text-zinc-200 hover:bg-white/10"
                            }`}
                          >
                            <span>{st.label}</span>
                            {watchItem?.status === st.value && <Check className="h-3.5 w-3.5" />}
                          </button>
                        ))}
                        {watchItem && (
                          <div className="pt-1 mt-1 border-t border-white/10">
                            <button
                              onClick={() => {
                                setStatusDropdownOpen(false);
                                removeItem(anime.id);
                              }}
                              className="flex w-full items-center px-2.5 py-1.5 text-xs font-medium text-rose-400 hover:bg-rose-500/10 rounded"
                            >
                              Remove from Library
                            </button>
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </div>

                {/* Trailer Button */}
                {anime.trailer?.id && (
                  <button
                    onClick={() => setTrailerOpen(true)}
                    className="flex items-center gap-1.5 rounded-md border border-white/15 bg-white/5 hover:bg-white/10 text-zinc-200 font-semibold text-xs px-3 py-2 backdrop-blur-md transition-all active:scale-95"
                  >
                    <Film className="h-3.5 w-3.5 text-pink-400" />
                    <span>Trailer</span>
                  </button>
                )}

                {/* Share Button */}
                <button
                  onClick={handleShare}
                  className="flex items-center gap-1.5 rounded-md border border-white/15 bg-white/5 hover:bg-white/10 text-zinc-200 text-xs px-3 py-2 backdrop-blur-md transition-all active:scale-95"
                >
                  <Share2 className="h-3.5 w-3.5" />
                  <span>{copied ? "Copied!" : "Share"}</span>
                </button>
              </div>

              {/* Where to Watch (Official Legal Streaming Platforms) */}
              {anime.streamingLinks && anime.streamingLinks.length > 0 && (
                <div className="pt-2">
                  <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">
                    Official Streaming Platforms
                  </p>
                  <div className="flex flex-wrap items-center gap-2">
                    {anime.streamingLinks.map((link) => (
                      <a
                        key={link.id}
                        href={link.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1.5 rounded-md border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-semibold text-white hover:border-[var(--accent)] hover:bg-[var(--accent)]/15 transition-all"
                      >
                        <span>{link.site}</span>
                        <ExtIcon className="h-3 w-3 text-zinc-400" />
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Trailer Modal */}
      <TrailerModal
        isOpen={trailerOpen}
        onClose={() => setTrailerOpen(false)}
        trailerId={anime.trailer?.id || null}
        site={anime.trailer?.site}
        title={displayTitle}
      />
    </>
  );
}
