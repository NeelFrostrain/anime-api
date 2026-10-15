import React from "react";
import { Metadata } from "next";
import { api } from "@/lib/api";
import { AnimeListPage } from "@/components/anime/AnimeListPage";
import { Radio } from "lucide-react";

export const metadata: Metadata = {
  title: "Top Airing Anime — Currently Broadcasting",
  description: "Browse the highest rated and most popular anime currently airing this season.",
};

export default async function TopAiringPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const { page = "1" } = await searchParams;
  const currentPage = parseInt(page) || 1;
  const data = await api.getTopAiring(currentPage, 24).catch(() => ({
    results: [],
    page: 1,
    hasNextPage: false,
    total: 0,
  }));

  return (
    <AnimeListPage
      title="Top Airing Anime"
      description="The hottest and most popular anime episodes currently broadcasting this season."
      badgeText="Currently Airing"
      badgeIcon={<Radio className="h-4 w-4 text-emerald-400 animate-pulse" />}
      animeList={data.results}
      page={data.page}
      hasNextPage={data.hasNextPage}
      total={data.total}
      baseUrl="/top-airing"
    />
  );
}
