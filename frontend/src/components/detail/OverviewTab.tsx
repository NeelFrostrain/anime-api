"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Eye, EyeOff, Tag as TagIcon, Sparkles } from "lucide-react";
import { AnimeDetailData } from "@/types/anime";

interface OverviewTabProps {
  anime: AnimeDetailData;
}

export function OverviewTab({ anime }: OverviewTabProps) {
  const [showSpoilerTags, setShowSpoilerTags] = useState(false);

  const tags = anime.tags || [];
  const displayTags = showSpoilerTags ? tags : tags.filter((t) => !t.isMediaSpoiler);
  const spoilerCount = tags.filter((t) => t.isMediaSpoiler).length;

  return (
    <div className="space-y-3 sm:space-y-4">
      {/* Synopsis Section */}
      <div className="rounded-md border border-white/10 bg-[#131318] p-3.5 sm:p-4 space-y-2">
        <h3 className="font-display text-sm sm:text-base font-bold text-white flex items-center gap-1.5">
          <Sparkles className="h-3.5 w-3.5 text-[var(--accent)]" />
          <span>Synopsis</span>
        </h3>
        <p className="text-xs sm:text-sm text-zinc-300 leading-relaxed whitespace-pre-line">
          {anime.description || "No detailed synopsis available for this title."}
        </p>
      </div>

      {/* Genres and Tags */}
      <div className="rounded-md border border-white/10 bg-[#131318] p-3.5 sm:p-4 space-y-2.5">
        <div className="flex items-center justify-between">
          <h3 className="font-display text-sm sm:text-base font-bold text-white flex items-center gap-1.5">
            <TagIcon className="h-3.5 w-3.5 text-purple-400" />
            <span>Genres & Tags</span>
          </h3>
          {spoilerCount > 0 && (
            <button
              onClick={() => setShowSpoilerTags(!showSpoilerTags)}
              className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-white transition-colors"
            >
              {showSpoilerTags ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
              <span>{showSpoilerTags ? "Hide Spoilers" : `Show Spoilers (${spoilerCount})`}</span>
            </button>
          )}
        </div>

        {/* Genres */}
        <div className="flex flex-wrap gap-1.5">
          {anime.genres.map((g) => (
            <Link
              key={g}
              href={`/genre/${g.toLowerCase().replace(/\s+/g, "-")}`}
              className="rounded border border-[var(--accent)]/30 bg-[var(--accent)]/10 px-2.5 py-1 text-xs font-semibold text-[var(--accent)] hover:bg-[var(--accent)]/20 transition-all"
            >
              {g}
            </Link>
          ))}
        </div>

        {/* Tags */}
        <div className="flex flex-wrap gap-1 pt-1">
          {displayTags.map((tag) => (
            <span
              key={tag.id}
              className={`rounded border px-2 py-0.5 text-[11px] font-medium ${
                tag.isMediaSpoiler
                  ? "border-rose-500/30 bg-rose-500/10 text-rose-300"
                  : "border-white/10 bg-white/5 text-zinc-300"
              }`}
              title={tag.description || undefined}
            >
              {tag.name} {tag.rank ? <span className="opacity-60 text-[9px]">{tag.rank}%</span> : null}
            </span>
          ))}
        </div>
      </div>

      {/* Complete Anime Metadata Details Grid */}
      <div className="rounded-md border border-white/10 bg-[#131318] p-3.5 sm:p-4 space-y-2.5">
        <h3 className="font-display text-sm sm:text-base font-bold text-white">Details & Information</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5 sm:gap-3 text-xs">
          <div>
            <span className="text-zinc-500 block text-[11px]">Format</span>
            <span className="font-semibold text-zinc-200 uppercase">{anime.format || "N/A"}</span>
          </div>
          <div>
            <span className="text-zinc-500 block text-[11px]">Status</span>
            <span className="font-semibold text-zinc-200 capitalize">
              {anime.status?.toLowerCase().replace(/_/g, " ") || "N/A"}
            </span>
          </div>
          <div>
            <span className="text-zinc-500 block text-[11px]">Episodes</span>
            <span className="font-semibold text-zinc-200">{anime.episodes || "Unknown"}</span>
          </div>
          <div>
            <span className="text-zinc-500 block text-[11px]">Episode Duration</span>
            <span className="font-semibold text-zinc-200">{anime.duration ? `${anime.duration} mins` : "N/A"}</span>
          </div>
          <div>
            <span className="text-zinc-500 block text-[11px]">Season</span>
            <span className="font-semibold text-zinc-200">
              {anime.season || "N/A"} {anime.seasonYear || anime.startDate?.year || ""}
            </span>
          </div>
          <div>
            <span className="text-zinc-500 block text-[11px]">Start Date</span>
            <span className="font-semibold text-zinc-200">
              {anime.startDate?.year
                ? `${anime.startDate.year}-${anime.startDate.month || 1}-${anime.startDate.day || 1}`
                : "N/A"}
            </span>
          </div>
          <div>
            <span className="text-zinc-500 block text-[11px]">End Date</span>
            <span className="font-semibold text-zinc-200">
              {anime.endDate?.year
                ? `${anime.endDate.year}-${anime.endDate.month || 1}-${anime.endDate.day || 1}`
                : "Airing / Unknown"}
            </span>
          </div>
          <div>
            <span className="text-zinc-500 block text-[11px]">Source</span>
            <span className="font-semibold text-zinc-200 uppercase">{anime.source || "Original"}</span>
          </div>
          <div>
            <span className="text-zinc-500 block text-[11px]">Country</span>
            <span className="font-semibold text-zinc-200">{anime.countryOfOrigin || "JP"}</span>
          </div>
          <div>
            <span className="text-zinc-500 block text-[11px]">Popularity Rank</span>
            <span className="font-semibold text-zinc-200">
              {anime.popularity ? `#${anime.popularity.toLocaleString()}` : "N/A"}
            </span>
          </div>
          <div>
            <span className="text-zinc-500 block text-[11px]">Favourites</span>
            <span className="font-semibold text-zinc-200">
              {anime.favourites ? anime.favourites.toLocaleString() : "N/A"}
            </span>
          </div>
          <div>
            <span className="text-zinc-500 block text-[11px]">Average Score</span>
            <span className="font-semibold text-amber-400">
              {anime.averageScore ? `${anime.averageScore}%` : "N/A"}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
