"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ExternalLink,
  Lightbulb,
  Check,
  Calendar,
  Sparkles,
  Info,
  ShieldCheck,
  Play,
  RotateCcw,
  Zap,
  Layers,
  Globe,
  Server,
  AlertTriangle,
  RefreshCw,
  Star,
  Mic,
} from "lucide-react";
import { AnimeDetailData, StreamExtractionResult } from "@/types/anime";
import { VideoPlayer } from "@/components/watch/VideoPlayer";
import { useWatchlistStore } from "@/stores/watchlist";
import { useHistoryStore } from "@/stores/history";
import { useMounted } from "@/hooks/useMounted";
import { formatTimeUntil } from "@/lib/utils";
import { api } from "@/lib/api";
import { EXTRACTION_PROVIDERS, PROVIDER_NAMES } from "@/lib/constants";

interface Episode {
  number: number;
  title: string;
  thumbnail?: string | null;
  airingAt?: number | null;
  isAired?: boolean;
}

interface WatchHubClientProps {
  anime: AnimeDetailData;
  episodes: Episode[];
  initialEpisode: number;
  initialStream?: StreamExtractionResult | null;
}

export function WatchHubClient({
  anime,
  episodes,
  initialEpisode,
  initialStream,
}: WatchHubClientProps) {
  const router = useRouter();
  const [currentEpNum, setCurrentEpNum] = useState(initialEpisode);
  const [lightsOff, setLightsOff] = useState(false);

  // Audio & Provider options
  const [audio, setAudio] = useState<"sub" | "dub">("sub");
  const [provider, setProvider] = useState<string>("auto");
  const [playerMode, setPlayerMode] = useState<"stream" | "embed">("stream");

  // Custom extraction server dropdown state with smart positioning
  const [showServerDropdown, setShowServerDropdown] = useState(false);
  const [dropdownDirection, setDropdownDirection] = useState<"up" | "down">("down");
  const serverDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!showServerDropdown) return;
    if (serverDropdownRef.current) {
      const rect = serverDropdownRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      const spaceAbove = rect.top;
      // If less than 280px below and more room above, open upwards to avoid overlapping bottom
      if (spaceBelow < 280 && spaceAbove > spaceBelow) {
        setDropdownDirection("up");
      } else {
        setDropdownDirection("down");
      }
    }
    const handleClickOutside = (e: MouseEvent) => {
      if (serverDropdownRef.current && !serverDropdownRef.current.contains(e.target as Node)) {
        setShowServerDropdown(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setShowServerDropdown(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [showServerDropdown]);

  // Automation options
  const [autoPlay, setAutoPlay] = useState(true);
  const [autoNext, setAutoNext] = useState(true);
  const [autoSkipIntro, setAutoSkipIntro] = useState(false);
  const [autoMarkWatched, setAutoMarkWatched] = useState(true);

  // Stream Extraction state
  const [streamResult, setStreamResult] = useState<StreamExtractionResult | null>(initialStream || null);
  const [isExtracting, setIsExtracting] = useState(!initialStream);
  const [extractError, setExtractError] = useState<string | null>(null);

  // Determine if embed fallback or stream is available
  const hasEmbed = Boolean(
    streamResult?.streams?.some((s) => s.type === "embed" || Boolean(s.embed))
  );

  const mounted = useMounted();
  const { getItem, updateItem, addItem } = useWatchlistStore();
  const { recordProgress } = useHistoryStore();

  const title = anime.title.english || anime.title.romaji || "Anime";
  const watchItem = mounted ? getItem(anime.id) : undefined;
  const watchedProgress = watchItem?.progress || 0;

  // DUB availability state
  const [dubAvailable, setDubAvailable] = useState<boolean | null>(null);
  const [dubNotification, setDubNotification] = useState<string | null>(null);

  // Filter out upcoming / unaired episodes from playable list
  const playableEpisodes = React.useMemo(() => {
    const nextEpNum = anime.nextAiringEpisode?.episode;
    const nowSec = Math.floor(Date.now() / 1000);

    const filtered = episodes.filter((ep) => {
      // 1. If anime status is NOT_YET_RELEASED, no episodes are playable
      if (anime.status === "NOT_YET_RELEASED") return false;

      // 2. If AniList provides nextAiringEpisode, any episode >= nextAiringEpisode is upcoming
      if (nextEpNum && ep.number >= nextEpNum) return false;

      // 3. If explicit airingAt timestamp is in the future
      if (ep.airingAt && ep.airingAt > nowSec) return false;

      // 4. If explicit isAired flag is false
      if (ep.isAired === false) return false;

      return true;
    });

    if (filtered.length === 0 && anime.status !== "NOT_YET_RELEASED" && episodes.length > 0) {
      return episodes.filter((ep) => ep.isAired !== false);
    }

    return filtered;
  }, [episodes, anime.nextAiringEpisode, anime.status]);

  // Active episode object from playable episodes
  const activeEpisode = playableEpisodes.find((e) => e.number === currentEpNum) ||
    playableEpisodes[0] || {
    number: currentEpNum,
    title: `Episode ${currentEpNum}`,
    thumbnail: anime.coverImage.large,
  };

  const nextEp = anime.nextAiringEpisode;

  // Available native extraction providers (all 11 + auto)
  const availableProviders = EXTRACTION_PROVIDERS.map((p) => p.id);

  // Description expand / collapse state
  const [showFullDesc, setShowFullDesc] = useState(false);

  // Poster image for info card
  const posterUrl =
    anime.coverImage?.extraLarge ||
    anime.coverImage?.large ||
    anime.coverImage?.medium ||
    anime.bannerImage ||
    "";

  // Formatted alternative titles
  const alternativeTitles = React.useMemo(() => {
    const list = [
      anime.title.romaji,
      anime.title.native,
      ...(anime.synonyms || []),
    ].filter((t): t is string => Boolean(t) && t !== title);
    return Array.from(new Set(list)).join("; ");
  }, [anime.title, anime.synonyms, title]);

  // Clean description without raw HTML
  const cleanDescription = React.useMemo(() => {
    return (anime.description || "").replace(/<[^>]*>?/gm, "").trim();
  }, [anime.description]);

  // Premiered info
  const premieredText =
    anime.season && anime.seasonYear
      ? `${anime.season} ${anime.seasonYear}`
      : anime.seasonYear
      ? `${anime.seasonYear}`
      : anime.startDate?.year
      ? `${anime.startDate.year}`
      : "UNKNOWN";

  // Aired date range
  const airedDateText = React.useMemo(() => {
    const formatD = (d: { year: number | null; month: number | null; day: number | null } | null) => {
      if (!d || !d.year) return null;
      const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      const m = d.month ? monthNames[d.month - 1] + " " : "";
      const day = d.day ? `${d.day}, ` : "";
      return `${m}${day}${d.year}`;
    };
    const s = formatD(anime.startDate);
    const e = formatD(anime.endDate);
    if (s && e && s !== e) return `${s} to ${e}`;
    return s || (anime.seasonYear ? `${anime.seasonYear}` : "Unknown");
  }, [anime.startDate, anime.endDate, anime.seasonYear]);

  // Status label
  const statusLabel =
    anime.status === "RELEASING"
      ? "Currently Airing"
      : anime.status === "FINISHED"
      ? "Finished Airing"
      : anime.status === "NOT_YET_RELEASED"
      ? "Not Yet Aired"
      : anime.status === "CANCELLED"
      ? "Cancelled"
      : anime.status || "Unknown";

  // Score
  const scoreDisplay = anime.averageScore
    ? `${(anime.averageScore / 10).toFixed(2)}`
    : anime.meanScore
    ? `${(anime.meanScore / 10).toFixed(2)}`
    : null;

  // Studios
  const studioNames =
    anime.studios && anime.studios.length > 0
      ? anime.studios.map((s) => s.name).join(", ")
      : "Unknown";

  // Source
  const sourceName = anime.source
    ? anime.source.replace(/_/g, " ").toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase())
    : "Original";

  // DUB availability defaults to available unless proven otherwise
  useEffect(() => {
    if (dubAvailable === null) {
      setDubAvailable(true);
    }
  }, [dubAvailable]);

  // Fetch real stream from backend extraction engine
  const fetchStream = useCallback(
    async (epNum: number, aud: "sub" | "dub", prov: string) => {
      setIsExtracting(true);
      setExtractError(null);
      try {
        const res = await api.extractEpisode(
          anime.id,
          epNum,
          aud,
          prov === "auto" ? undefined : prov
        );
        setStreamResult(res);
        if (aud === "dub") {
          setDubAvailable(true);
        }
        const hasDirectStream = res?.streams?.some((s: any) => s.type !== "embed");
        if (hasDirectStream) {
          setPlayerMode("stream");
        } else if (res?.streams && res.streams.length > 0) {
          setPlayerMode("embed");
        } else {
          setExtractError(`No stream found for Episode ${epNum} on the selected server. Please select another server.`);
        }
      } catch (err: any) {
        const errMsg = err?.message || "";
        const isDubError = aud === "dub" || errMsg.toLowerCase().includes("dub");

        if (isDubError) {
          setDubAvailable(false);
          setAudio("sub");
          setDubNotification("English DUB is not available for this episode. Switched to SUB.");
          setTimeout(() => setDubNotification(null), 5000);
          return;
        } else {
          setExtractError(
            errMsg || `No ${aud.toUpperCase()} stream found for Episode ${epNum}. Try selecting a different server.`
          );
        }
      } finally {
        setIsExtracting(false);
      }
    },
    [anime.id]
  );

  const handleTryNextServer = () => {
    const currentIndex = EXTRACTION_PROVIDERS.findIndex((p) => p.id === provider);
    const nextIndex = (currentIndex + 1) % EXTRACTION_PROVIDERS.length;
    const nextProv = EXTRACTION_PROVIDERS[nextIndex].id;
    setProvider(nextProv);
    fetchStream(currentEpNum, audio, nextProv);
  };

  const isInitialMount = React.useRef(true);

  // Trigger stream extraction on episode, audio, or provider change
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      if (initialStream && currentEpNum === initialEpisode && audio === "sub" && provider === "auto") {
        return;
      }
    }
    fetchStream(currentEpNum, audio, provider);
  }, [currentEpNum, audio, provider, fetchStream, initialEpisode, initialStream]);

  // Throttle history progress recordings to avoid flooding
  const lastHistoryTimeRef = React.useRef<number>(0);
  const lastHistoryEpRef = React.useRef<number>(currentEpNum);

  // Update URL on episode change without unmounting or triggering route loading
  const selectEpisode = (epNum: number) => {
    setCurrentEpNum(epNum);
    setPlayerMode("stream");
    setExtractError(null);
    lastHistoryTimeRef.current = 0;
    lastHistoryEpRef.current = epNum;
    if (typeof window !== "undefined") {
      window.history.replaceState(null, "", `/anime/${anime.id}/watch?ep=${epNum}`);
    }

    // If auto mark watched
    if (autoMarkWatched) {
      if (!watchItem) {
        addItem({
          animeId: anime.id,
          animeTitle: title,
          animePoster: anime.coverImage.large,
          status: "WATCHING",
          progress: epNum,
          totalEpisodes: anime.episodes || episodes.length,
        });
      } else if (watchedProgress < epNum) {
        updateItem(anime.id, { progress: epNum });
      }
    }
  };

  // Toggle automation options
  const handleAutoToggle = (key: "autoPlay" | "autoNext" | "autoSkipIntro") => {
    if (key === "autoPlay") setAutoPlay((prev) => !prev);
    if (key === "autoNext") setAutoNext((prev) => !prev);
    if (key === "autoSkipIntro") setAutoSkipIntro((prev) => !prev);
  };

  // Record history on time update (throttled to at most once every 5 seconds)
  const handleTimeUpdate = (currentTime: number, duration: number) => {
    const isNewEp = lastHistoryEpRef.current !== currentEpNum;
    const timeDiff = Math.abs(currentTime - lastHistoryTimeRef.current);

    if (isNewEp || timeDiff >= 5 || (currentTime < 1 && lastHistoryTimeRef.current > 5)) {
      lastHistoryTimeRef.current = currentTime;
      lastHistoryEpRef.current = currentEpNum;

      recordProgress({
        animeId: anime.id,
        animeTitle: title,
        animePoster: anime.coverImage.large,
        episode: currentEpNum,
        episodeTitle: activeEpisode.title,
        playbackPosition: currentTime,
        playbackDuration: duration,
      });
    }

    // Auto mark watched if past 85% of duration
    if (autoMarkWatched && duration > 0 && currentTime / duration > 0.85) {
      if (!watchItem || watchedProgress < currentEpNum) {
        updateItem(anime.id, { progress: currentEpNum, status: currentEpNum >= (anime.episodes || 9999) ? "COMPLETED" : "WATCHING" });
      }
    }
  };

  const handleEnded = () => {
    const currentIdx = playableEpisodes.findIndex((e) => e.number === currentEpNum);
    if (autoNext && currentIdx !== -1 && currentIdx < playableEpisodes.length - 1) {
      selectEpisode(playableEpisodes[currentIdx + 1].number);
    }
  };

  return (
    <div className={`transition-all duration-500 ${lightsOff ? "bg-black" : "bg-[#0a0a0c]"}`}>
      <div className="w-full px-4 sm:px-6 md:px-8 lg:px-10 xl:px-12 py-5 sm:py-6 md:py-8 pb-16 sm:pb-20 md:pb-24 space-y-5 sm:space-y-6">
        {/* Top Header / Breadcrumb */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-3.5 sm:pb-4 w-full overflow-hidden">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 w-full sm:w-auto overflow-hidden">
            <Link
              href={`/anime/${anime.id}`}
              className="flex items-center gap-1.5 shrink-0 rounded-md border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold text-zinc-300 hover:bg-white/10 hover:text-white transition-colors"
            >
              <ChevronLeft className="h-4 w-4 shrink-0" />
              <span>Details</span>
            </Link>
            <div className="min-w-0 flex-1 overflow-hidden">
              <h1 className="font-display text-sm sm:text-base md:text-lg font-bold text-white truncate block">
                {title}
              </h1>
              <p className="text-xs text-[var(--accent)] font-semibold truncate block">
                Episode {currentEpNum} — {activeEpisode.title}
              </p>
            </div>
          </div>

          {/* Quick Toggles */}
          <div className="flex items-center gap-2 w-full sm:w-auto shrink-0 justify-end">
            {/* Lights Off Toggle */}
            <button
              onClick={() => setLightsOff(!lightsOff)}
              className={`flex-1 sm:flex-initial flex items-center justify-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-all ${
                lightsOff
                  ? "bg-amber-400 text-black font-bold"
                  : "border border-white/10 bg-white/5 text-zinc-400 hover:text-white"
              }`}
            >
              <Lightbulb className="h-3.5 w-3.5 shrink-0" />
              <span className="whitespace-nowrap">{lightsOff ? "Lights On" : "Lights Off"}</span>
            </button>

            {/* Auto-mark Watched Toggle */}
            <button
              onClick={() => setAutoMarkWatched(!autoMarkWatched)}
              className={`flex-1 sm:flex-initial flex items-center justify-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-all ${
                autoMarkWatched
                  ? "border border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
                  : "border border-white/10 bg-white/5 text-zinc-400"
              }`}
            >
              <Check className="h-3.5 w-3.5 shrink-0" />
              <span className="whitespace-nowrap">Auto-Track</span>
            </button>
          </div>
        </div>

        {/* Video Player & Episode Sidebar Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-4 2xl:grid-cols-5 gap-5 sm:gap-6">
          {/* Main Video Area (3 cols / 4 cols on 2xl) */}
          <div className="lg:col-span-3 2xl:col-span-4 space-y-4 sm:space-y-5">
            {/* DUB Not Available Notification Toast */}
            {dubNotification && (
              <div className="flex items-center justify-between gap-3 rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-300 animate-in fade-in">
                <div className="flex items-center gap-2">
                  <Info className="h-4 w-4 shrink-0 text-amber-400" />
                  <span>{dubNotification}</span>
                </div>
                <button
                  onClick={() => setDubNotification(null)}
                  className="text-amber-400 hover:text-white text-xs font-bold px-1"
                >
                  ✕
                </button>
              </div>
            )}

            {/* Error Banner with Retry & Server Switch */}
            {extractError && (
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-md border border-rose-500/30 bg-rose-500/10 p-3.5 sm:p-4 text-xs text-rose-300">
                <div className="flex items-center gap-2.5">
                  <AlertTriangle className="h-4 w-4 shrink-0 text-rose-400" />
                  <span>{extractError}</span>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    onClick={handleTryNextServer}
                    className="flex items-center gap-1.5 rounded-md bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 px-2.5 py-1 font-bold text-amber-300 transition-colors"
                  >
                    <Server className="h-3 w-3" />
                    <span>Try Next Server</span>
                  </button>
                  {hasEmbed && (
                    <button
                      onClick={() => {
                        setPlayerMode("embed");
                        setExtractError(null);
                      }}
                      className="flex items-center gap-1.5 rounded-md bg-[var(--accent)] hover:brightness-110 px-2.5 py-1 font-bold text-white transition-all shadow-sm"
                    >
                      <Layers className="h-3 w-3" />
                      <span>Watch via Embed</span>
                    </button>
                  )}
                  {audio === "dub" ? (
                    <button
                      onClick={() => setAudio("sub")}
                      className="rounded-md bg-rose-500/20 hover:bg-rose-500/30 px-2.5 py-1 font-bold text-white transition-colors"
                    >
                      Switch to SUB
                    </button>
                  ) : dubAvailable !== false ? (
                    <button
                      onClick={() => setAudio("dub")}
                      className="rounded-md bg-rose-500/20 hover:bg-rose-500/30 px-2.5 py-1 font-bold text-white transition-colors"
                    >
                      Switch to DUB
                    </button>
                  ) : null}
                  <button
                    onClick={() => fetchStream(currentEpNum, audio, provider)}
                    className="flex items-center gap-1 rounded-md bg-white/10 hover:bg-white/20 px-2.5 py-1 font-semibold text-white transition-colors"
                  >
                    <RefreshCw className="h-3 w-3" />
                    <span>Retry</span>
                  </button>
                </div>
              </div>
            )}

            {/* Advanced Video Player */}
            <VideoPlayer
              streams={streamResult?.streams || []}
              subtitles={streamResult?.subtitles || []}
              animeTitle={title}
              episodeNumber={currentEpNum}
              activeAudio={audio}
              onAudioChange={setAudio}
              isDubAvailable={dubAvailable !== false}
              activeProvider={provider}
              onProviderChange={setProvider}
              availableProviders={availableProviders}
              playerMode={playerMode}
              onPlayerModeChange={setPlayerMode}
              hideTopBar={true}
              autoPlay={autoPlay}
              autoNext={autoNext}
              autoSkipIntro={autoSkipIntro}
              onAutoToggle={handleAutoToggle}
              onTimeUpdate={handleTimeUpdate}
              onEnded={handleEnded}
              isLoadingStreams={isExtracting}
              onRetry={() => fetchStream(currentEpNum, audio, provider)}
            />

            {/* Unified Playback, Episode Navigation & Source Hub */}
            <div className="rounded-md border border-white/10 bg-[#131318] p-2 sm:p-2.5 space-y-2 shadow-sm relative z-30">
              {/* Row 1: Unified Quick Controls Bar (Mobile-first responsive layout) */}
              <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-2 sm:gap-2.5">
                {/* Deck 1 (Left on Desktop, Row 1 on Mobile): Episode Navigation, Stream Mode & Audio */}
                <div className="flex items-center justify-between xl:justify-start gap-1.5 sm:gap-2 w-full xl:w-auto">
                  {/* Episode Navigation (Prev / EP / Next) */}
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      disabled={playableEpisodes.length === 0 || currentEpNum <= (playableEpisodes[0]?.number || 1)}
                      onClick={() => {
                        const currentIdx = playableEpisodes.findIndex((e) => e.number === currentEpNum);
                        if (currentIdx > 0) {
                          selectEpisode(playableEpisodes[currentIdx - 1].number);
                        }
                      }}
                      className="h-7 px-2 sm:px-2.5 flex items-center gap-1 rounded border border-white/10 bg-white/5 text-xs font-semibold text-zinc-300 hover:bg-white/10 hover:text-white disabled:opacity-30 disabled:pointer-events-none transition-colors"
                      title="Previous Episode"
                    >
                      <ChevronLeft className="h-3.5 w-3.5 shrink-0" />
                      <span className="hidden xs:inline">Prev</span>
                    </button>

                    <div className="h-7 px-2 sm:px-2.5 flex items-center justify-center rounded bg-white/[0.04] border border-white/10 text-center">
                      <span className="text-xs font-mono font-bold text-zinc-200 whitespace-nowrap">
                        EP {currentEpNum} <span className="text-zinc-600 font-normal">/</span> {playableEpisodes.length || anime.episodes || "?"}
                      </span>
                    </div>

                    <button
                      disabled={
                        playableEpisodes.length === 0 ||
                        currentEpNum >= (playableEpisodes[playableEpisodes.length - 1]?.number || currentEpNum)
                      }
                      onClick={() => {
                        const currentIdx = playableEpisodes.findIndex((e) => e.number === currentEpNum);
                        if (currentIdx !== -1 && currentIdx < playableEpisodes.length - 1) {
                          selectEpisode(playableEpisodes[currentIdx + 1].number);
                        }
                      }}
                      className="h-7 px-2 sm:px-2.5 flex items-center gap-1 rounded bg-[var(--accent)] hover:brightness-110 text-white font-semibold text-xs transition-all disabled:opacity-30 disabled:pointer-events-none shadow-sm"
                      title="Next Episode"
                    >
                      <span className="hidden xs:inline">Next</span>
                      <ChevronRight className="h-3.5 w-3.5 shrink-0" />
                    </button>
                  </div>

                  <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                    {/* Stream / Embed Mode Switcher */}
                    {hasEmbed ? (
                      <div className="h-7 flex items-center rounded bg-white/5 border border-white/10 p-0.5 shrink-0">
                        <button
                          onClick={() => setPlayerMode("stream")}
                          className={`h-full rounded px-2 text-xs font-semibold flex items-center gap-1 transition-all ${
                            playerMode === "stream"
                              ? "bg-[var(--accent)] text-white shadow-sm"
                              : "text-zinc-400 hover:text-white"
                          }`}
                          title="Fast Direct HLS Stream"
                        >
                          <Zap className="h-3 w-3 text-amber-400 shrink-0" />
                          <span className="hidden sm:inline">Stream</span>
                        </button>
                        <button
                          onClick={() => setPlayerMode("embed")}
                          className={`h-full rounded px-2 text-xs font-semibold flex items-center gap-1 transition-all ${
                            playerMode === "embed"
                              ? "bg-[var(--accent)] text-white shadow-sm"
                              : "text-zinc-400 hover:text-white"
                          }`}
                          title="Embedded Video Player"
                        >
                          <Layers className="h-3 w-3 shrink-0" />
                          <span className="hidden sm:inline">Embed</span>
                        </button>
                      </div>
                    ) : (
                      <div className="h-7 hidden sm:flex items-center gap-1 px-2.5 rounded border border-white/10 bg-white/5 text-xs font-medium text-zinc-400 select-none shrink-0">
                        <Zap className="h-3.5 w-3.5 text-amber-400 shrink-0" />
                        <span>Fast Stream</span>
                      </div>
                    )}

                    <div className="h-4 w-px bg-white/10 hidden xl:block mx-0.5 shrink-0" />

                    {/* SUB / DUB Toggle */}
                    <div className="h-7 flex items-center rounded bg-white/5 border border-white/10 p-0.5 shrink-0">
                      <button
                        onClick={() => setAudio("sub")}
                        className={`h-full rounded px-2 sm:px-2.5 text-xs font-bold transition-all flex items-center justify-center ${
                          audio === "sub"
                            ? "bg-[var(--accent)] text-white shadow-sm"
                            : "text-zinc-400 hover:text-white"
                        }`}
                      >
                        SUB
                      </button>
                      <button
                        disabled={dubAvailable === false}
                        onClick={() => dubAvailable !== false && setAudio("dub")}
                        title={dubAvailable === false ? "DUB not available for this anime" : "Switch to English DUB"}
                        className={`h-full rounded px-2 sm:px-2.5 text-xs font-bold transition-all flex items-center justify-center ${
                          dubAvailable === false
                            ? "opacity-30 cursor-not-allowed text-zinc-500 line-through"
                            : audio === "dub"
                            ? "bg-[var(--accent)] text-white shadow-sm"
                            : "text-zinc-400 hover:text-white"
                        }`}
                      >
                        DUB
                      </button>
                    </div>
                  </div>
                </div>

                {/* Deck 2 (Right on Desktop, Row 2 on Mobile): Server, Automations & Reload */}
                <div className="flex items-center justify-between xl:justify-end gap-1.5 sm:gap-2 w-full xl:w-auto">
                  {/* Custom Extraction Server Dropdown */}
                  <div ref={serverDropdownRef} className="relative shrink-0">
                    <button
                      type="button"
                      onClick={() => setShowServerDropdown((prev) => !prev)}
                      className={`h-7 flex items-center gap-1.5 rounded border px-2 sm:px-2.5 text-xs font-semibold transition-all select-none ${
                        showServerDropdown
                          ? "bg-white/15 border-white/30 text-white shadow-sm ring-1 ring-[var(--accent)]/40"
                          : "border-white/10 bg-black/60 text-zinc-200 hover:text-white hover:bg-white/10"
                      }`}
                      title="Change Extraction Server"
                      aria-expanded={showServerDropdown}
                    >
                      <Server className="h-3 w-3 text-amber-400 shrink-0" />
                      <span className="truncate max-w-[85px] xs:max-w-[110px] sm:max-w-[135px]">
                        {EXTRACTION_PROVIDERS.find((p) => p.id === provider)?.name || PROVIDER_NAMES[provider] || provider}
                      </span>
                      <ChevronDown
                        className={`h-3 w-3 text-zinc-400 shrink-0 transition-transform duration-200 ${
                          showServerDropdown ? "rotate-180 text-white" : ""
                        }`}
                      />
                    </button>

                    {showServerDropdown && (
                      <div
                        className={`absolute left-0 xl:left-auto xl:right-0 ${
                          dropdownDirection === "up" ? "bottom-full mb-1.5" : "top-full mt-1.5"
                        } w-52 max-h-64 overflow-y-auto scrollbar-thin rounded-lg bg-[#141419]/95 border border-white/20 p-1.5 z-[100] space-y-0.5 shadow-2xl backdrop-blur-md`}
                      >
                        <div className="flex items-center justify-between px-2 py-1 border-b border-white/10 sticky top-0 bg-[#141419]/95 backdrop-blur-md z-10">
                          <span className="text-[10px] uppercase font-bold text-zinc-400">
                            Extraction Server
                          </span>
                          <span className="text-[9px] font-mono text-zinc-500">
                            {EXTRACTION_PROVIDERS.length} Available
                          </span>
                        </div>

                        <div className="pt-1 space-y-0.5">
                          {EXTRACTION_PROVIDERS.map((p) => {
                            const isSelected = provider === p.id;
                            const isWinner = streamResult?.provider === p.id;
                            return (
                              <button
                                key={p.id}
                                type="button"
                                onClick={() => {
                                  setProvider(p.id);
                                  setShowServerDropdown(false);
                                }}
                                className={`flex w-full items-center justify-between px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors ${
                                  isSelected
                                    ? "bg-[var(--accent)] text-white font-bold shadow-sm"
                                    : "text-zinc-300 hover:bg-white/10 hover:text-white"
                                }`}
                              >
                                <div className="flex items-center gap-1.5 truncate">
                                  <span className="truncate">{p.name}</span>
                                  {p.id === "auto" && (
                                    <span
                                      className={`text-[9px] px-1 py-0.5 rounded font-mono ${
                                        isSelected
                                          ? "bg-white/20 text-white"
                                          : "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                                      }`}
                                    >
                                      Fastest
                                    </span>
                                  )}
                                  {isWinner && p.id !== "auto" && (
                                    <span
                                      className={`text-[9px] px-1 py-0.5 rounded font-mono ${
                                        isSelected
                                          ? "bg-white/20 text-white"
                                          : "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                                      }`}
                                    >
                                      Active
                                    </span>
                                  )}
                                </div>
                                {isSelected && <Check className="h-3.5 w-3.5 shrink-0 ml-1.5 text-white" />}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Won Provider Indicator */}
                  {streamResult?.provider && (
                    <div className="h-7 hidden xl:flex items-center px-2 font-mono text-[10px] text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded font-semibold shrink-0">
                      Won: {PROVIDER_NAMES[streamResult.provider] || streamResult.provider}
                    </div>
                  )}

                  <div className="h-4 w-px bg-white/10 hidden xl:block mx-0.5 shrink-0" />

                  {/* Automation Toggles & Reload */}
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => handleAutoToggle("autoNext")}
                      className={`h-7 px-2 sm:px-2.5 flex items-center rounded text-[11px] sm:text-xs font-bold transition-all ${
                        autoNext
                          ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm"
                          : "border border-white/10 bg-white/5 text-zinc-400 hover:text-white"
                      }`}
                      title="Toggle Auto-Play Next Episode"
                    >
                      <span className="hidden xs:inline">Auto-</span>Next
                    </button>
                    <button
                      onClick={() => handleAutoToggle("autoSkipIntro")}
                      className={`h-7 px-2 sm:px-2.5 flex items-center rounded text-[11px] sm:text-xs font-bold transition-all ${
                        autoSkipIntro
                          ? "bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm"
                          : "border border-white/10 bg-white/5 text-zinc-400 hover:text-white"
                      }`}
                      title="Skip Opening Credits (+85s)"
                    >
                      <span className="hidden sm:inline">Auto-</span>Skip<span className="hidden sm:inline"> (+85s)</span><span className="sm:hidden"> 85s</span>
                    </button>

                    <button
                      onClick={() => fetchStream(currentEpNum, audio, provider)}
                      className="h-7 w-7 flex items-center justify-center rounded border border-white/10 bg-white/5 text-zinc-400 hover:text-white hover:bg-white/10 transition-colors shrink-0"
                      title="Reload Stream"
                    >
                      <RefreshCw className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Next Airing Countdown for releasing shows */}
              {nextEp && (
                <div className="flex items-center gap-1.5 rounded border border-emerald-500/30 bg-emerald-500/10 px-2 py-1 text-emerald-400 text-xs">
                  <Calendar className="h-3 w-3 shrink-0" />
                  <div>
                    <span className="font-bold">Next Episode #{nextEp.episode}</span> airs in{" "}
                    <span className="font-mono font-bold underline">
                      {formatTimeUntil(nextEp.timeUntilAiring)}
                    </span>
                    .
                  </div>
                </div>
              )}

              {/* Official Licensed Streaming Distributors */}
              {/* <div className="pt-1.5 border-t border-white/10 flex flex-wrap items-center justify-between gap-1.5">
                <div className="flex items-center gap-1 text-[11px] font-bold text-zinc-300 uppercase tracking-wider">
                  <ShieldCheck className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                  <span>Official Distributors:</span>
                </div>

                <div className="flex flex-wrap items-center gap-1">
                  {anime.streamingLinks && anime.streamingLinks.length > 0 ? (
                    anime.streamingLinks.map((link) => (
                      <a
                        key={link.id}
                        href={link.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="group inline-flex items-center gap-1 rounded border border-white/10 bg-white/[0.03] px-2 py-0.5 text-[11px] font-medium text-zinc-300 hover:border-[var(--accent)] hover:text-white hover:bg-[var(--accent)]/10 transition-all"
                      >
                        <span className="font-semibold text-white group-hover:text-[var(--accent)]">{link.site}</span>
                        <ExternalLink className="h-2.5 w-2.5 text-zinc-500 group-hover:text-white shrink-0" />
                      </a>
                    ))
                  ) : (
                    <span className="text-[11px] text-zinc-500">
                      Check legal platforms like Crunchyroll, Netflix, or HIDIVE.
                    </span>
                  )}
                </div>
              </div> */}
            </div>

            {/* Anime Detail Overview Card (Placed right after controls section) */}
            <div className="rounded-md border border-white/10 bg-[#131318] p-3.5 sm:p-5 shadow-sm">
              <div className="flex flex-col sm:flex-row items-start gap-4 sm:gap-5">
                {/* Left: Poster Cover Image */}
                {posterUrl && (
                  <div className="relative w-28 sm:w-36 md:w-44 aspect-[2/3] shrink-0 overflow-hidden rounded-md border border-white/10 shadow-lg bg-black/40">
                    <Image
                      src={posterUrl}
                      alt={title}
                      fill
                      sizes="(max-width: 640px) 112px, 176px"
                      className="object-cover transition-transform duration-300 hover:scale-105"
                      priority
                    />
                  </div>
                )}

                {/* Right: Anime Details & Metadata */}
                <div className="flex-1 min-w-0 space-y-2.5">
                  {/* Title & Alternative Titles */}
                  <div>
                    <h2 className="text-lg sm:text-xl font-bold font-display text-white tracking-tight leading-snug">
                      {title}
                    </h2>
                    {alternativeTitles && (
                      <p className="text-xs text-zinc-400 italic line-clamp-1 mt-0.5" title={alternativeTitles}>
                        {alternativeTitles}
                      </p>
                    )}
                  </div>

                  {/* Quality, Audio & Rating Badges Row */}
                  <div className="flex flex-wrap items-center gap-1.5">
                    {/* Age / Content Rating */}
                    <span className="px-1.5 py-0.5 text-[10px] font-bold rounded border border-white/15 bg-white/5 text-zinc-300">
                      {anime.isAdult ? "18+" : "PG-13"}
                    </span>

                    {/* HD Quality Badge */}
                    <span className="px-1.5 py-0.5 text-[10px] font-bold rounded bg-amber-500/15 border border-amber-500/30 text-amber-400">
                      HD
                    </span>

                    {/* CC Closed Captions / Subtitles Badge */}
                    <span className="px-1.5 py-0.5 text-[10px] font-bold rounded bg-cyan-500/15 border border-cyan-500/30 text-cyan-400">
                      CC
                    </span>

                    {/* DUB Audio / Mic Badge */}
                    {dubAvailable !== false && (
                      <span className="px-1.5 py-0.5 text-[10px] font-bold rounded bg-indigo-500/15 border border-indigo-500/30 text-indigo-300 inline-flex items-center gap-1">
                        <Mic className="h-2.5 w-2.5" />
                        <span>DUB</span>
                      </span>
                    )}

                    {/* Score Badge */}
                    {scoreDisplay && (
                      <span className="px-1.5 py-0.5 text-[10px] font-bold rounded bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 inline-flex items-center gap-1">
                        <Star className="h-2.5 w-2.5 fill-current" />
                        <span>{scoreDisplay}</span>
                      </span>
                    )}
                  </div>

                  {/* Synopsis / Description with [more]/[less] toggle */}
                  {cleanDescription && (
                    <div className="text-xs sm:text-[13px] text-zinc-300 leading-relaxed">
                      <span>
                        {cleanDescription.length > 200 && !showFullDesc
                          ? `${cleanDescription.slice(0, 200)}...`
                          : cleanDescription}
                      </span>
                      {cleanDescription.length > 200 && (
                        <button
                          type="button"
                          onClick={() => setShowFullDesc((prev) => !prev)}
                          className="ml-1.5 text-[var(--accent)] hover:underline font-semibold text-xs cursor-pointer inline-block"
                        >
                          {showFullDesc ? "[less]" : "[more]"}
                        </button>
                      )}
                    </div>
                  )}

                  {/* 2-Column Metadata Grid matching user reference */}
                  <div className="pt-2 border-t border-white/10 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1.5 text-xs">
                    {/* Left Column */}
                    <div className="space-y-1.5">
                      <div className="flex items-baseline gap-1.5">
                        <span className="font-semibold text-zinc-400 shrink-0">Type:</span>
                        <span className="text-zinc-200 font-medium">{anime.format || "TV"}</span>
                      </div>

                      <div className="flex items-baseline gap-1.5">
                        <span className="font-semibold text-zinc-400 shrink-0">Premiered:</span>
                        <span className="text-zinc-200 font-medium">{premieredText}</span>
                      </div>

                      <div className="flex items-baseline gap-1.5">
                        <span className="font-semibold text-zinc-400 shrink-0">Aired:</span>
                        <span className="text-zinc-200">{airedDateText}</span>
                      </div>

                      <div className="flex items-baseline gap-1.5">
                        <span className="font-semibold text-zinc-400 shrink-0">Status:</span>
                        <span className={`font-medium ${anime.status === "RELEASING" ? "text-emerald-400" : "text-zinc-200"}`}>
                          {statusLabel}
                        </span>
                      </div>

                      {anime.genres && anime.genres.length > 0 && (
                        <div className="flex items-baseline gap-1.5">
                          <span className="font-semibold text-zinc-400 shrink-0">Genres:</span>
                          <span className="text-zinc-300">
                            {anime.genres.map((g, idx) => (
                              <React.Fragment key={g}>
                                <Link
                                  href={`/search?genre=${encodeURIComponent(g)}`}
                                  className="text-[var(--accent)] hover:underline font-medium"
                                >
                                  {g}
                                </Link>
                                {idx < anime.genres.length - 1 && ", "}
                              </React.Fragment>
                            ))}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Right Column */}
                    <div className="space-y-1.5">
                      <div className="flex items-baseline gap-1.5">
                        <span className="font-semibold text-zinc-400 shrink-0">MAL:</span>
                        <span className="text-zinc-200 font-medium">
                          {scoreDisplay ? scoreDisplay : "N/A"}
                        </span>
                      </div>

                      <div className="flex items-baseline gap-1.5">
                        <span className="font-semibold text-zinc-400 shrink-0">Duration:</span>
                        <span className="text-zinc-200">
                          {anime.duration ? `${anime.duration} min` : "? min"}
                        </span>
                      </div>

                      <div className="flex items-baseline gap-1.5">
                        <span className="font-semibold text-zinc-400 shrink-0">Episodes:</span>
                        <span className="text-zinc-200">
                          {anime.episodes ? `${anime.episodes}` : `${playableEpisodes.length || "?"}`}
                        </span>
                      </div>

                      <div className="flex items-baseline gap-1.5">
                        <span className="font-semibold text-zinc-400 shrink-0">Studios:</span>
                        <span className="text-zinc-200 truncate">{studioNames}</span>
                      </div>

                      <div className="flex items-baseline gap-1.5">
                        <span className="font-semibold text-zinc-400 shrink-0">Producers:</span>
                        <span className="text-zinc-200 truncate">{sourceName}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Episode Sidebar (1 col) - Only playable episodes */}
          <div className="space-y-3">
            <div className="rounded-md border border-white/10 bg-[#131318] p-4 shadow-sm">
              <div className="flex items-center justify-between pb-3 border-b border-white/10 mb-3">
                <h3 className="font-display font-bold text-xs sm:text-sm text-white">Episodes</h3>
                <span className="text-[11px] text-zinc-400">{playableEpisodes.length} Available</span>
              </div>

              {/* Episode list scroll area */}
              <div className="max-h-[520px] lg:max-h-[640px] xl:max-h-[720px] 2xl:max-h-[820px] overflow-y-auto space-y-1.5 pr-1 scrollbar-thin">
                {playableEpisodes.map((ep) => {
                  const isActive = ep.number === currentEpNum;
                  const isWatched = watchedProgress >= ep.number;
                  const previewImg = ep.thumbnail || anime.bannerImage || anime.coverImage?.large || anime.coverImage?.medium;

                  // Parse episode title and number cleanly
                  const rawTitle = (ep.title || "").trim();
                  let epName = rawTitle || `Episode ${ep.number}`;
                  let epNumLabel = `Episode ${ep.number}`;

                  const titleMatch = rawTitle.match(/^(?:Episode|EP)\s*(\d+)\s*[-–:.]\s*(.+)$/i);
                  if (titleMatch) {
                    const parsedNum = titleMatch[1];
                    const cleanTitle = titleMatch[2].trim();
                    epName = cleanTitle || `Episode ${parsedNum}`;
                    epNumLabel = `Episode ${parsedNum}`;
                  } else {
                    const onlyNumMatch = rawTitle.match(/^(?:Episode|EP)\s*(\d+)$/i);
                    if (onlyNumMatch) {
                      epName = `Episode ${onlyNumMatch[1]}`;
                      epNumLabel = `EP ${onlyNumMatch[1]}`;
                    }
                  }

                  return (
                    <button
                      key={ep.number}
                      onClick={() => selectEpisode(ep.number)}
                      className={`group flex w-full items-center gap-3 rounded-md p-2 text-left transition-all ${
                        isActive
                          ? "bg-[var(--accent)] text-white shadow-sm ring-1 ring-white/10"
                          : "border border-white/5 bg-white/[0.02] hover:bg-white/10 text-zinc-300"
                      }`}
                    >
                      {/* Left: Image */}
                      <div className="relative h-12 w-20 shrink-0 overflow-hidden rounded-md bg-zinc-800 border border-white/10">
                        {previewImg ? (
                          <Image
                            src={previewImg}
                            alt={epName}
                            fill
                            className="object-cover transition-transform duration-300 group-hover:scale-105"
                            sizes="80px"
                          />
                        ) : null}
                        {isActive ? (
                          <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                            <Play className="h-4 w-4 fill-white text-white drop-shadow" />
                          </div>
                        ) : (
                          <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Play className="h-3.5 w-3.5 fill-white text-white drop-shadow" />
                          </div>
                        )}
                      </div>

                      {/* Right: Divided Top (Episode Name) and Bottom (Episode Number) */}
                      <div className="flex-1 min-w-0 flex flex-col justify-center">
                        <p
                          title={epName}
                          className={`line-clamp-1 text-xs font-semibold leading-snug transition-colors ${
                            isActive ? "text-white" : "text-zinc-100 group-hover:text-white"
                          }`}
                        >
                          {epName}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          <span
                            className={`text-[11px] font-medium font-mono ${
                              isActive ? "text-white/80" : "text-zinc-400 group-hover:text-zinc-300"
                            }`}
                          >
                            {epNumLabel}
                          </span>
                          {isWatched && (
                            <span
                              className={`inline-flex items-center gap-0.5 text-[10px] font-medium ${
                                isActive ? "text-white/90" : "text-emerald-400"
                              }`}
                            >
                              <Check className="h-2.5 w-2.5" /> Watched
                            </span>
                          )}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
