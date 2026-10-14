import React from "react";
import { Metadata } from "next";
import { api } from "@/lib/api";
import { AnimeListPage } from "@/components/anime/AnimeListPage";
import { Film } from "lucide-react";

export const metadata: Metadata = {
  title: "Top Anime Movies — Feature Films & Theatrical Hits",
  description: "Browse the highest rated and most popular theatrical anime feature films.",
};

export default async function MoviesPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const { page = "1" } = await searchParams;
  const currentPage = parseInt(page) || 1;
  const data = await api.getTopMovies(currentPage, 24).catch(() => ({
    results: [],
    page: 1,
    hasNextPage: false,
    total: 0,
  }));

  return (
    <AnimeListPage
      title="Top Anime Movies"
      description="Theatrical anime films, masterpieces, and box office records."
      badgeText="Feature Films"
      badgeIcon={<Film className="h-4 w-4 text-pink-400" />}
      animeList={data.results}
      page={data.page}
      hasNextPage={data.hasNextPage}
      total={data.total}
      baseUrl="/movies"
    />
  );
}
