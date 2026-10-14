"use client";

import React, { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  Bookmark,
  Plus,
  Minus,
  Trash2,
  Download,
  Upload,
  Star,
  ExternalLink,
  ChevronLeft,
  Check,
} from "lucide-react";
import { useWatchlistStore } from "@/stores/watchlist";
import { WatchlistStatus } from "@/types/user";
import { WATCHLIST_STATUS_LABELS } from "@/lib/constants";
import { ProgressBar } from "@/components/ui/ProgressBar";

export default function WatchlistPage() {
  const { items, updateItem, removeItem, addItem } = useWatchlistStore();
  const [activeTab, setActiveTab] = useState<string>("ALL");
  const [search, setSearch] = useState("");
  const [aniListUsername, setAniListUsername] = useState("");
  const [isImporting, setIsImporting] = useState(false);
  const [importMessage, setImportMessage] = useState("");

  const filteredItems = items.filter((item) => {
    const matchesTab = activeTab === "ALL" || item.status === activeTab;
    const matchesSearch =
      !search.trim() || item.animeTitle.toLowerCase().includes(search.toLowerCase());
    return matchesTab && matchesSearch;
  });

  const handleProgressChange = (animeId: number, delta: number) => {
    const item = items.find((i) => i.animeId === animeId);
    if (!item) return;
    const max = item.totalEpisodes || 9999;
    const newProgress = Math.max(0, Math.min(item.progress + delta, max));
    const newStatus =
      newProgress >= max ? "COMPLETED" : newProgress > 0 ? "WATCHING" : item.status;
    updateItem(animeId, { progress: newProgress, status: newStatus });
  };

  const handleStatusChange = (animeId: number, status: WatchlistStatus) => {
    updateItem(animeId, { status });
  };

  // Export JSON backup
  const exportJSON = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(items, null, 2));
    const downloadAnchor = document.createElement("a");
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `kuromi_watchlist_${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  // Import JSON backup
  const handleFileImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileReader = new FileReader();
    if (e.target.files && e.target.files[0]) {
      fileReader.readAsText(e.target.files[0], "UTF-8");
      fileReader.onload = (event) => {
        try {
          const parsed = JSON.parse(event.target?.result as string);
          if (Array.isArray(parsed)) {
            parsed.forEach((item) => {
              if (item.animeId && item.animeTitle) {
                addItem(item);
              }
            });
            setImportMessage(`Successfully restored ${parsed.length} items!`);
          }
        } catch {
          setImportMessage("Invalid JSON file format.");
        }
      };
    }
  };

  // Import from AniList by username
  const importFromAniList = async () => {
    if (!aniListUsername.trim()) return;
    setIsImporting(true);
    setImportMessage("");

    const gql = `
      query ($userName: String) {
        MediaListCollection(userName: $userName, type: ANIME) {
          lists {
            name
            status
            entries {
              progress
              score
              media {
                id
                title { romaji english }
                coverImage { large }
                format
                episodes
                startDate { year }
              }
            }
          }
        }
      }
    `;

    try {
      const resp = await fetch("https://graphql.anilist.co", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: gql, variables: { userName: aniListUsername } }),
      });
      const data = await resp.json();
      const lists = data?.data?.MediaListCollection?.lists || [];
      let count = 0;

      for (const l of lists) {
        for (const entry of l.entries || []) {
          const m = entry.media;
          if (!m) continue;
          addItem({
            animeId: m.id,
            animeTitle: m.title.english || m.title.romaji,
            animePoster: m.coverImage?.large,
            animeFormat: m.format,
            animeYear: m.startDate?.year,
            status: (l.status as WatchlistStatus) || "PLANNING",
            progress: entry.progress || 0,
            totalEpisodes: m.episodes,
            score: entry.score,
          });
          count++;
        }
      }
      setImportMessage(`Imported ${count} anime from AniList user "${aniListUsername}"!`);
      setAniListUsername("");
    } catch {
      setImportMessage("Failed to fetch AniList data. Please verify the username.");
    } finally {
      setIsImporting(false);
    }
  };

  const tabs = [
    { label: "All", value: "ALL", count: items.length },
    { label: "Watching", value: "WATCHING", count: items.filter((i) => i.status === "WATCHING").length },
    { label: "Plan to Watch", value: "PLANNING", count: items.filter((i) => i.status === "PLANNING").length },
    { label: "Completed", value: "COMPLETED", count: items.filter((i) => i.status === "COMPLETED").length },
    { label: "On Hold", value: "PAUSED", count: items.filter((i) => i.status === "PAUSED").length },
    { label: "Dropped", value: "DROPPED", count: items.filter((i) => i.status === "DROPPED").length },
  ];

  return (
    <div className="w-full px-4 sm:px-6 md:px-8 lg:px-10 xl:px-12 py-8 space-y-8 min-h-screen">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-6">
        <div>
          <Link
            href="/profile"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--accent)] hover:underline mb-2"
          >
            <ChevronLeft className="h-4 w-4" />
            Profile Overview
          </Link>
          <h1 className="font-display text-3xl sm:text-4xl font-extrabold text-white flex items-center gap-3">
            <span>My Anime Library</span>
            <span className="rounded-md bg-white/10 px-3 py-1 text-sm font-bold text-[var(--accent)]">
              {items.length}
            </span>
          </h1>
        </div>

        {/* Import & Export Tools */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={exportJSON}
            className="flex items-center gap-1.5 rounded-md border border-white/10 bg-white/5 hover:bg-white/10 text-zinc-200 text-xs font-semibold px-3 py-2 transition-colors"
          >
            <Download className="h-4 w-4" />
            <span>Export Backup</span>
          </button>

          <label className="flex items-center gap-1.5 rounded-md border border-white/10 bg-white/5 hover:bg-white/10 text-zinc-200 text-xs font-semibold px-3 py-2 cursor-pointer transition-colors">
            <Upload className="h-4 w-4" />
            <span>Import JSON</span>
            <input type="file" accept=".json" onChange={handleFileImport} className="hidden" />
          </label>
        </div>
      </div>

      {/* AniList Importer Bar */}
      <div className="rounded-md border border-white/10 bg-[#131318] p-4 shadow-xl flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-md bg-blue-500/20 text-blue-400 flex items-center justify-center font-bold text-xs">
            AL
          </div>
          <div>
            <h4 className="text-xs font-bold text-white">Import from AniList</h4>
            <p className="text-[11px] text-zinc-400">Sync your public list directly by entering your AniList username</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={aniListUsername}
            onChange={(e) => setAniListUsername(e.target.value)}
            placeholder="AniList Username..."
            className="rounded-md border border-white/10 bg-white/5 px-3 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-[var(--accent)]"
          />
          <button
            onClick={importFromAniList}
            disabled={isImporting || !aniListUsername.trim()}
            className="rounded-md bg-[var(--accent)] hover:brightness-110 disabled:opacity-50 text-white font-bold text-xs px-4 py-2 transition-all shadow-glow"
          >
            {isImporting ? "Importing..." : "Sync List"}
          </button>
        </div>
      </div>

      {importMessage && (
        <div className="rounded-md border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs text-emerald-400 font-semibold">
          {importMessage}
        </div>
      )}

      {/* Status Tabs and Search */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        {/* Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none pb-2">
          {tabs.map((tab) => (
            <button
              key={tab.value}
              onClick={() => setActiveTab(tab.value)}
              className={`rounded-md px-3.5 py-2 text-xs font-bold whitespace-nowrap transition-all ${
                activeTab === tab.value
                  ? "bg-[var(--accent)] text-white"
                  : "border border-white/10 bg-[#131318] text-zinc-400 hover:text-white"
              }`}
            >
              <span>{tab.label}</span>
              <span className="ml-1.5 opacity-60 text-[10px]">({tab.count})</span>
            </button>
          ))}
        </div>

        {/* Filter input */}
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Filter list by title..."
          className="rounded-md border border-white/10 bg-[#131318] px-3.5 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-[var(--accent)] sm:w-64"
        />
      </div>

      {/* Watchlist Items List */}
      <div className="space-y-3">
        {filteredItems.map((item) => (
          <div
            key={item.animeId}
            className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-md border border-white/10 bg-[#131318] p-4 shadow-xl transition-all hover:border-white/20"
          >
            {/* Poster & Title */}
            <div className="flex items-center gap-4 min-w-0">
              <Link
                href={`/anime/${item.animeId}`}
                className="relative aspect-[2/3] w-14 shrink-0 overflow-hidden rounded-md bg-zinc-900 border border-white/10"
              >
                {item.animePoster ? (
                  <Image
                    src={item.animePoster}
                    alt={item.animeTitle}
                    fill
                    className="object-cover"
                    sizes="56px"
                  />
                ) : null}
              </Link>
              <div className="min-w-0 space-y-1">
                <Link
                  href={`/anime/${item.animeId}`}
                  className="line-clamp-1 text-sm font-bold text-white hover:text-[var(--accent)] transition-colors"
                >
                  {item.animeTitle}
                </Link>
                <div className="flex items-center gap-2 text-[10px] text-zinc-400">
                  {item.animeFormat && <span className="uppercase">{item.animeFormat}</span>}
                  {item.animeYear && <span>• {item.animeYear}</span>}
                  {item.totalEpisodes && <span>• {item.totalEpisodes} total eps</span>}
                </div>
              </div>
            </div>

            {/* Controls: Status, Progress (+ / -), Delete */}
            <div className="flex flex-wrap items-center gap-4 self-end sm:self-auto">
              {/* Status Select */}
              <select
                value={item.status}
                onChange={(e) => handleStatusChange(item.animeId, e.target.value as WatchlistStatus)}
                className="rounded-md border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold text-white focus:outline-none focus:border-[var(--accent)]"
              >
                <option value="WATCHING" className="bg-zinc-900">Watching</option>
                <option value="PLANNING" className="bg-zinc-900">Plan to Watch</option>
                <option value="COMPLETED" className="bg-zinc-900">Completed</option>
                <option value="PAUSED" className="bg-zinc-900">On Hold</option>
                <option value="DROPPED" className="bg-zinc-900">Dropped</option>
              </select>

              {/* Progress counter */}
              <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-md px-2 py-1">
                <button
                  onClick={() => handleProgressChange(item.animeId, -1)}
                  className="rounded-md p-1 text-zinc-400 hover:text-white transition-colors"
                >
                  <Minus className="h-3.5 w-3.5" />
                </button>
                <span className="font-mono text-xs font-bold text-white min-w-8 text-center">
                  {item.progress} / {item.totalEpisodes || "?"}
                </span>
                <button
                  onClick={() => handleProgressChange(item.animeId, 1)}
                  className="rounded-md p-1 text-zinc-400 hover:text-white transition-colors"
                >
                  <Plus className="h-3.5 w-3.5" />
                </button>
              </div>

              {/* Watch Hub shortcut */}
              <Link
                href={`/anime/${item.animeId}/watch?ep=${Math.max(1, item.progress)}`}
                className="rounded-md bg-[var(--accent)]/15 border border-[var(--accent)]/30 text-[var(--accent)] hover:bg-[var(--accent)]/25 px-3 py-1.5 text-xs font-bold transition-colors"
              >
                Watch
              </Link>

              {/* Delete button */}
              <button
                onClick={() => removeItem(item.animeId)}
                title="Remove from list"
                className="rounded-md p-2 text-zinc-500 hover:bg-rose-500/10 hover:text-rose-400 transition-colors"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>
        ))}

        {filteredItems.length === 0 && (
          <div className="py-20 text-center text-zinc-500 text-xs border border-dashed border-white/10 rounded-md">
            No entries found in this status category.
          </div>
        )}
      </div>
    </div>
  );
}
