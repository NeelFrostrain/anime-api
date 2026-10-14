import React from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { api } from "@/lib/api";
import { StaffTab } from "@/components/detail/StaffTab";
import { ChevronLeft } from "lucide-react";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function AnimeStaffPage({ params }: Props) {
  const { id } = await params;
  const animeId = parseInt(id.split("-")[0]);
  if (isNaN(animeId)) notFound();

  const [anime, staffData] = await Promise.all([
    api.getAnimeDetail(animeId).catch(() => null),
    api.getAnimeStaff(animeId, 1, 50).catch(() => ({ results: [] })),
  ]);

  if (!anime) notFound();

  const title = anime.title.english || anime.title.romaji || "Anime";

  return (
    <div className="w-full px-4 sm:px-6 md:px-8 lg:px-10 xl:px-12 py-8 space-y-6">
      <Link
        href={`/anime/${anime.id}?tab=staff`}
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--accent)] hover:underline"
      >
        <ChevronLeft className="h-4 w-4" />
        Back to {title} Overview
      </Link>

      <div>
        <h1 className="font-display text-2xl sm:text-3xl font-extrabold text-white">
          Production Staff
        </h1>
        <p className="text-sm text-zinc-400 mt-1">Creators, Directors & Animators for {title}</p>
      </div>

      <StaffTab staff={staffData.results} />
    </div>
  );
}
