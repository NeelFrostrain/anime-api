import React from "react";
import { Metadata } from "next";
import { api } from "@/lib/api";
import { AnimeListPage } from "@/components/anime/AnimeListPage";
import { CheckCircle2 } from "lucide-react";

export const metadata: Metadata = {
  title: "Just Finished Anime — Completed Series",
  description: "Binge-watch full anime series that have recently completed their broadcast.",
};

export default async function JustFinishedPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const { page = "1" } = await searchParams;
  const currentPage = parseInt(page) || 1;
  const data = await api.getJustFinished(currentPage, 24).catch(() => ({
    results: [],
    page: 1,
    hasNextPage: false,
    total: 0,
  }));

  return (
    <AnimeListPage
      title="Just Finished Anime"
      description="Recently completed anime series ready for your next full binge session."
      badgeText="Completed"
      badgeIcon={<CheckCircle2 className="h-4 w-4 text-purple-400" />}
      animeList={data.results}
      page={data.page}
      hasNextPage={data.hasNextPage}
      total={data.total}
      baseUrl="/just-finished"
    />
  );
}
