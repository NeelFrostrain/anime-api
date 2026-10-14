import React from "react";
import { Metadata } from "next";
import { api } from "@/lib/api";
import { AnimeListPage } from "@/components/anime/AnimeListPage";
import { Sparkles } from "lucide-react";

export const metadata: Metadata = {
  title: "Most Popular Anime — All-Time Community Favorites",
  description: "Browse the most popular anime series and films of all time according to AniList.",
};

export default async function PopularPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const { page = "1" } = await searchParams;
  const currentPage = parseInt(page) || 1;
  const data = await api.getPopular(currentPage, 24).catch(() => ({
    results: [],
    page: 1,
    hasNextPage: false,
    total: 0,
  }));

  return (
    <AnimeListPage
      title="All-Time Popular Anime"
      description="The most watched and loved anime in history."
      badgeText="All-Time Favorites"
      badgeIcon={<Sparkles className="h-4 w-4 text-amber-400" />}
      animeList={data.results}
      page={data.page}
      hasNextPage={data.hasNextPage}
      total={data.total}
      baseUrl="/popular"
    />
  );
}
