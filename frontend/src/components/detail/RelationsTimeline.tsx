import React from "react";
import Link from "next/link";
import Image from "next/image";
import { ArrowRight, GitFork, Star } from "lucide-react";
import { RelationItem } from "@/types/anime";
import { formatScore } from "@/lib/utils";

interface RelationsTimelineProps {
  currentAnimeId: number;
  currentAnimeTitle: string;
  relations: RelationItem[];
}

export function RelationsTimeline({
  currentAnimeId,
  currentAnimeTitle,
  relations,
}: RelationsTimelineProps) {
  if (!relations || relations.length === 0) {
    return (
      <div className="py-16 text-center text-zinc-400">
        No franchise relations recorded for this anime.
      </div>
    );
  }

  // Sort: PREQUEL first, then others, then SEQUEL
  const sortedRelations = [...relations].sort((a, b) => {
    if (a.relationType === "PREQUEL") return -1;
    if (b.relationType === "PREQUEL") return 1;
    if (a.relationType === "SEQUEL") return 1;
    if (b.relationType === "SEQUEL") return -1;
    return 0;
  });

  return (
    <div className="rounded-md border border-white/10 bg-[#131318] p-6 shadow-xl space-y-6">
      <div className="flex items-center gap-2 border-b border-white/10 pb-4">
        <GitFork className="h-5 w-5 text-[var(--accent)]" />
        <h3 className="font-display font-bold text-lg text-white">
          Franchise Timeline & Relations
        </h3>
      </div>

      <div className="flex items-center gap-4 overflow-x-auto pb-4 pt-2 scrollbar-thin">
        {sortedRelations.map((rel, index) => {
          const title = rel.title.english || rel.title.romaji || "Anime";
          const isPrequel = rel.relationType === "PREQUEL";
          const isSequel = rel.relationType === "SEQUEL";

          return (
            <React.Fragment key={`${rel.id}-${index}`}>
              {index > 0 && (
                <div className="flex items-center justify-center shrink-0 px-1 text-zinc-600">
                  <ArrowRight className="h-5 w-5 text-zinc-500" />
                </div>
              )}

              <Link
                href={`/anime/${rel.id}`}
                className={`group flex w-52 shrink-0 flex-col rounded-md border p-3 transition-all hover:-translate-y-1 ${
                  isPrequel
                    ? "border-blue-500/30 bg-blue-500/5 hover:border-blue-500/50"
                    : isSequel
                    ? "border-emerald-500/30 bg-emerald-500/5 hover:border-emerald-500/50"
                    : "border-white/10 bg-white/5 hover:border-white/20"
                }`}
              >
                {/* Relation Type Badge */}
                <div className="mb-2">
                  <span
                    className={`inline-block rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                      isPrequel
                        ? "bg-blue-500/20 text-blue-400"
                        : isSequel
                        ? "bg-emerald-500/20 text-emerald-400"
                        : "bg-white/10 text-zinc-300"
                    }`}
                  >
                    {rel.relationType.replace(/_/g, " ")}
                  </span>
                </div>

                {/* Poster */}
                <div className="relative aspect-[2/3] w-full overflow-hidden rounded-md bg-zinc-900 shadow-md">
                  {rel.coverImage?.large ? (
                    <Image
                      src={rel.coverImage.large}
                      alt={title}
                      fill
                      className="object-cover transition-transform duration-300 group-hover:scale-105"
                      sizes="180px"
                    />
                  ) : null}
                  {rel.averageScore ? (
                    <div className="absolute top-2 right-2 rounded-md bg-black/80 backdrop-blur-md px-1.5 py-0.5 text-[10px] font-bold text-amber-300 border border-amber-500/20 flex items-center gap-0.5">
                      <Star className="h-2.5 w-2.5 fill-amber-400 text-amber-400" />
                      <span>{formatScore(rel.averageScore)}</span>
                    </div>
                  ) : null}
                </div>

                {/* Title & Metadata */}
                <div className="mt-2.5 space-y-1">
                  <h4 className="line-clamp-2 text-xs font-bold text-zinc-100 group-hover:text-[var(--accent)] transition-colors">
                    {title}
                  </h4>
                  <div className="flex items-center gap-2 text-[10px] text-zinc-400">
                    {rel.format && <span className="uppercase">{rel.format}</span>}
                    {rel.year && <span>• {rel.year}</span>}
                  </div>
                </div>
              </Link>
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}
