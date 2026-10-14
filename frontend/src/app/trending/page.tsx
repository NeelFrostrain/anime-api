import React from "react";
import { Metadata } from "next";
import { api } from "@/lib/api";
import { AnimeListPage } from "@/components/anime/AnimeListPage";
import { Flame } from "lucide-react";

export const metadata: Metadata = {
  title: "Trending Anime — Most Talked About Series",
  description: "Discover what anime series the community is buzzing about right now.",
};

export default async function TrendingPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const { page = "1" } = await searchParams;
  const currentPage = parseInt(page) || 1;
  const data = await api.getTrending(currentPage, 24).catch(() => ({
    results: [],
    page: 1,
    hasNextPage: false,
    total: 0,
  }));

  return (
    <AnimeListPage
      title="Trending Anime"
      description="The hottest and most popular shows airing right now."
      badgeText="Trending Now"
      badgeIcon={<Flame className="h-4 w-4 text-rose-400" />}
      animeList={data.results}
      page={data.page}
      hasNextPage={data.hasNextPage}
      total={data.total}
      baseUrl="/trending"
    />
  );
}
