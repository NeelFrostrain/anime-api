"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Command } from "cmdk";
import { Search, Sparkles, TrendingUp, Calendar, Shuffle, Bookmark, Settings, X, Film } from "lucide-react";
import Image from "next/image";
import { api } from "@/lib/api";
import { SuggestionItem } from "@/types/anime";

interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CommandPalette({ open, onOpenChange }: CommandPaletteProps) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<SuggestionItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Global keydown for Ctrl/Cmd+K
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        onOpenChange(!open);
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, [open, onOpenChange]);

  // Debounced search suggestions
  useEffect(() => {
    if (!query.trim() || query.length < 2) {
      setSuggestions([]);
      return;
    }

    const timer = setTimeout(async () => {
      setIsLoading(true);
      try {
        const results = await api.getSuggestions(query);
        setSuggestions(results);
      } catch {
        setSuggestions([]);
      } finally {
        setIsLoading(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [query]);

  const handleSelect = (callback: () => void) => {
    onOpenChange(false);
    setQuery("");
    callback();
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4 animate-in fade-in duration-150">
      <div
        className="fixed inset-0 bg-black/80 backdrop-blur-md transition-opacity"
        onClick={() => onOpenChange(false)}
      />

      <div className="relative z-10 w-full max-w-xl overflow-hidden rounded-md border border-white/10 bg-[#131318]">
        <Command
          shouldFilter={false}
          className="w-full bg-transparent text-white"
        >
          {/* Search Input Bar */}
          <div className="flex items-center gap-2.5 border-b border-white/10 px-3 py-2.5">
            <Search className="h-4 w-4 text-zinc-400 shrink-0" />
            <Command.Input
              autoFocus
              value={query}
              onValueChange={setQuery}
              placeholder="Search anime, characters, genres..."
              className="w-full bg-transparent text-sm placeholder-zinc-500 text-white outline-none"
              onKeyDown={(e) => {
                if (e.key === "Enter" && query.trim() && suggestions.length === 0) {
                  handleSelect(() => router.push(`/search?q=${encodeURIComponent(query)}`));
                }
              }}
            />
            {query ? (
              <button
                onClick={() => setQuery("")}
                className="text-zinc-400 hover:text-white"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            ) : (
              <kbd className="hidden sm:inline-flex rounded border border-white/10 px-1 py-0.2 text-[9px] text-zinc-400">
                ESC
              </kbd>
            )}
          </div>

          {/* List Content */}
          <Command.List className="max-h-80 overflow-y-auto p-1.5 scrollbar-thin">
            {isLoading && (
              <div className="py-4 text-center text-xs text-zinc-400">
                <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/20 border-t-white mr-2" />
                Searching AniList...
              </div>
            )}

            {/* Suggestions Results */}
            {suggestions.length > 0 && (
              <Command.Group heading="Anime Results" className="text-[11px] font-semibold text-zinc-400 px-2 py-0.5">
                {suggestions.map((item) => (
                  <Command.Item
                    key={item.id}
                    value={String(item.id)}
                    onSelect={() => handleSelect(() => router.push(`/anime/${item.id}`))}
                    className="flex items-center gap-2.5 rounded p-1.5 cursor-pointer hover:bg-white/10 aria-selected:bg-white/10 transition-colors"
                  >
                    <div className="relative h-10 w-7.5 shrink-0 overflow-hidden rounded bg-zinc-800">
                      {item.poster ? (
                        <Image
                          src={item.poster}
                          alt={item.title}
                          fill
                          className="object-cover"
                          sizes="30px"
                        />
                      ) : (
                        <Film className="h-3.5 w-3.5 m-auto text-zinc-600" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-white truncate">{item.title}</p>
                      <div className="flex items-center gap-1.5 text-[10px] text-zinc-400 mt-0.5">
                        {item.format && <span className="uppercase">{item.format}</span>}
                        {item.year && <span>• {item.year}</span>}
                        {item.episodes && <span>• {item.episodes} eps</span>}
                      </div>
                    </div>
                    {item.score && (
                      <span className="text-[10px] font-semibold text-amber-400 bg-amber-400/10 px-1.5 py-0.5 rounded border border-amber-400/20">
                        {(item.score / 10).toFixed(1)}
                      </span>
                    )}
                  </Command.Item>
                ))}
                <Command.Item
                  value="search_all"
                  onSelect={() => handleSelect(() => router.push(`/search?q=${encodeURIComponent(query)}`))}
                  className="mt-1 flex items-center gap-1.5 rounded p-1.5 text-[11px] text-[var(--accent)] hover:bg-white/5 cursor-pointer font-medium"
                >
                  <Search className="h-3 w-3" />
                  View all search results for &ldquo;{query}&rdquo; &rarr;
                </Command.Item>
              </Command.Group>
            )}

            {/* Quick Navigation Commands */}
            <Command.Group heading="Quick Navigation" className="text-[11px] font-semibold text-zinc-400 px-2 py-0.5 mt-1">
              <Command.Item
                onSelect={() => handleSelect(() => router.push("/trending"))}
                className="flex items-center gap-2 rounded p-1.5 cursor-pointer hover:bg-white/10 aria-selected:bg-white/10 text-xs text-zinc-200"
              >
                <TrendingUp className="h-3.5 w-3.5 text-[var(--accent)]" />
                <span>Trending Anime</span>
              </Command.Item>
              <Command.Item
                onSelect={() => handleSelect(() => router.push("/popular"))}
                className="flex items-center gap-2 rounded p-1.5 cursor-pointer hover:bg-white/10 aria-selected:bg-white/10 text-xs text-zinc-200"
              >
                <Sparkles className="h-3.5 w-3.5 text-amber-400" />
                <span>Popular All Time</span>
              </Command.Item>
              <Command.Item
                onSelect={() => handleSelect(() => router.push("/schedule"))}
                className="flex items-center gap-2 rounded p-1.5 cursor-pointer hover:bg-white/10 aria-selected:bg-white/10 text-xs text-zinc-200"
              >
                <Calendar className="h-3.5 w-3.5 text-emerald-400" />
                <span>Weekly Airing Schedule</span>
              </Command.Item>
              <Command.Item
                onSelect={() => handleSelect(() => router.push("/random"))}
                className="flex items-center gap-2 rounded p-1.5 cursor-pointer hover:bg-white/10 aria-selected:bg-white/10 text-xs text-zinc-200"
              >
                <Shuffle className="h-3.5 w-3.5 text-purple-400" />
                <span>Random Anime</span>
              </Command.Item>
              <Command.Item
                onSelect={() => handleSelect(() => router.push("/profile/watchlist"))}
                className="flex items-center gap-2 rounded p-1.5 cursor-pointer hover:bg-white/10 aria-selected:bg-white/10 text-xs text-zinc-200"
              >
                <Bookmark className="h-3.5 w-3.5 text-blue-400" />
                <span>My Watchlist</span>
              </Command.Item>
              <Command.Item
                onSelect={() => handleSelect(() => router.push("/profile/settings"))}
                className="flex items-center gap-2 rounded p-1.5 cursor-pointer hover:bg-white/10 aria-selected:bg-white/10 text-xs text-zinc-200"
              >
                <Settings className="h-3.5 w-3.5 text-zinc-400" />
                <span>Preferences & Theme</span>
              </Command.Item>
            </Command.Group>
          </Command.List>
        </Command>
      </div>
    </div>
  );
}
