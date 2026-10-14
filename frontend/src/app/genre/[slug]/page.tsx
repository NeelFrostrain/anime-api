import React from "react";
import { Metadata } from "next";
import Link from "next/link";
import { api } from "@/lib/api";
import { AnimeGrid } from "@/components/anime/AnimeGrid";
import { ChevronLeft, ChevronRight, Tag } from "lucide-react";

interface Props {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ page?: string; sort?: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const genreName = slug
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");

  return {
    title: `Best ${genreName} Anime — Discover Top ${genreName} Series`,
    description: `Explore the top trending, popular, and highest rated ${genreName} anime series and movies.`,
  };
}

export default async function GenrePage({ params, searchParams }: Props) {
  const { slug } = await params;
  const { page = "1", sort = "POPULARITY_DESC" } = await searchParams;
  const currentPage = parseInt(page) || 1;

  const genreName = slug
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");

  const data = await api
    .filterAnime({
      genre: genreName,
      sort,
      page: currentPage,
      perPage: 24,
    })
    .catch(() => ({ total: 0, results: [], hasNextPage: false, page: 1 }));

  return (
    <div className="w-full px-4 sm:px-6 md:px-8 lg:px-10 xl:px-12 py-8 space-y-8 min-h-screen">
      {/* Breadcrumb / Back */}
      <div className="flex items-center gap-2 text-xs font-semibold text-zinc-400">
        <Link href="/browse" className="hover:text-white flex items-center gap-1">
          <ChevronLeft className="h-3.5 w-3.5" />
          Browse Hub
        </Link>
        <span>/</span>
        <span className="text-[var(--accent)] font-bold">{genreName}</span>
      </div>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-6">
        <div>
          <div className="flex items-center gap-2 text-[var(--accent)] text-xs font-bold uppercase tracking-wider mb-2">
            <Tag className="h-4 w-4" />
            <span>Genre Explorer</span>
          </div>
          <h1 className="font-display text-3xl sm:text-4xl font-extrabold text-white">
            {genreName} Anime
          </h1>
          <p className="text-sm text-zinc-400 mt-1">
            {data.total ? `${data.total.toLocaleString()} anime in this genre` : "Curated titles"}
          </p>
        </div>

        {/* Sort Dropdown */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-zinc-400">Sort:</span>
          <Link
            href={`/genre/${slug}?sort=POPULARITY_DESC`}
            className={`rounded-md px-3 py-1.5 text-xs font-semibold ${
              sort === "POPULARITY_DESC"
                ? "bg-[var(--accent)] text-white"
                : "bg-white/5 text-zinc-300 hover:bg-white/10"
            }`}
          >
            Popular
          </Link>
          <Link
            href={`/genre/${slug}?sort=SCORE_DESC`}
            className={`rounded-md px-3 py-1.5 text-xs font-semibold ${
              sort === "SCORE_DESC"
                ? "bg-[var(--accent)] text-white"
                : "bg-white/5 text-zinc-300 hover:bg-white/10"
            }`}
          >
            Top Rated
          </Link>
          <Link
            href={`/genre/${slug}?sort=TRENDING_DESC`}
            className={`rounded-md px-3 py-1.5 text-xs font-semibold ${
              sort === "TRENDING_DESC"
                ? "bg-[var(--accent)] text-white"
                : "bg-white/5 text-zinc-300 hover:bg-white/10"
            }`}
          >
            Trending
          </Link>
        </div>
      </div>

      {/* Anime Grid */}
      <AnimeGrid animeList={data.results} />

      {/* Pagination */}
      <div className="flex items-center justify-center gap-3 pt-8 border-t border-white/10">
        {currentPage > 1 && (
          <Link
            href={`/genre/${slug}?sort=${sort}&page=${currentPage - 1}`}
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
            href={`/genre/${slug}?sort=${sort}&page=${currentPage + 1}`}
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
