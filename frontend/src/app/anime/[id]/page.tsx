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

  // 1. Fetch anime detail (single cached query)
  const anime = await api.getAnimeDetail(animeId).catch(() => null);
  if (!anime) notFound();

  // 2. Fetch episodes with AniZip screenshots and reviews with fast timeout
  const [episodes, reviews] = await Promise.all([
    api.getAnimeEpisodes(animeId, anime).catch(() => []),
    api.getAnimeReviews(animeId, anime.idMal).catch(() => []),
  ]);

  // Derive characters, staff, relations, and recommendations in memory from anime detail (0ms delay)
  const rawCharacters = (anime.characters as any)?.edges || [];
  const charactersData = {
    page: 1,
    perPage: 24,
    total: rawCharacters.length,
    hasNextPage: false,
    results: rawCharacters.map((e: any) => ({
      id: e.node?.id,
      role: e.role,
      name: {
        full: e.node?.name?.userPreferred || "",
        native: e.node?.name?.native || "",
      },
      image: e.node?.image?.large || e.node?.image?.medium || "",
      voiceActors: (e.voiceActors || []).map((va: any) => ({
        id: va.id,
        name: va.name?.userPreferred || "",
        native: va.name?.native || null,
        language: va.languageV2 || "Japanese",
        image: va.image?.large || va.image?.medium || "",
      })),
    })),
  };

  const rawStudios = Array.isArray(anime.studios)
    ? anime.studios
    : (anime.studios as any)?.nodes || [];
  const staffData = {
    page: 1,
    perPage: 24,
    total: rawStudios.length,
    hasNextPage: false,
    results: rawStudios.map((s: any) => ({
      id: s.id,
      role: s.isAnimationStudio ? "Animation Studio" : "Studio",
      name: { full: s.name, native: "" },
      image: "",
      occupations: [],
    })),
  };

  const rawRelations = (anime.relations as any)?.edges || [];
  const relations = rawRelations.map((edge: any) => ({
    relationType: edge.relationType,
    id: edge.node?.id,
    title: edge.node?.title,
    format: edge.node?.format,
    status: edge.node?.status,
    coverImage: edge.node?.coverImage,
    averageScore: edge.node?.averageScore,
    year: edge.node?.startDate?.year,
  }));

  const rawRecs = (anime.recommendations as any)?.nodes || [];
  const recommendationsData = {
    page: 1,
    perPage: 12,
    total: rawRecs.length,
    hasNextPage: false,
    results: rawRecs
      .filter((n: any) => n.mediaRecommendation)
      .map((n: any) => {
        const rec = n.mediaRecommendation;
        return {
          id: rec.id,
          rating: n.rating,
          userRating: n.userRating,
          title: rec.title,
          coverImage: rec.coverImage,
          format: rec.format,
          status: rec.status,
          episodes: rec.episodes,
          averageScore: rec.averageScore,
          year: rec.startDate?.year,
        };
      }),
  };

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
