"use client";

import React, { useRef } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { GENRES } from "@/lib/constants";

export function GenreChipsRow() {
  const scrollRef = useRef<HTMLDivElement>(null);

  const scroll = (direction: "left" | "right") => {
    if (scrollRef.current) {
      const offset = direction === "left" ? -300 : 300;
      scrollRef.current.scrollBy({ left: offset, behavior: "smooth" });
    }
  };

  return (
    <div className="relative group/chips py-1 sm:py-1.5">
      {/* Scroll Left Button */}
      <button
        onClick={() => scroll("left")}
        className="absolute -left-3 top-1/2 -translate-y-1/2 z-10 flex h-8 w-8 items-center justify-center rounded-full border border-white/15 bg-[#131318]/95 text-zinc-300 backdrop-blur-md hover:bg-white/15 hover:text-white transition-all opacity-0 group-hover/chips:opacity-100 hidden sm:flex shadow-lg"
      >
        <ChevronLeft className="h-4 w-4" />
      </button>

      {/* Chips Container */}
      <div
        ref={scrollRef}
        className="flex items-center gap-2 sm:gap-2.5 overflow-x-auto scrollbar-none py-1.5 px-1 scroll-smooth"
      >
        {GENRES.map((genre) => {
          const slug = genre.toLowerCase().replace(/\s+/g, "-");
          return (
            <Link
              key={genre}
              href={`/genre/${slug}`}
              className="shrink-0 rounded-md border border-white/10 bg-white/5 px-3.5 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-[13px] font-semibold text-zinc-300 hover:border-[var(--accent)] hover:text-white hover:bg-[var(--accent)]/10 transition-all whitespace-nowrap active:scale-95"
            >
              {genre}
            </Link>
          );
        })}
      </div>

      {/* Scroll Right Button */}
      <button
        onClick={() => scroll("right")}
        className="absolute -right-3 top-1/2 -translate-y-1/2 z-10 flex h-8 w-8 items-center justify-center rounded-full border border-white/15 bg-[#131318]/95 text-zinc-300 backdrop-blur-md hover:bg-white/15 hover:text-white transition-all opacity-0 group-hover/chips:opacity-100 hidden sm:flex shadow-lg"
      >
        <ChevronRight className="h-4 w-4" />
      </button>
    </div>
  );
}
