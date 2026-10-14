import React from "react";
import { api } from "@/lib/api";
import { SpotlightHero } from "@/components/home/SpotlightHero";
import { GenreChipsRow } from "@/components/home/GenreChipsRow";
import { ContinueTrackingRow } from "@/components/home/ContinueTrackingRow";
import { HomeMainGrid } from "@/components/home/HomeMainGrid";
import { TopSidebar } from "@/components/home/TopSidebar";
import { ScheduleWidget } from "@/components/home/ScheduleWidget";
import { JustFinishedAndMovies } from "@/components/home/JustFinishedAndMovies";

// Revalidate home page every 10 minutes (ISR)
export const revalidate = 600;

export default async function HomePage() {
  // Parallel server fetches for maximum performance & SEO
  const [
    spotlight,
    trendingData,
    popularData,
    topRatedData,
    topAiringData,
    upcomingData,
    justFinishedData,
    topMoviesData,
    weekSchedule,
  ] = await Promise.all([
    api.getSpotlight().catch(() => []),
    api.getTrending(1, 24).catch(() => ({ results: [] })),
    api.getPopular(1, 24).catch(() => ({ results: [] })),
    api.getTopRated(1, 24).catch(() => ({ results: [] })),
    api.getTopAiring(1, 10).catch(() => ({ results: [] })),
    api.getUpcoming(1, 10).catch(() => ({ results: [] })),
    api.getJustFinished(1, 6).catch(() => ({ results: [] })),
    api.getTopMovies(1, 6).catch(() => ({ results: [] })),
    api.getWeekSchedule().catch(() => []),
  ]);

  return (
    <div className="flex flex-col min-h-screen">
      {/* 1. Hero Spotlight Carousel */}
      <SpotlightHero spotlightList={spotlight} />

      <div className="w-full px-4 sm:px-6 md:px-8 lg:px-10 xl:px-12 py-6 sm:py-8 md:py-10 space-y-7 sm:space-y-9 md:space-y-11">
        {/* 2. Genre Chip Row */}
        <GenreChipsRow />

        {/* 3. Continue Tracking (client-synced row) */}
        <ContinueTrackingRow />

        {/* 4 & 5. Main Grid + Right Sidebar */}
        <div className="flex flex-col lg:flex-row gap-6 sm:gap-7 lg:gap-8 items-start">
          {/* Main Content Area */}
          <div className="flex-1 min-w-0 space-y-7 sm:space-y-8 md:space-y-10">
            <HomeMainGrid
              trendingList={trendingData.results}
              popularList={popularData.results}
              topRatedList={topRatedData.results}
            />

            {/* 6. JUST FINISHED and TOP MOVIES Two-Column Lists */}
            <JustFinishedAndMovies
              justFinished={justFinishedData.results}
              topMovies={topMoviesData.results}
            />
          </div>

          {/* Right Sidebar (Wide, readable & well-proportioned) */}
          <div className="w-full lg:w-[360px] xl:w-[400px] 2xl:w-[440px] shrink-0 space-y-6 sm:space-y-7">
            <TopSidebar
              topAiring={topAiringData.results}
              upcoming={upcomingData.results}
            />

            {/* 7. Estimated Airing Schedule Widget */}
            <ScheduleWidget weekDays={weekSchedule} />
          </div>
        </div>
      </div>
    </div>
  );
}
