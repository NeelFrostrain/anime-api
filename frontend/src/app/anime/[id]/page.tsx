import React from "react";
import { Metadata } from "next";
import { notFound } from "next/navigation";
import { api } from "@/lib/api";
import { DetailHeader } from "@/components/detail/DetailHeader";
import { OverviewTab } from "@/components/detail/OverviewTab";
import { EpisodesTab } from "@/components/detail/EpisodesTab";
import { CharactersTab } from "@/components/detail/CharactersTab";
import { StaffTab } from "@/components/detail/StaffTab";
import { RelationsTimeline } from "@/components/detail/RelationsTimeline";
import { RecommendationsTab } from "@/components/detail/RecommendationsTab";
import { ReviewsTab } from "@/components/detail/ReviewsTab";
import { DetailTabsClient } from "./DetailTabsClient";

interface Props {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const animeId = parseInt(id.split("-")[0]);
  if (isNaN(animeId)) return { title: "Anime Not Found" };

  try {
    const anime = await api.getAnimeDetail(animeId);
    const title = anime.title.english || anime.title.romaji || "Anime";
    const poster = anime.coverImage.large || anime.bannerImage;

    return {
      title: `${title} — Watch, Episodes, Characters & Reviews`,
      description: anime.description?.slice(0, 160) || `Explore ${title} on KUROMI.`,
      openGraph: {
        title,
        description: anime.description?.slice(0, 160),
        images: poster ? [{ url: poster }] : [],
      },
    };
  } catch {
    return { title: "Anime Details" };
  }
}

export default async function AnimeDetailPage({ params, searchParams }: Props) {
  const { id } = await params;
  const { tab = "overview" } = await searchParams;

  const animeId = parseInt(id.split("-")[0]);
  if (isNaN(animeId)) notFound();

  const [
    anime,
    episodes,
    relations,
    charactersData,
    staffData,
    recommendationsData,
    reviews,
  ] = await Promise.all([
    api.getAnimeDetail(animeId).catch(() => null),
    api.getAnimeEpisodes(animeId).catch(() => []),
    api.getAnimeRelations(animeId).catch(() => []),
    api.getAnimeCharacters(animeId, 1, 24).catch(() => ({ results: [] })),
    api.getAnimeStaff(animeId, 1, 24).catch(() => ({ results: [] })),
    api.getAnimeRecommendations(animeId, 1, 12).catch(() => ({ results: [] })),
    api.getAnimeReviews(animeId).catch(() => []),
  ]);

  if (!anime) notFound();

  const title = anime.title.english || anime.title.romaji || "Anime";

  return (
    <div className="min-h-screen pb-16">
      {/* Header Banner and Actions */}
      <DetailHeader anime={anime} />

      {/* Tabs Layout */}
      <div className="w-full px-4 sm:px-6 md:px-8 lg:px-10 xl:px-12 mt-6">
        <DetailTabsClient
          animeId={anime.id}
          activeTab={tab}
          counts={{
            episodes: episodes.length,
            characters: charactersData.results.length,
            staff: staffData.results.length,
            relations: relations.length,
            recommendations: recommendationsData.results.length,
            reviews: reviews.length,
          }}
          overviewContent={<OverviewTab anime={anime} />}
          episodesContent={
            <EpisodesTab animeId={anime.id} animeTitle={title} episodes={episodes} />
          }
          charactersContent={
            <CharactersTab characters={charactersData.results} />
          }
          staffContent={<StaffTab staff={staffData.results} />}
          relationsContent={
            <RelationsTimeline
              currentAnimeId={anime.id}
              currentAnimeTitle={title}
              relations={relations}
            />
          }
          recommendationsContent={
            <RecommendationsTab recommendations={recommendationsData.results} />
          }
          reviewsContent={<ReviewsTab reviews={reviews} />}
        />
      </div>
    </div>
  );
}
