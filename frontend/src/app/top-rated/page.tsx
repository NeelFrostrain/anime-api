import React from "react";
import { Metadata } from "next";
import { api } from "@/lib/api";
import { AnimeListPage } from "@/components/anime/AnimeListPage";
import { Award } from "lucide-react";

export const metadata: Metadata = {
  title: "Top Rated Anime — Highest Rated Masterpieces",
  description: "Browse the highest scored anime of all time based on community ratings.",
};

export default async function TopRatedPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const { page = "1" } = await searchParams;
  const currentPage = parseInt(page) || 1;
  const data = await api.getTopRated(currentPage, 24).catch(() => ({
    results: [],
    page: 1,
    hasNextPage: false,
    total: 0,
  }));

  return (
    <AnimeListPage
      title="Top Rated Anime"
      description="The critical and fan masterpieces with highest average scores."
      badgeText="Highest Scored"
      badgeIcon={<Award className="h-4 w-4 text-purple-400" />}
      animeList={data.results}
      page={data.page}
      hasNextPage={data.hasNextPage}
      total={data.total}
      baseUrl="/top-rated"
    />
  );
}
