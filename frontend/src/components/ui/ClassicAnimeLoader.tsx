"use client";

import React from "react";

interface ClassicAnimeLoaderProps {
  size?: "sm" | "md" | "lg" | "fullscreen";
  title?: string;
  subtitle?: string;
  episodeNumber?: number;
  audio?: "sub" | "dub";
  showEqualizer?: boolean;
  providers?: string[];
  variant?: "stream" | "page" | "compact";
}

export function ClassicAnimeLoader({
  size = "md",
  title,
  subtitle,
  variant = "stream",
}: ClassicAnimeLoaderProps) {
  const isFullscreen = size === "fullscreen";
  const isSmall = size === "sm";

  return (
    <div
      className={`relative flex flex-col items-center justify-center select-none text-center ${
        isFullscreen
          ? "fixed inset-0 z-50 bg-[#0a0a0c]/90 backdrop-blur-sm"
          : "w-full h-full p-4"
      }`}
    >
      <div className="relative z-10 flex flex-col items-center space-y-2.5">
        {/* Clean, Simple Circular Spinner */}
        <div
          className={`rounded-full border-2 border-white/20 border-t-[var(--accent)] animate-spin ${
            isSmall ? "h-6 w-6" : "h-10 w-10 sm:h-11 sm:w-11"
          }`}
        />

        {/* Clean, Simple Status Label */}
        <span className="text-xs font-medium text-zinc-300">
          {title || subtitle || (variant === "stream" ? "Loading stream..." : "Loading...")}
        </span>
      </div>
    </div>
  );
}

