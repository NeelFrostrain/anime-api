import React from "react";
import { Metadata } from "next";
import { notFound } from "next/navigation";
import { api } from "@/lib/api";
import { WatchHubClient } from "./WatchHubClient";

interface Props {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ ep?: string }>;
}

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const { id } = await params;
  const { ep = "1" } = await searchParams;
  const animeId = parseInt(id.split("-")[0]);
  if (isNaN(animeId)) return { title: "Watch Anime" };

  try {
    const anime = await api.getAnimeDetail(animeId);
    const title = anime.title.english || anime.title.romaji || "Anime";
    return {
      title: `Watch ${title} Episode ${ep} — Legal Streaming Hub`,
      description: `Watch official trailers and find licensed legal streaming sources for ${title} episode ${ep}.`,
    };
  } catch {
    return { title: "Watch Anime" };
  }
}

export default async function WatchHubPage({ params, searchParams }: Props) {
  const { id } = await params;
  const { ep = "1" } = await searchParams;
  const currentEp = parseInt(ep) || 1;

  const animeId = parseInt(id.split("-")[0]);
  if (isNaN(animeId)) notFound();

  // Only fetch fast cached metadata in SSR so the watch page renders instantly in ~50ms
  const [anime, episodes] = await Promise.all([
    api.getAnimeDetail(animeId).catch(() => null),
    api.getAnimeEpisodes(animeId).catch(() => []),
  ]);

  if (!anime) notFound();

  return (
    <div className="min-h-screen pb-24 md:pb-16">
      <WatchHubClient
        anime={anime}
        episodes={episodes}
        initialEpisode={currentEp}
      />
    </div>
  );
}
