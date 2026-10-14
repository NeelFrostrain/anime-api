import React from "react";
import { Metadata } from "next";
import { api } from "@/lib/api";
import { AnimeListPage } from "@/components/anime/AnimeListPage";
import { CalendarClock } from "lucide-react";

export const metadata: Metadata = {
  title: "Upcoming Anime — Most Anticipated Releases",
  description: "Browse anime scheduled to release in future seasons and upcoming years.",
};

export default async function UpcomingPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const { page = "1" } = await searchParams;
  const currentPage = parseInt(page) || 1;
  const data = await api.getUpcoming(currentPage, 24).catch(() => ({
    results: [],
    page: 1,
    hasNextPage: false,
    total: 0,
  }));

  return (
    <AnimeListPage
      title="Upcoming Anime Releases"
      description="Upcoming anime series and movies you can anticipate."
      badgeText="Coming Soon"
      badgeIcon={<CalendarClock className="h-4 w-4 text-emerald-400" />}
      animeList={data.results}
      page={data.page}
      hasNextPage={data.hasNextPage}
      total={data.total}
      baseUrl="/upcoming"
    />
  );
}
