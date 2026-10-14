"use client";

import React, { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import {
  Search,
  Filter,
  X,
  SlidersHorizontal,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
} from "lucide-react";
import { api } from "@/lib/api";
import { AnimeGrid } from "@/components/anime/AnimeGrid";
import { GENRES, FORMATS, STATUS_OPTIONS, SEASONS } from "@/lib/constants";

export function SearchClient() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Read URL query params
  const initialQ = searchParams.get("q") || "";
  const initialGenre = searchParams.get("genre") || "";
  const initialYear = searchParams.get("year") || "";
  const initialSeason = searchParams.get("season") || "";
  const initialFormat = searchParams.get("format") || "";
  const initialStatus = searchParams.get("status") || "";
  const initialSort = searchParams.get("sort") || "POPULARITY_DESC";
  const initialPage = parseInt(searchParams.get("page") || "1");

  // Local filter states
  const [q, setQ] = useState(initialQ);
  const [selectedGenres, setSelectedGenres] = useState<string[]>(
    initialGenre ? initialGenre.split(",").filter(Boolean) : []
  );
  const [year, setYear] = useState(initialYear);
  const [season, setSeason] = useState(initialSeason);
  const [format, setFormat] = useState(initialFormat);
  const [status, setStatus] = useState(initialStatus);
  const [sort, setSort] = useState(initialSort);
  const [page, setPage] = useState(initialPage);
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);

  // Sync state to URL
  const updateUrl = (overrides: Record<string, any> = {}) => {
    const params = new URLSearchParams();
    const current = {
      q,
      genre: selectedGenres.join(","),
      year,
      season,
      format,
      status,
      sort,
      page,
      ...overrides,
    };

    Object.entries(current).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== "" && v !== "1") {
        params.set(k, String(v));
      }
    });

    router.push(`/search?${params.toString()}`);
  };

  // Fetch search or filter results with TanStack Query
  const { data, isLoading } = useQuery({
    queryKey: ["animeSearch", q, selectedGenres, year, season, format, status, sort, page],
    queryFn: async () => {
      if (q && selectedGenres.length === 0 && !year && !season && !format && !status) {
        return api.search(q, page, 24);
      }
      return api.filterAnime({
        search: q || undefined,
        genre: selectedGenres.length > 0 ? selectedGenres.join(",") : undefined,
        year: year ? parseInt(year) : undefined,
        season: season || undefined,
        format: format || undefined,
        status: status || undefined,
        sort,
        page,
        perPage: 24,
      });
    },
  });

  const toggleGenre = (genre: string) => {
    const next = selectedGenres.includes(genre)
      ? selectedGenres.filter((g) => g !== genre)
      : [...selectedGenres, genre];
    setSelectedGenres(next);
    setPage(1);
    updateUrl({ genre: next.join(","), page: 1 });
  };

  const handleResetFilters = () => {
    setQ("");
    setSelectedGenres([]);
    setYear("");
    setSeason("");
    setFormat("");
    setStatus("");
    setSort("POPULARITY_DESC");
    setPage(1);
    router.push("/search");
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    updateUrl({ q, page: 1 });
  };

  const activeFilterCount =
    (q ? 1 : 0) +
    selectedGenres.length +
    (year ? 1 : 0) +
    (season ? 1 : 0) +
    (format ? 1 : 0) +
    (status ? 1 : 0);

  const currentYear = new Date().getFullYear();
  const yearOptions = Array.from({ length: 45 }, (_, i) => currentYear + 1 - i);

  return (
    <div className="space-y-6">
      {/* Top Search Bar */}
      <form onSubmit={handleSearchSubmit} className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-zinc-400" />
          <input
            type="text"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search anime title, studio, or keywords..."
            className="w-full rounded-md border border-white/10 bg-[#131318] pl-10 pr-4 py-2 text-xs sm:text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-[var(--accent)]"
          />
          {q && (
            <button
              type="button"
              onClick={() => {
                setQ("");
                updateUrl({ q: "" });
              }}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
        <button
          type="submit"
          className="rounded-md bg-[var(--accent)] hover:brightness-110 text-white font-bold px-4 py-2 text-xs transition-all"
        >
          Search
        </button>
        <button
          type="button"
          onClick={() => setMobileFilterOpen(!mobileFilterOpen)}
          className="lg:hidden rounded-md border border-white/10 bg-[#131318] p-2 text-zinc-300"
        >
          <Filter className="h-4 w-4" />
        </button>
      </form>

      {/* Active Filter Chips */}
      {activeFilterCount > 0 && (
        <div className="flex flex-wrap items-center gap-2 pt-1">
          <span className="text-xs text-zinc-400 font-semibold mr-1">Active Filters:</span>
          {q && (
            <span className="flex items-center gap-1 rounded-md border border-[var(--accent)]/30 bg-[var(--accent)]/15 px-2.5 py-1 text-xs text-[var(--accent)]">
              Query: &ldquo;{q}&rdquo;
              <button onClick={() => { setQ(""); updateUrl({ q: "" }); }}><X className="h-3 w-3" /></button>
            </span>
          )}
          {selectedGenres.map((genre) => (
            <span
              key={genre}
              className="flex items-center gap-1 rounded-md border border-purple-500/30 bg-purple-500/15 px-2.5 py-1 text-xs text-purple-300"
            >
              {genre}
              <button onClick={() => toggleGenre(genre)}><X className="h-3 w-3" /></button>
            </span>
          ))}
          {format && (
            <span className="flex items-center gap-1 rounded-md border border-blue-500/30 bg-blue-500/15 px-2.5 py-1 text-xs text-blue-300">
              Format: {format}
              <button onClick={() => { setFormat(""); updateUrl({ format: "" }); }}><X className="h-3 w-3" /></button>
            </span>
          )}
          {status && (
            <span className="flex items-center gap-1 rounded-md border border-emerald-500/30 bg-emerald-500/15 px-2.5 py-1 text-xs text-emerald-300">
              Status: {status}
              <button onClick={() => { setStatus(""); updateUrl({ status: "" }); }}><X className="h-3 w-3" /></button>
            </span>
          )}
          {year && (
            <span className="flex items-center gap-1 rounded-md border border-amber-500/30 bg-amber-500/15 px-2.5 py-1 text-xs text-amber-300">
              Year: {year}
              <button onClick={() => { setYear(""); updateUrl({ year: "" }); }}><X className="h-3 w-3" /></button>
            </span>
          )}
          <button
            onClick={handleResetFilters}
            className="flex items-center gap-1 text-xs text-rose-400 hover:underline ml-2"
          >
            <RotateCcw className="h-3 w-3" />
            <span>Reset All</span>
          </button>
        </div>
      )}

      {/* Main Filter + Results Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 sm:gap-6">
        {/* Left Filter Panel (Desktop & Mobile Drawer) */}
        <div className={`space-y-4 ${mobileFilterOpen ? "block" : "hidden lg:block"}`}>
          <div className="rounded-md border border-white/10 bg-[#131318] p-3.5 space-y-4">
            <div className="flex items-center justify-between pb-2.5 border-b border-white/10">
              <h3 className="font-display font-bold text-sm text-white flex items-center gap-1.5">
                <SlidersHorizontal className="h-3.5 w-3.5 text-[var(--accent)]" />
                <span>Filters</span>
              </h3>
              {activeFilterCount > 0 && (
                <button
                  onClick={handleResetFilters}
                  className="text-xs text-zinc-400 hover:text-rose-400 transition-colors"
                >
                  Clear all
                </button>
              )}
            </div>

            {/* Sort Dropdown */}
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-zinc-400 block mb-2">
                Sort By
              </label>
              <select
                value={sort}
                onChange={(e) => {
                  setSort(e.target.value);
                  updateUrl({ sort: e.target.value, page: 1 });
                }}
                className="w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-xs text-white focus:outline-none focus:border-[var(--accent)]"
              >
                <option value="POPULARITY_DESC" className="bg-zinc-900">Most Popular</option>
                <option value="SCORE_DESC" className="bg-zinc-900">Highest Rated</option>
                <option value="TRENDING_DESC" className="bg-zinc-900">Trending</option>
                <option value="START_DATE_DESC" className="bg-zinc-900">Release Date</option>
                <option value="FAVOURITES_DESC" className="bg-zinc-900">Most Favourited</option>
                <option value="EPISODES_DESC" className="bg-zinc-900">Most Episodes</option>
              </select>
            </div>

            {/* Format Dropdown */}
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-zinc-400 block mb-2">
                Format
              </label>
              <select
                value={format}
                onChange={(e) => {
                  setFormat(e.target.value);
                  updateUrl({ format: e.target.value, page: 1 });
                }}
                className="w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-xs text-white focus:outline-none focus:border-[var(--accent)]"
              >
                <option value="" className="bg-zinc-900">All Formats</option>
                {FORMATS.map((f) => (
                  <option key={f.value} value={f.value} className="bg-zinc-900">
                    {f.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Status Dropdown */}
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-zinc-400 block mb-2">
                Status
              </label>
              <select
                value={status}
                onChange={(e) => {
                  setStatus(e.target.value);
                  updateUrl({ status: e.target.value, page: 1 });
                }}
                className="w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-xs text-white focus:outline-none focus:border-[var(--accent)]"
              >
                <option value="" className="bg-zinc-900">All Statuses</option>
                {STATUS_OPTIONS.map((st) => (
                  <option key={st.value} value={st.value} className="bg-zinc-900">
                    {st.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Year Dropdown */}
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-zinc-400 block mb-2">
                Year
              </label>
              <select
                value={year}
                onChange={(e) => {
                  setYear(e.target.value);
                  updateUrl({ year: e.target.value, page: 1 });
                }}
                className="w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-xs text-white focus:outline-none focus:border-[var(--accent)]"
              >
                <option value="" className="bg-zinc-900">All Years</option>
                {yearOptions.map((y) => (
                  <option key={y} value={y} className="bg-zinc-900">
                    {y}
                  </option>
                ))}
              </select>
            </div>

            {/* Season Dropdown */}
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-zinc-400 block mb-2">
                Season
              </label>
              <select
                value={season}
                onChange={(e) => {
                  setSeason(e.target.value);
                  updateUrl({ season: e.target.value, page: 1 });
                }}
                className="w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-xs text-white focus:outline-none focus:border-[var(--accent)]"
              >
                <option value="" className="bg-zinc-900">All Seasons</option>
                {SEASONS.map((s) => (
                  <option key={s} value={s} className="bg-zinc-900">
                    {s}
                  </option>
                ))}
              </select>
            </div>

            {/* Genres Multiselect */}
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-zinc-400 block mb-2">
                Genres
              </label>
              <div className="flex flex-wrap gap-1.5 max-h-56 overflow-y-auto scrollbar-thin pr-1">
                {GENRES.map((genre) => {
                  const isSelected = selectedGenres.includes(genre);
                  return (
                    <button
                      key={genre}
                      type="button"
                      onClick={() => toggleGenre(genre)}
                      className={`rounded px-2 py-0.5 text-xs font-medium transition-all ${
                        isSelected
                          ? "bg-[var(--accent)] text-white"
                          : "border border-white/10 bg-white/5 text-zinc-300 hover:bg-white/10"
                      }`}
                    >
                      {genre}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Right Results Grid (3 cols) */}
        <div className="lg:col-span-3 space-y-6">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-zinc-400">
              {data?.total !== undefined ? `${data.total.toLocaleString()} anime found` : "Loading catalog..."}
            </p>
            {data?.page && (
              <p className="text-xs text-zinc-500">Page {data.page}</p>
            )}
          </div>

          <AnimeGrid
            animeList={data?.results || []}
            isLoading={isLoading}
            emptyMessage="No anime match your active filter criteria."
          />

          {/* Pagination Controls */}
          {data && (data.hasNextPage || page > 1) && (
            <div className="flex items-center justify-center gap-3 pt-8 border-t border-white/10">
              <button
                disabled={page <= 1}
                onClick={() => {
                  const nextP = page - 1;
                  setPage(nextP);
                  updateUrl({ page: nextP });
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }}
                className="flex items-center gap-1.5 rounded-md border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold text-zinc-200 hover:bg-white/10 disabled:opacity-40 disabled:pointer-events-none transition-colors"
              >
                <ChevronLeft className="h-4 w-4" />
                Previous
              </button>

              <span className="rounded-md bg-white/10 px-4 py-2 text-xs font-bold text-white">
                {page}
              </span>

              <button
                disabled={!data.hasNextPage}
                onClick={() => {
                  const nextP = page + 1;
                  setPage(nextP);
                  updateUrl({ page: nextP });
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }}
                className="flex items-center gap-1.5 rounded-md border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold text-zinc-200 hover:bg-white/10 disabled:opacity-40 disabled:pointer-events-none transition-colors"
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
