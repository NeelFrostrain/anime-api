import React from "react";
import { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { api } from "@/lib/api";
import { AnimeGrid } from "@/components/anime/AnimeGrid";
import { Building2, Heart, ChevronLeft, ChevronRight } from "lucide-react";

interface Props {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ page?: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  try {
    const studio = await api.getStudio(id);
    const name = studio.name || "Animation Studio";
    return {
      title: `${name} — Anime Studio Profile & Catalog`,
      description: `Explore all anime series and films produced by ${name}.`,
    };
  } catch {
    return { title: "Animation Studio" };
  }
}

export default async function StudioPage({ params, searchParams }: Props) {
  const { id } = await params;
  const { page = "1" } = await searchParams;
  const currentPage = parseInt(page) || 1;

  const studio = await api.getStudio(id, currentPage, 24).catch(() => null);
  if (!studio) notFound();

  return (
    <div className="w-full px-4 sm:px-6 md:px-8 lg:px-10 xl:px-12 py-8 space-y-8 min-h-screen">
      <Link
        href="/browse"
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--accent)] hover:underline"
      >
        <ChevronLeft className="h-4 w-4" />
        Back to Catalog
      </Link>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-6">
        <div>
          <div className="flex items-center gap-2 text-cyan-400 text-xs font-bold uppercase tracking-wider mb-2">
            <Building2 className="h-4 w-4" />
            <span>Studio Profile</span>
          </div>
          <h1 className="font-display text-3xl sm:text-4xl font-extrabold text-white">
            {studio.name}
          </h1>
          <p className="text-sm text-zinc-400 mt-1">
            {studio.pagination?.total
              ? `${studio.pagination.total} anime in catalogue`
              : "Animation works"}
          </p>
        </div>

        {studio.favourites && (
          <div className="flex items-center gap-1.5 rounded-md border border-rose-500/30 bg-rose-500/10 px-4 py-2 text-xs font-bold text-rose-300">
            <Heart className="h-4 w-4 fill-rose-400" />
            <span>{studio.favourites.toLocaleString()} Followers</span>
          </div>
        )}
      </div>

      {/* Studio Anime Grid */}
      <AnimeGrid animeList={studio.media || []} />

      {/* Pagination */}
      {studio.pagination && (
        <div className="flex items-center justify-center gap-3 pt-8 border-t border-white/10">
          {currentPage > 1 && (
            <Link
              href={`/studio/${id}?page=${currentPage - 1}`}
              className="flex items-center gap-1.5 rounded-md border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold text-zinc-200 hover:bg-white/10"
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </Link>
          )}

          <span className="rounded-md bg-white/10 px-4 py-2 text-xs font-bold text-white">
            {currentPage}
          </span>

          {studio.pagination.hasNextPage && (
            <Link
              href={`/studio/${id}?page=${currentPage + 1}`}
              className="flex items-center gap-1.5 rounded-md border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold text-zinc-200 hover:bg-white/10"
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
