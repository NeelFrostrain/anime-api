import React from "react";

export default function Loading() {
  return (
    <div className="relative min-h-[85vh] w-full flex flex-col">
      {/* Clean minimal top loading bar */}
      <div className="fixed inset-x-0 top-0 z-[100] h-0.5 bg-white/[0.08] overflow-hidden pointer-events-none">
        <div className="h-full w-1/3 bg-[var(--accent)] animate-[loading-bar_1.4s_ease-in-out_infinite]" />
      </div>

      {/* Clean Content Skeleton Preview */}
      <div className="w-full px-4 sm:px-6 md:px-8 lg:px-10 xl:px-12 py-3 sm:py-4 space-y-3 sm:space-y-4">
        <div className="h-6 w-32 sm:w-40 rounded bg-white/[0.05] skeleton-shimmer" />
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2 sm:gap-3 lg:gap-3.5">
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="space-y-1.5">
              <div className="aspect-[2/3] w-full rounded-md bg-white/[0.03] border border-white/[0.06] skeleton-shimmer" />
              <div className="h-3 w-3/4 rounded bg-white/[0.05]" />
              <div className="h-2 w-1/2 rounded bg-white/[0.03]" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
