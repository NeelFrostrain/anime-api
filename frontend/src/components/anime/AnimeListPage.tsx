import React from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { AnimeCardData } from "@/types/anime";
import { AnimeGrid } from "./AnimeGrid";

interface AnimeListPageProps {
  title: string;
  description: string;
  badgeText: string;
  badgeIcon?: React.ReactNode;
  animeList: AnimeCardData[];
  page: number;
  hasNextPage: boolean;
  total?: number;
  baseUrl: string;
}

export function AnimeListPage({
  title,
  description,
  badgeText,
  badgeIcon,
  animeList,
  page,
  hasNextPage,
  total,
  baseUrl,
}: AnimeListPageProps) {
  return (
    <div className="w-full px-4 sm:px-6 md:px-8 lg:px-10 xl:px-12 py-8 space-y-8 min-h-screen">
      {/* Header */}
      <div className="border-b border-white/10 pb-6 space-y-2">
        <div className="inline-flex items-center gap-1.5 rounded-md border border-white/10 bg-white/5 px-3 py-1 text-xs font-bold uppercase tracking-wider text-[var(--accent)]">
          {badgeIcon}
          <span>{badgeText}</span>
        </div>
        <h1 className="font-display text-3xl sm:text-4xl font-extrabold text-white">
          {title}
        </h1>
        <p className="text-sm text-zinc-400">
          {total ? `${total.toLocaleString()} anime found` : description}
        </p>
      </div>

      {/* Grid */}
      <AnimeGrid animeList={animeList} />

      {/* Pagination */}
      <div className="flex items-center justify-center gap-3 pt-8 border-t border-white/10">
        {page > 1 && (
          <Link
            href={`${baseUrl}?page=${page - 1}`}
            className="flex items-center gap-1.5 rounded-md border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold text-zinc-200 hover:bg-white/10"
          >
            <ChevronLeft className="h-4 w-4" />
            Previous
          </Link>
        )}

        <span className="rounded-md bg-white/10 px-4 py-2 text-xs font-bold text-white">
          {page}
        </span>

        {hasNextPage && (
          <Link
            href={`${baseUrl}?page=${page + 1}`}
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
