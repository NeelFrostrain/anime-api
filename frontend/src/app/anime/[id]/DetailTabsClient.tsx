"use client";

import React, { useState } from "react";
import { usePathname } from "next/navigation";
import {
  Info,
  ListVideo,
  Users,
  Briefcase,
  GitFork,
  ThumbsUp,
  MessageSquare,
} from "lucide-react";

interface DetailTabsClientProps {
  animeId: number;
  activeTab: string;
  counts: {
    episodes: number;
    characters: number;
    staff: number;
    relations: number;
    recommendations: number;
    reviews: number;
  };
  children?: React.ReactNode;
  overviewContent?: React.ReactNode;
  episodesContent?: React.ReactNode;
  charactersContent?: React.ReactNode;
  staffContent?: React.ReactNode;
  relationsContent?: React.ReactNode;
  recommendationsContent?: React.ReactNode;
  reviewsContent?: React.ReactNode;
}

export function DetailTabsClient({
  animeId,
  activeTab: initialActiveTab,
  counts,
  children,
  overviewContent,
  episodesContent,
  charactersContent,
  staffContent,
  relationsContent,
  recommendationsContent,
  reviewsContent,
}: DetailTabsClientProps) {
  const pathname = usePathname();
  const [currentTab, setCurrentTab] = useState(initialActiveTab || "overview");

  const tabs = [
    { id: "overview", label: "Overview", icon: Info },
    { id: "episodes", label: "Episodes", icon: ListVideo, count: counts.episodes },
    { id: "characters", label: "Characters", icon: Users, count: counts.characters },
    { id: "staff", label: "Staff", icon: Briefcase, count: counts.staff },
    { id: "relations", label: "Relations", icon: GitFork, count: counts.relations },
    { id: "recommendations", label: "Recommendations", icon: ThumbsUp, count: counts.recommendations },
    { id: "reviews", label: "Reviews", icon: MessageSquare, count: counts.reviews },
  ];

  const handleTabClick = (tabId: string) => {
    setCurrentTab(tabId);
    if (typeof window !== "undefined") {
      window.history.replaceState(null, "", `${pathname}?tab=${tabId}`);
    }
  };

  return (
    <div className="space-y-3 sm:space-y-4">
      {/* Tab Bar (Horizontal Scroll) */}
      <div className="flex items-center gap-1 overflow-x-auto border-b border-white/10 pb-1.5 scrollbar-none">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = currentTab === tab.id;

          return (
            <button
              key={tab.id}
              onClick={() => handleTabClick(tab.id)}
              type="button"
              className={`flex items-center gap-1.5 rounded-md px-2.5 sm:px-3 py-1.5 text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                isActive
                  ? "bg-[var(--accent)] text-white"
                  : "text-zinc-400 hover:text-white hover:bg-white/5"
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              <span>{tab.label}</span>
              {tab.count !== undefined && tab.count > 0 && (
                <span
                  className={`rounded-full px-1.5 py-0.2 text-[10px] font-semibold ${
                    isActive ? "bg-black/30 text-white" : "bg-white/10 text-zinc-400"
                  }`}
                >
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Render Active Tab Content Instantly */}
      <div>
        {currentTab === "overview" && overviewContent}
        {currentTab === "episodes" && episodesContent}
        {currentTab === "characters" && charactersContent}
        {currentTab === "staff" && staffContent}
        {currentTab === "relations" && relationsContent}
        {currentTab === "recommendations" && recommendationsContent}
        {currentTab === "reviews" && reviewsContent}
        {children}
      </div>
    </div>
  );
}

