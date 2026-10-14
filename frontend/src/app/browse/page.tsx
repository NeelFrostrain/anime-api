import React from "react";
import Link from "next/link";
import { Metadata } from "next";
import {
  Compass,
  Tv,
  Film,
  Sparkles,
  Layers,
  Calendar,
  Flame,
  Star,
  Award,
} from "lucide-react";
import { GENRES, FORMATS, SEASONS } from "@/lib/constants";

export const metadata: Metadata = {
  title: "Browse Catalog — Genres, Formats & Seasons",
  description: "Browse the full universe of anime by genres, formats, release years, and seasons.",
};

export default function BrowsePage() {
  const currentYear = new Date().getFullYear();

  const formatIcons: Record<string, any> = {
    TV: Tv,
    MOVIE: Film,
    TV_SHORT: Layers,
    SPECIAL: Sparkles,
    OVA: Film,
    ONA: Tv,
    MUSIC: Sparkles,
  };

  return (
    <div className="w-full px-4 sm:px-6 md:px-8 lg:px-10 xl:px-12 py-8 space-y-12">
      {/* Hero Header */}
      <div className="space-y-3">
        <div className="inline-flex items-center gap-2 rounded-md bg-[var(--accent)]/15 border border-[var(--accent)]/30 px-3.5 py-1.5 text-xs font-bold uppercase tracking-wider text-[var(--accent)]">
          <Compass className="h-4 w-4" />
          <span>Anime Catalog</span>
        </div>
        <h1 className="font-display text-3xl sm:text-4xl lg:text-5xl font-extrabold text-white tracking-tight">
          Browse Anime Universe
        </h1>
        <p className="text-sm sm:text-base text-zinc-400 max-w-2xl">
          Discover anime across all genres, formats, and seasonal releases.
        </p>
      </div>

      {/* Quick Curated Lists Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Link
          href="/trending"
          className="group rounded-md border border-rose-500/20 bg-rose-500/5 p-5 hover:border-rose-500/40 hover:bg-rose-500/10 transition-all shadow-lg"
        >
          <Flame className="h-6 w-6 text-rose-400 mb-3" />
          <h3 className="font-display font-bold text-base text-white group-hover:text-rose-300">Trending Now</h3>
          <p className="text-xs text-zinc-400 mt-1">What the community is watching</p>
        </Link>
        <Link
          href="/popular"
          className="group rounded-md border border-amber-500/20 bg-amber-500/5 p-5 hover:border-amber-500/40 hover:bg-amber-500/10 transition-all shadow-lg"
        >
          <Sparkles className="h-6 w-6 text-amber-400 mb-3" />
          <h3 className="font-display font-bold text-base text-white group-hover:text-amber-300">All-Time Popular</h3>
          <p className="text-xs text-zinc-400 mt-1">Most watched anime in history</p>
        </Link>
        <Link
          href="/top-rated"
          className="group rounded-md border border-purple-500/20 bg-purple-500/5 p-5 hover:border-purple-500/40 hover:bg-purple-500/10 transition-all shadow-lg"
        >
          <Award className="h-6 w-6 text-purple-400 mb-3" />
          <h3 className="font-display font-bold text-base text-white group-hover:text-purple-300">Top Rated</h3>
          <p className="text-xs text-zinc-400 mt-1">Highest scored masterpieces</p>
        </Link>
        <Link
          href="/schedule"
          className="group rounded-md border border-emerald-500/20 bg-emerald-500/5 p-5 hover:border-emerald-500/40 hover:bg-emerald-500/10 transition-all shadow-lg"
        >
          <Calendar className="h-6 w-6 text-emerald-400 mb-3" />
          <h3 className="font-display font-bold text-base text-white group-hover:text-emerald-300">Airing Schedule</h3>
          <p className="text-xs text-zinc-400 mt-1">Live weekly release calendar</p>
        </Link>
      </div>

      {/* Formats Section */}
      <div className="space-y-4">
        <h2 className="font-display text-xl font-bold text-white flex items-center gap-2">
          <Layers className="h-5 w-5 text-blue-400" />
          <span>Browse by Format</span>
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-3">
          {FORMATS.map((fmt) => {
            const Icon = formatIcons[fmt.value] || Tv;
            return (
              <Link
                key={fmt.value}
                href={`/search?format=${fmt.value}`}
                className="group flex flex-col items-center justify-center rounded-md border border-white/10 bg-[#131318] p-4 text-center hover:border-[var(--accent)] hover:bg-[var(--accent)]/10 hover:shadow-glow transition-all"
              >
                <Icon className="h-6 w-6 text-zinc-400 group-hover:text-[var(--accent)] transition-colors mb-2" />
                <span className="text-xs font-bold text-zinc-200 group-hover:text-white">
                  {fmt.label}
                </span>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Genres Explorer */}
      <div className="space-y-4">
        <h2 className="font-display text-xl font-bold text-white flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-purple-400" />
          <span>Browse by Genre</span>
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
          {GENRES.map((genre) => {
            const slug = genre.toLowerCase().replace(/\s+/g, "-");
            return (
              <Link
                key={genre}
                href={`/genre/${slug}`}
                className="group rounded-md border border-white/10 bg-[#131318] p-4 hover:border-white/20 hover:bg-white/10 transition-all shadow-md"
              >
                <h4 className="text-sm font-bold text-zinc-200 group-hover:text-[var(--accent)] transition-colors">
                  {genre}
                </h4>
                <p className="text-[11px] text-zinc-500 mt-1">Explore titles &rarr;</p>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Seasonal Navigation */}
      <div className="space-y-4">
        <h2 className="font-display text-xl font-bold text-white flex items-center gap-2">
          <Calendar className="h-5 w-5 text-cyan-400" />
          <span>Seasonal Anime</span>
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {SEASONS.map((season) => (
            <Link
              key={season}
              href={`/season/${currentYear}/${season.toLowerCase()}`}
              className="group rounded-md border border-white/10 bg-[#131318] p-5 hover:border-[var(--accent)] hover:shadow-glow transition-all"
            >
              <span className="text-xs font-semibold uppercase tracking-wider text-[var(--accent)]">
                {currentYear}
              </span>
              <h3 className="font-display font-extrabold text-lg text-white mt-1 group-hover:text-[var(--accent)]">
                {season} {currentYear}
              </h3>
              <p className="text-xs text-zinc-400 mt-1">View seasonal lineup &rarr;</p>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
