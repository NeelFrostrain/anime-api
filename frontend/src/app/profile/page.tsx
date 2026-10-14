"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";
import {
  User as UserIcon,
  Bookmark,
  Clock,
  CheckCircle2,
  PieChart,
  Film,
  Sparkles,
  Sliders,
  LogOut,
  TrendingUp,
} from "lucide-react";
import { useAuthStore } from "@/stores/auth";
import { useWatchlistStore } from "@/stores/watchlist";
import { useHistoryStore } from "@/stores/history";
import { WATCHLIST_STATUS_LABELS } from "@/lib/constants";
import { ProgressBar } from "@/components/ui/ProgressBar";

export default function ProfilePage() {
  const { user, isAuthenticated, logout } = useAuthStore();
  const watchlist = useWatchlistStore((s) => s.items);
  const history = useHistoryStore((s) => s.items);

  const totalEntries = watchlist.length;
  const completedEntries = watchlist.filter((i) => i.status === "COMPLETED").length;
  const watchingEntries = watchlist.filter((i) => i.status === "WATCHING").length;
  const planningEntries = watchlist.filter((i) => i.status === "PLANNING").length;

  // Calculate estimated total hours watched (episodes watched * 24 mins / 60)
  const totalEpisodesWatched = watchlist.reduce((acc, curr) => acc + (curr.progress || 0), 0);
  const estimatedHours = ((totalEpisodesWatched * 24) / 60).toFixed(1);
  const completionRate = totalEntries > 0 ? Math.round((completedEntries / totalEntries) * 100) : 0;

  const username = user?.username || "Guest Otaku";
  const avatar = user?.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${username}`;

  return (
    <div className="w-full px-4 sm:px-6 md:px-8 lg:px-10 xl:px-12 py-8 space-y-8 min-h-screen">
      {/* Profile Header Card */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 rounded-md border border-white/10 bg-[#131318] p-6 sm:p-8 shadow-xl">
        <div className="flex items-center gap-5">
          <div className="relative h-20 w-20 overflow-hidden rounded-md bg-zinc-800 border-2 border-[var(--accent)] shadow-glow">
            <Image
              src={avatar}
              alt={username}
              fill
              className="object-cover"
            />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-display text-2xl sm:text-3xl font-extrabold text-white">
                {username}
              </h1>
              {!isAuthenticated && (
                <span className="rounded-md bg-white/10 px-2 py-0.5 text-[10px] font-semibold text-zinc-400">
                  Guest
                </span>
              )}
            </div>
            <p className="text-xs text-zinc-400 mt-1">
              {isAuthenticated ? user?.email : "Local Storage Guest Mode (Sync on Sign In)"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/profile/settings"
            className="flex items-center gap-2 rounded-md border border-white/15 bg-white/5 hover:bg-white/10 text-zinc-200 text-xs font-semibold px-4 py-2.5 transition-colors"
          >
            <Sliders className="h-4 w-4" />
            <span>Settings</span>
          </Link>
          {isAuthenticated ? (
            <button
              onClick={() => logout()}
              className="flex items-center gap-2 rounded-md border border-rose-500/20 bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 text-xs font-semibold px-4 py-2.5 transition-colors"
            >
              <LogOut className="h-4 w-4" />
              <span>Log Out</span>
            </button>
          ) : (
            <Link
              href="/login"
              className="flex items-center gap-2 rounded-md bg-[var(--accent)] hover:brightness-110 text-white font-bold text-xs px-5 py-2.5 shadow-glow transition-all"
            >
              <span>Sign In / Sync</span>
            </Link>
          )}
        </div>
      </div>

      {/* Stats Cards Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total in List */}
        <div className="rounded-md border border-white/10 bg-[#131318] p-5 shadow-lg space-y-1">
          <div className="flex items-center justify-between text-zinc-400">
            <span className="text-xs font-semibold">Total Anime</span>
            <Film className="h-4 w-4 text-[var(--accent)]" />
          </div>
          <p className="font-display text-2xl sm:text-3xl font-extrabold text-white">
            {totalEntries}
          </p>
          <span className="text-[11px] text-zinc-500">Tracked in library</span>
        </div>

        {/* Hours Watched */}
        <div className="rounded-md border border-white/10 bg-[#131318] p-5 shadow-lg space-y-1">
          <div className="flex items-center justify-between text-zinc-400">
            <span className="text-xs font-semibold">Hours Watched</span>
            <Clock className="h-4 w-4 text-emerald-400" />
          </div>
          <p className="font-display text-2xl sm:text-3xl font-extrabold text-white">
            {estimatedHours} <span className="text-sm font-normal text-zinc-400">hrs</span>
          </p>
          <span className="text-[11px] text-zinc-500">{totalEpisodesWatched} episodes watched</span>
        </div>

        {/* Completion Rate */}
        <div className="rounded-md border border-white/10 bg-[#131318] p-5 shadow-lg space-y-1">
          <div className="flex items-center justify-between text-zinc-400">
            <span className="text-xs font-semibold">Completion Rate</span>
            <CheckCircle2 className="h-4 w-4 text-purple-400" />
          </div>
          <p className="font-display text-2xl sm:text-3xl font-extrabold text-white">
            {completionRate}%
          </p>
          <span className="text-[11px] text-zinc-500">{completedEntries} completed</span>
        </div>

        {/* Currently Watching */}
        <div className="rounded-md border border-white/10 bg-[#131318] p-5 shadow-lg space-y-1">
          <div className="flex items-center justify-between text-zinc-400">
            <span className="text-xs font-semibold">Watching Now</span>
            <TrendingUp className="h-4 w-4 text-amber-400" />
          </div>
          <p className="font-display text-2xl sm:text-3xl font-extrabold text-white">
            {watchingEntries}
          </p>
          <span className="text-[11px] text-zinc-500">{planningEntries} planned</span>
        </div>
      </div>

      {/* Library Navigation Tabs Row */}
      <div className="flex items-center gap-3 border-b border-white/10 pb-4">
        <Link
          href="/profile/watchlist"
          className="rounded-md bg-[var(--accent)] text-white px-4 py-2 text-xs font-bold shadow-glow"
        >
          My Watchlist &rarr;
        </Link>
        <Link
          href="/profile/history"
          className="rounded-md border border-white/10 bg-white/5 hover:bg-white/10 text-zinc-300 px-4 py-2 text-xs font-bold transition-colors"
        >
          Continue Tracking History &rarr;
        </Link>
      </div>

      {/* Recent Activity / Watchlist Preview */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-lg font-bold text-white">Recently Updated in Watchlist</h2>
          <Link href="/profile/watchlist" className="text-xs text-[var(--accent)] hover:underline">
            Manage Watchlist
          </Link>
        </div>

        {watchlist.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {watchlist.slice(0, 6).map((item) => (
              <div
                key={item.animeId}
                className="flex items-center gap-3 rounded-md border border-white/10 bg-[#131318] p-3 shadow-md"
              >
                <Link
                  href={`/anime/${item.animeId}`}
                  className="relative h-16 w-12 shrink-0 overflow-hidden rounded-md bg-zinc-800"
                >
                  {item.animePoster ? (
                    <Image
                      src={item.animePoster}
                      alt={item.animeTitle}
                      fill
                      className="object-cover"
                      sizes="48px"
                    />
                  ) : null}
                </Link>
                <div className="flex-1 min-w-0 space-y-1">
                  <Link
                    href={`/anime/${item.animeId}`}
                    className="line-clamp-1 text-xs font-bold text-white hover:text-[var(--accent)] transition-colors"
                  >
                    {item.animeTitle}
                  </Link>
                  <div className="flex items-center justify-between text-[10px]">
                    <span className="font-semibold text-zinc-400">
                      Progress: {item.progress} / {item.totalEpisodes || "?"}
                    </span>
                    <span className="rounded px-1.5 py-0.5 bg-white/10 font-bold uppercase text-[9px]">
                      {item.status}
                    </span>
                  </div>
                  <ProgressBar value={item.progress} max={item.totalEpisodes || item.progress || 1} />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-md border border-dashed border-white/10 p-12 text-center text-zinc-500 text-xs">
            No anime in your list yet. Browse the catalogue and click &ldquo;+ Add to List&rdquo;!
          </div>
        )}
      </div>
    </div>
  );
}
