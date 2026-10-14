import React from "react";

export default function DetailLoading() {
  return (
    <div className="min-h-screen pb-16 animate-pulse">
      {/* Top Banner Skeleton */}
      <div className="relative w-full h-[320px] sm:h-[380px] md:h-[440px] bg-white/[0.04]">
        <div className="absolute inset-0 bg-gradient-to-t from-[#0e0e12] via-[#0e0e12]/60 to-transparent" />
      </div>

      {/* Main Details Skeleton Layout */}
      <div className="w-full px-4 sm:px-6 md:px-8 lg:px-10 xl:px-12 -mt-36 sm:-mt-44 relative z-10">
        <div className="flex flex-col md:flex-row gap-6 md:gap-8 lg:gap-10">
          {/* Poster Skeleton */}
          <div className="w-44 sm:w-56 md:w-64 shrink-0 mx-auto md:mx-0">
            <div className="aspect-[2/3] w-full rounded-xl bg-white/[0.06] border border-white/10 shadow-2xl" />
            <div className="h-10 w-full mt-4 rounded-lg bg-white/[0.05]" />
          </div>

          {/* Info Details Skeleton */}
          <div className="flex-1 space-y-4 pt-4 md:pt-16">
            <div className="h-8 sm:h-10 w-3/4 max-w-lg rounded-lg bg-white/[0.08]" />
            <div className="h-4 w-1/2 max-w-sm rounded bg-white/[0.04]" />
            <div className="flex gap-2 pt-2">
              <div className="h-6 w-16 rounded bg-white/[0.06]" />
              <div className="h-6 w-16 rounded bg-white/[0.06]" />
              <div className="h-6 w-20 rounded bg-white/[0.06]" />
            </div>
            <div className="space-y-2 pt-4">
              <div className="h-3.5 w-full rounded bg-white/[0.04]" />
              <div className="h-3.5 w-full rounded bg-white/[0.04]" />
              <div className="h-3.5 w-3/4 rounded bg-white/[0.04]" />
            </div>
          </div>
        </div>

        {/* Tabs Bar Skeleton */}
        <div className="mt-10 border-b border-white/10 pb-3 flex gap-6">
          <div className="h-6 w-24 rounded bg-white/[0.08]" />
          <div className="h-6 w-24 rounded bg-white/[0.04]" />
          <div className="h-6 w-24 rounded bg-white/[0.04]" />
        </div>
      </div>
    </div>
  );
}
