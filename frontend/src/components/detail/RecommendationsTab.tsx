import React from "react";
import Link from "next/link";
import Image from "next/image";
import { Star, ThumbsUp } from "lucide-react";
import { RecommendationItem } from "@/types/anime";
import { formatScore } from "@/lib/utils";

interface RecommendationsTabProps {
  recommendations: RecommendationItem[];
}

export function RecommendationsTab({ recommendations }: RecommendationsTabProps) {
  if (!recommendations || recommendations.length === 0) {
    return (
      <div className="py-16 text-center text-zinc-400">
        No community recommendations available for this anime.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2 sm:gap-3 lg:gap-3.5">
      {recommendations.map((item) => {
        const title = item.title.english || item.title.romaji || "Anime";

        return (
          <Link
            key={item.id}
            href={`/anime/${item.id}`}
            className="group flex flex-col transition-all duration-200"
          >
            <div className="relative aspect-[2/3] w-full overflow-hidden rounded-md bg-zinc-900 border border-white/10">
              {item.coverImage?.large && (
                <Image
                  src={item.coverImage.large}
                  alt={title}
                  fill
                  className="object-cover transition-transform duration-300 group-hover:scale-105"
                  sizes="(max-width: 640px) 45vw, 16vw"
                />
              )}
              {item.averageScore && (
                <div className="absolute top-1.5 right-1.5 rounded bg-black/80 backdrop-blur-md px-1 py-0.5 text-[9px] font-bold text-amber-300 border border-amber-500/20 flex items-center gap-0.5">
                  <Star className="h-2 w-2 fill-amber-400 text-amber-400" />
                  <span>{formatScore(item.averageScore)}</span>
                </div>
              )}
              {item.rating && item.rating > 0 && (
                <div className="absolute bottom-1.5 left-1.5 rounded bg-black/80 backdrop-blur-md px-1.5 py-0.5 text-[9px] font-semibold text-emerald-400 border border-white/10 flex items-center gap-1">
                  <ThumbsUp className="h-2 w-2" />
                  <span>+{item.rating}</span>
                </div>
              )}
            </div>

            <div className="mt-1.5 space-y-0.5">
              <h4 className="line-clamp-1 text-xs font-semibold text-zinc-200 group-hover:text-[var(--accent)] transition-colors">
                {title}
              </h4>
              <div className="flex items-center gap-2 text-[10px] text-zinc-400">
                {item.format && <span className="uppercase">{item.format}</span>}
                {item.year && <span>• {item.year}</span>}
              </div>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
