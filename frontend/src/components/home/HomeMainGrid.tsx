"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Sparkles, TrendingUp, Award, ChevronRight } from "lucide-react";
import { AnimeCardData } from "@/types/anime";
import { AnimeGrid } from "../anime/AnimeGrid";

interface HomeMainGridProps {
  trendingList: AnimeCardData[];
  popularList: AnimeCardData[];
  topRatedList: AnimeCardData[];
}

export function HomeMainGrid({
  trendingList,
  popularList,
  topRatedList,
}: HomeMainGridProps) {
  const [activeTab, setActiveTab] = useState<"trending" | "popular" | "topRated">("trending");

  const getList = () => {
    switch (activeTab) {
      case "popular":
        return popularList.slice(0, 24);
      case "topRated":
        return topRatedList.slice(0, 24);
      default:
        return trendingList.slice(0, 24);
    }
  };

  const getHref = () => {
    switch (activeTab) {
      case "popular":
        return "/popular";
      case "topRated":
        return "/top-rated";
      default:
        return "/trending";
    }
  };

  return (
    <div className="space-y-5 sm:space-y-6">
      {/* Tab Navigation Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-3.5 sm:pb-4">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab("trending")}
            className={`flex items-center gap-1.5 rounded-md px-3.5 sm:px-4 py-2 text-xs sm:text-sm font-bold transition-all ${
              activeTab === "trending"
                ? "bg-[var(--accent)] text-white shadow-sm"
                : "text-zinc-400 hover:text-white hover:bg-white/5"
            }`}
          >
            <TrendingUp className="h-4 w-4" />
            <span>TRENDING</span>
          </button>
          <button
            onClick={() => setActiveTab("popular")}
            className={`flex items-center gap-1.5 rounded-md px-3.5 sm:px-4 py-2 text-xs sm:text-sm font-bold transition-all ${
              activeTab === "popular"
                ? "bg-[var(--accent)] text-white shadow-sm"
                : "text-zinc-400 hover:text-white hover:bg-white/5"
            }`}
          >
            <Sparkles className="h-4 w-4" />
            <span>POPULAR</span>
          </button>
          <button
            onClick={() => setActiveTab("topRated")}
            className={`flex items-center gap-1.5 rounded-md px-3.5 sm:px-4 py-2 text-xs sm:text-sm font-bold transition-all ${
              activeTab === "topRated"
                ? "bg-[var(--accent)] text-white shadow-sm"
                : "text-zinc-400 hover:text-white hover:bg-white/5"
            }`}
          >
            <Award className="h-4 w-4" />
            <span>TOP RATED</span>
          </button>
        </div>

        <Link
          href={getHref()}
          className="text-xs sm:text-sm font-semibold text-[var(--accent)] hover:underline inline-flex items-center gap-1 self-end sm:self-auto"
        >
          View All &rarr;
        </Link>
      </div>

      {/* Grid of anime cards */}
      <AnimeGrid animeList={getList()} />
    </div>
  );
}
