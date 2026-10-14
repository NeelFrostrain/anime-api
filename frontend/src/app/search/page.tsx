import React, { Suspense } from "react";
import { Metadata } from "next";
import { SearchClient } from "./SearchClient";

export const metadata: Metadata = {
  title: "Search Anime — Advanced Filters & Catalog",
  description: "Search and filter through tens of thousands of anime by genres, release year, season, studio, and format.",
};

export default function SearchPage() {
  return (
    <div className="w-full px-4 sm:px-6 md:px-8 lg:px-10 xl:px-12 py-8 min-h-screen">
      <Suspense fallback={<div className="py-20 text-center text-zinc-400">Loading catalog search...</div>}>
        <SearchClient />
      </Suspense>
    </div>
  );
}
