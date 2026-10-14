"use client";

import React, { useState } from "react";
import Image from "next/image";
import { Star, MessageSquare, ChevronDown, ChevronUp, User } from "lucide-react";
import { ReviewItem } from "@/types/anime";

interface ReviewsTabProps {
  reviews: ReviewItem[];
}

export function ReviewsTab({ reviews }: ReviewsTabProps) {
  const [expandedReviews, setExpandedReviews] = useState<Record<number, boolean>>({});

  const toggleExpand = (id: number) => {
    setExpandedReviews((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  if (!reviews || reviews.length === 0) {
    return (
      <div className="py-16 text-center text-zinc-400">
        No community reviews found for this anime yet.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {reviews.map((rev) => {
        const isExpanded = !!expandedReviews[rev.id];
        const isLong = rev.review.length > 350;

        return (
          <div
            key={rev.id}
            className="rounded-md border border-white/10 bg-[#131318] p-5 shadow-xl space-y-3"
          >
            {/* Header: User & Score */}
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-3">
                <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-full bg-zinc-800 border border-white/10">
                  {rev.avatar ? (
                    <Image
                      src={rev.avatar}
                      alt={rev.username}
                      fill
                      className="object-cover"
                    />
                  ) : (
                    <User className="h-5 w-5 m-auto text-zinc-600" />
                  )}
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white">{rev.username}</h4>
                  {rev.date && (
                    <p className="text-[11px] text-zinc-500">
                      {new Date(rev.date).toLocaleDateString()}
                    </p>
                  )}
                </div>
              </div>

              {rev.score && (
                <div className="flex items-center gap-1 rounded-md bg-amber-500/10 px-3 py-1 text-xs font-bold text-amber-300 border border-amber-500/20">
                  <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                  <span>{rev.score} / 10</span>
                </div>
              )}
            </div>

            {/* Review Body */}
            <p className="text-xs sm:text-sm text-zinc-300 leading-relaxed whitespace-pre-line">
              {isExpanded || !isLong ? rev.review : `${rev.review.slice(0, 350)}...`}
            </p>

            {isLong && (
              <button
                onClick={() => toggleExpand(rev.id)}
                className="flex items-center gap-1 text-xs font-semibold text-[var(--accent)] hover:underline pt-1"
              >
                <span>{isExpanded ? "Show Less" : "Read Full Review"}</span>
                {isExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}
