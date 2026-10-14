"use client";

import React, { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  X,
  Home,
  Flame,
  Sparkles,
  Award,
  Calendar,
  Film,
  Shuffle,
  Grid,
  Compass,
  ChevronRight,
  Sun,
  Layers,
} from "lucide-react";
import { SITE_CONFIG, GENRES, FORMATS, SEASONS } from "@/lib/constants";

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  const router = useRouter();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (isOpen) {
      document.body.style.overflow = "hidden";
      window.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      document.body.style.overflow = "unset";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const currentYear = new Date().getFullYear();

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/80 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Drawer */}
      <div className="relative z-10 flex h-full w-72 max-w-[85vw] flex-col bg-[#111116] border-r border-white/10 p-4 animate-in slide-in-from-left duration-200">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-white/10">
          <Link href="/" onClick={onClose} className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-[var(--accent)] font-bold text-white text-xs">
              K
            </div>
            <span className="font-display font-extrabold text-base tracking-wider text-white">
              {SITE_CONFIG.name}
            </span>
          </Link>
          <button
            onClick={onClose}
            className="rounded p-1 text-zinc-400 hover:bg-white/10 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Navigation List */}
        <div className="flex-1 overflow-y-auto py-3 space-y-4 scrollbar-thin">
          {/* Main Links */}
          <div className="space-y-0.5">
            <Link
              href="/"
              onClick={onClose}
              className="flex items-center gap-2.5 rounded px-2.5 py-1.5 text-xs font-medium text-zinc-200 hover:bg-white/10 hover:text-white transition-colors"
            >
              <Home className="h-4 w-4 text-[var(--accent)]" />
              <span>Home</span>
            </Link>
            <Link
              href="/browse"
              onClick={onClose}
              className="flex items-center gap-2.5 rounded px-2.5 py-1.5 text-xs font-medium text-zinc-200 hover:bg-white/10 hover:text-white transition-colors"
            >
              <Compass className="h-4 w-4 text-cyan-400" />
              <span>Browse Hub</span>
            </Link>
            <Link
              href="/trending"
              onClick={onClose}
              className="flex items-center gap-2.5 rounded px-2.5 py-1.5 text-xs font-medium text-zinc-200 hover:bg-white/10 hover:text-white transition-colors"
            >
              <Flame className="h-4 w-4 text-rose-400" />
              <span>Trending Now</span>
            </Link>
            <Link
              href="/popular"
              onClick={onClose}
              className="flex items-center gap-2.5 rounded px-2.5 py-1.5 text-xs font-medium text-zinc-200 hover:bg-white/10 hover:text-white transition-colors"
            >
              <Sparkles className="h-4 w-4 text-amber-400" />
              <span>All-Time Popular</span>
            </Link>
            <Link
              href="/top-rated"
              onClick={onClose}
              className="flex items-center gap-2.5 rounded px-2.5 py-1.5 text-xs font-medium text-zinc-200 hover:bg-white/10 hover:text-white transition-colors"
            >
              <Award className="h-4 w-4 text-purple-400" />
              <span>Top Rated</span>
            </Link>
            <Link
              href="/movies"
              onClick={onClose}
              className="flex items-center gap-2.5 rounded px-2.5 py-1.5 text-xs font-medium text-zinc-200 hover:bg-white/10 hover:text-white transition-colors"
            >
              <Film className="h-4 w-4 text-pink-400" />
              <span>Anime Movies</span>
            </Link>
            <Link
              href="/schedule"
              onClick={onClose}
              className="flex items-center gap-2.5 rounded px-2.5 py-1.5 text-xs font-medium text-zinc-200 hover:bg-white/10 hover:text-white transition-colors"
            >
              <Calendar className="h-4 w-4 text-emerald-400" />
              <span>Airing Schedule</span>
            </Link>
            <button
              onClick={() => {
                onClose();
                router.push("/random");
              }}
              className="flex w-full items-center gap-2.5 rounded px-2.5 py-1.5 text-xs font-medium text-zinc-200 hover:bg-white/10 hover:text-white transition-colors"
            >
              <Shuffle className="h-4 w-4 text-blue-400" />
              <span>Random Anime</span>
            </button>
          </div>

          {/* Formats / Types */}
          <div>
            <p className="px-2.5 text-[11px] font-semibold uppercase tracking-wider text-zinc-400 mb-1.5">
              Formats
            </p>
            <div className="grid grid-cols-2 gap-1 px-1">
              {FORMATS.slice(0, 6).map((format) => (
                <Link
                  key={format.value}
                  href={`/search?format=${format.value}`}
                  onClick={onClose}
                  className="rounded px-2 py-1 text-xs text-zinc-300 hover:bg-white/10 hover:text-white transition-colors"
                >
                  {format.label}
                </Link>
              ))}
            </div>
          </div>

          {/* Popular Genres */}
          <div>
            <p className="px-2.5 text-[11px] font-semibold uppercase tracking-wider text-zinc-400 mb-1.5">
              Popular Genres
            </p>
            <div className="flex flex-wrap gap-1 px-1">
              {GENRES.slice(0, 10).map((genre) => (
                <Link
                  key={genre}
                  href={`/genre/${genre.toLowerCase().replace(/\s+/g, "-")}`}
                  onClick={onClose}
                  className="rounded border border-white/10 bg-white/5 px-2 py-0.5 text-[11px] text-zinc-300 hover:border-white/20 hover:bg-white/10 hover:text-white transition-colors"
                >
                  {genre}
                </Link>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="pt-3 border-t border-white/10 text-[11px] text-zinc-400 text-center">
          {SITE_CONFIG.name} v2.0 • Legal Anime Index
        </div>
      </div>
    </div>
  );
}
