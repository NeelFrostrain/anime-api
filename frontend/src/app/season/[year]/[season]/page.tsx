import React from "react";
import { Metadata } from "next";
import Link from "next/link";
import { api } from "@/lib/api";
import { AnimeGrid } from "@/components/anime/AnimeGrid";
import { Calendar, ChevronLeft, ChevronRight } from "lucide-react";
import { SEASONS } from "@/lib/constants";

interface Props {
  params: Promise<{ year: string; season: string }>;
  searchParams: Promise<{ page?: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { year, season } = await params;
  const capitalizedSeason = season.charAt(0).toUpperCase() + season.slice(1);
  return {
    title: `${capitalizedSeason} ${year} Anime Lineup — Full Seasonal Chart`,
    description: `Discover all anime broadcasting and premiering during the ${capitalizedSeason} ${year} anime season.`,
  };
}

export default async function SeasonalAnimePage({ params, searchParams }: Props) {
  const { year, season } = await params;
  const { page = "1" } = await searchParams;
  const currentPage = parseInt(page) || 1;
  const currentYearInt = parseInt(year);

  const normalizedSeason = season.toUpperCase();

  const data = await api
    .getSeasonal(currentYearInt, normalizedSeason, currentPage, 24)
    .catch(() => ({ total: 0, results: [], hasNextPage: false, page: 1 }));

  return (
    <div className="w-full px-4 sm:px-6 md:px-8 lg:px-10 xl:px-12 py-8 space-y-8 min-h-screen">
      {/* Header & Year Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-6">
        <div>
          <div className="flex items-center gap-2 text-cyan-400 text-xs font-bold uppercase tracking-wider mb-2">
            <Calendar className="h-4 w-4" />
            <span>Seasonal Archive</span>
          </div>
          <h1 className="font-display text-3xl sm:text-4xl font-extrabold text-white">
            {season.charAt(0).toUpperCase() + season.slice(1)} {year} Anime
          </h1>
          <p className="text-sm text-zinc-400 mt-1">
            {data.total ? `${data.total.toLocaleString()} seasonal releases` : "Complete seasonal chart"}
          </p>
        </div>

        {/* Year Jump */}
        <div className="flex items-center gap-2">
          <Link
            href={`/season/${currentYearInt - 1}/${season.toLowerCase()}`}
            className="flex items-center gap-1 rounded-md border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-zinc-300 hover:bg-white/10 hover:text-white"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
            <span>{currentYearInt - 1}</span>
          </Link>
          <span className="font-bold text-sm text-white px-2">{currentYearInt}</span>
          <Link
            href={`/season/${currentYearInt + 1}/${season.toLowerCase()}`}
            className="flex items-center gap-1 rounded-md border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-zinc-300 hover:bg-white/10 hover:text-white"
          >
            <span>{currentYearInt + 1}</span>
            <ChevronRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>

      {/* Season Navigation Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto scrollbar-none pb-2">
        {SEASONS.map((s) => {
          const isActive = s === normalizedSeason;
          return (
            <Link
              key={s}
              href={`/season/${year}/${s.toLowerCase()}`}
              className={`rounded-md px-4 py-2 text-xs font-bold transition-all ${
                isActive
                  ? "bg-[var(--accent)] text-white shadow-glow"
                  : "border border-white/10 bg-white/5 text-zinc-300 hover:bg-white/10"
              }`}
            >
              {s} {year}
            </Link>
          );
        })}
      </div>

      {/* Anime Grid */}
      <AnimeGrid animeList={data.results} />

      {/* Pagination */}
      <div className="flex items-center justify-center gap-3 pt-8 border-t border-white/10">
        {currentPage > 1 && (
          <Link
            href={`/season/${year}/${season}?page=${currentPage - 1}`}
            className="flex items-center gap-1.5 rounded-md border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold text-zinc-200 hover:bg-white/10"
          >
            <ChevronLeft className="h-4 w-4" />
            Previous
          </Link>
        )}

        <span className="rounded-md bg-white/10 px-4 py-2 text-xs font-bold text-white">
          {currentPage}
        </span>

        {data.hasNextPage && (
          <Link
            href={`/season/${year}/${season}?page=${currentPage + 1}`}
            className="flex items-center gap-1.5 rounded-md border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold text-zinc-200 hover:bg-white/10"
          >
            Next
            <ChevronRight className="h-4 w-4" />
          </Link>
        )}
      </div>
    </div>
  );
}
