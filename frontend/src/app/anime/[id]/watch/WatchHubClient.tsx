"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  ChevronLeft,
  ChevronRight,
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
  Globe,
  Server,
  AlertTriangle,
  RefreshCw,
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

  // Automation options
  const [autoPlay, setAutoPlay] = useState(true);
  const [autoNext, setAutoNext] = useState(true);
  const [autoSkipIntro, setAutoSkipIntro] = useState(false);
  const [autoMarkWatched, setAutoMarkWatched] = useState(true);

  // Stream Extraction state
  const [streamResult, setStreamResult] = useState<StreamExtractionResult | null>(initialStream || null);
  const [isExtracting, setIsExtracting] = useState(!initialStream);
  const [extractError, setExtractError] = useState<string | null>(null);

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

  // Proactively check if DUB is available for this anime in background
  useEffect(() => {
    let isCancelled = false;
    async function checkDub() {
      try {
        const res = await api.extractEpisode(anime.id, 1, "dub");
        if (!isCancelled && res && res.streams && res.streams.length > 0) {
          setDubAvailable(true);
        }
      } catch (err: any) {
        if (!isCancelled) {
          const msg = err?.message || "";
          if (msg.toLowerCase().includes("dub") || msg.includes("404")) {
            setDubAvailable(false);
          }
        }
      }
    }
    if (anime.status !== "NOT_YET_RELEASED" && dubAvailable === null) {
      checkDub();
    }
    return () => {
      isCancelled = true;
    };
  }, [anime.id, anime.status, dubAvailable]);

  // Fetch real stream from backend extraction engine
  const fetchStream = useCallback(
    async (epNum: number, aud: "sub" | "dub", prov: string) => {
      setIsExtracting(true);
      setExtractError(null);
      setStreamResult(null);
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
      } catch (err: any) {
        const errMsg = err?.message || "";
        const isDubError = aud === "dub" || errMsg.toLowerCase().includes("dub");

        if (isDubError) {
          setDubAvailable(false);
          setAudio("sub");
          setDubNotification("English DUB is not available for this anime. Switched to SUB.");
          setTimeout(() => setDubNotification(null), 5000);
          try {
            const subRes = await api.extractEpisode(
              anime.id,
              epNum,
              "sub",
              prov === "auto" ? undefined : prov
            );
            setStreamResult(subRes);
            return;
          } catch (subErr: any) {
            setExtractError(subErr?.message || `No stream found for Episode ${epNum}.`);
          }
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
      <div className="w-full px-4 sm:px-6 md:px-8 lg:px-10 xl:px-12 py-5 sm:py-6 md:py-8 space-y-5 sm:space-y-6">
        {/* Top Header / Breadcrumb */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-3.5 sm:pb-4 w-full overflow-hidden">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 w-full sm:w-auto overflow-hidden">
            <Link
              href={`/anime/${anime.id}`}
              className="flex items-center gap-1.5 shrink-0 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold text-zinc-300 hover:bg-white/10 hover:text-white transition-colors"
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
              className={`flex-1 sm:flex-initial flex items-center justify-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
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
              className={`flex-1 sm:flex-initial flex items-center justify-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
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

            {/* Error Banner with Retry */}
            {extractError && (
              <div className="flex items-center justify-between gap-3 rounded-md border border-rose-500/30 bg-rose-500/10 p-4 text-xs text-rose-300">
                <div className="flex items-center gap-2.5">
                  <AlertTriangle className="h-4 w-4 shrink-0 text-rose-400" />
                  <span>{extractError}</span>
                </div>
                <div className="flex items-center gap-2">
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
              autoPlay={autoPlay}
              autoNext={autoNext}
              autoSkipIntro={autoSkipIntro}
              onAutoToggle={handleAutoToggle}
              onTimeUpdate={handleTimeUpdate}
              onEnded={handleEnded}
              isLoadingStreams={isExtracting}
              onRetry={() => fetchStream(currentEpNum, audio, provider)}
            />

            {/* Stream Options Control Bar: Audio, Server & Automation options */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 sm:gap-4 rounded-md border border-white/10 bg-[#131318] p-4 sm:p-5 text-xs w-full overflow-hidden shadow-sm">
              {/* 1. Audio Sub / Dub Selector */}
              <div className="space-y-1.5">
                <span className="font-bold text-white block text-[11px]">Audio Mode</span>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setAudio("sub")}
                    className={`flex items-center justify-center gap-1 rounded-lg py-2 text-xs font-bold transition-all ${
                      audio === "sub"
                        ? "bg-[var(--accent)] text-white shadow-sm"
                        : "border border-white/10 bg-white/5 text-zinc-400 hover:text-white hover:bg-white/10"
                    }`}
                  >
                    <span>SUB</span>
                  </button>
                  <button
                    disabled={dubAvailable === false}
                    onClick={() => dubAvailable !== false && setAudio("dub")}
                    title={dubAvailable === false ? "DUB not available for this anime" : "Switch to English DUB"}
                    className={`flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-bold transition-all ${
                      dubAvailable === false
                        ? "border border-white/5 bg-white/[0.02] text-zinc-500 opacity-35 cursor-not-allowed"
                        : audio === "dub"
                        ? "bg-[var(--accent)] text-white shadow-sm"
                        : "border border-white/10 bg-white/5 text-zinc-400 hover:text-white hover:bg-white/10"
                    }`}
                  >
                    <span>DUB</span>
                    {dubAvailable === false && (
                      <span className="text-[9px] font-normal text-zinc-500 lowercase">(n/a)</span>
                    )}
                  </button>
                </div>
              </div>

              {/* 2. Provider Server Selector */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-white text-[11px]">Extraction Server</span>
                  {streamResult?.provider && (
                    <span className="font-mono text-[10px] text-emerald-400 font-semibold">
                      Won: {PROVIDER_NAMES[streamResult.provider] || streamResult.provider}
                    </span>
                  )}
                </div>
                <select
                  value={provider}
                  onChange={(e) => setProvider(e.target.value)}
                  className="w-full rounded-lg border border-white/10 bg-black/60 px-3 py-2 text-xs font-semibold text-zinc-200 outline-none focus:border-[var(--accent)] transition-colors"
                >
                  {EXTRACTION_PROVIDERS.map((p) => (
                    <option key={p.id} value={p.id} className="bg-[#131318] text-white">
                      {p.id === "auto" ? p.name : `${p.name} (${p.detail})`}
                    </option>
                  ))}
                </select>
              </div>

              {/* 3. Automation Toggles */}
              <div className="space-y-1.5">
                <span className="font-bold text-white block text-[11px]">Automation</span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleAutoToggle("autoNext")}
                    className={`flex-1 rounded-lg py-2 text-xs font-bold transition-all ${
                      autoNext
                        ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                        : "border border-white/10 bg-white/5 text-zinc-400 hover:text-white"
                    }`}
                  >
                    Auto-Next
                  </button>
                  <button
                    onClick={() => handleAutoToggle("autoSkipIntro")}
                    className={`flex-1 rounded-lg py-2 text-xs font-bold transition-all ${
                      autoSkipIntro
                        ? "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                        : "border border-white/10 bg-white/5 text-zinc-400 hover:text-white"
                    }`}
                  >
                    Auto-Skip (+85s)
                  </button>
                </div>
              </div>
            </div>

            {/* Prev / Next Episode Bar */}
            <div className="flex items-center justify-between gap-2.5 rounded-md border border-white/10 bg-[#131318] p-2.5 sm:p-3 w-full overflow-hidden shadow-sm">
              <button
                disabled={playableEpisodes.length === 0 || currentEpNum <= (playableEpisodes[0]?.number || 1)}
                onClick={() => {
                  const currentIdx = playableEpisodes.findIndex((e) => e.number === currentEpNum);
                  if (currentIdx > 0) {
                    selectEpisode(playableEpisodes[currentIdx - 1].number);
                  }
                }}
                className="flex items-center justify-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 sm:px-4 py-2 text-xs font-semibold text-zinc-200 hover:bg-white/10 disabled:opacity-40 disabled:pointer-events-none transition-colors shrink-0 whitespace-nowrap"
              >
                <ChevronLeft className="h-4 w-4 shrink-0" />
                <span className="hidden sm:inline">Prev Episode</span>
                <span className="sm:hidden">Prev</span>
              </button>

              <div className="text-center px-2 min-w-0 overflow-hidden">
                <span className="text-xs font-mono font-bold text-zinc-300 whitespace-nowrap block truncate">
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
                className="flex items-center justify-center gap-1.5 rounded-lg bg-[var(--accent)] hover:brightness-110 text-white font-semibold text-xs px-3 sm:px-4 py-2 transition-all disabled:opacity-40 disabled:pointer-events-none shrink-0 whitespace-nowrap"
              >
                <span className="hidden sm:inline">Next Episode</span>
                <span className="sm:hidden">Next</span>
                <ChevronRight className="h-4 w-4 shrink-0" />
              </button>
            </div>

            {/* Next Airing Countdown for releasing shows */}
            {nextEp && (
              <div className="flex items-center gap-2.5 rounded-md border border-emerald-500/30 bg-emerald-500/10 p-2.5 sm:p-3 text-emerald-400">
                <Calendar className="h-4 w-4 shrink-0" />
                <div className="text-xs">
                  <span className="font-bold">Next Episode #{nextEp.episode}</span> will broadcast in{" "}
                  <span className="font-mono font-bold underline">
                    {formatTimeUntil(nextEp.timeUntilAiring)}
                  </span>
                  . Stay tuned!
                </div>
              </div>
            )}

            {/* Official Legal Partners */}
            <div className="rounded-md border border-white/10 bg-[#131318] p-3.5 sm:p-4 space-y-2.5">
              <div className="flex items-center gap-2 border-b border-white/10 pb-2">
                <ShieldCheck className="h-4 w-4 text-emerald-400" />
                <h3 className="font-display font-bold text-sm text-white">
                  Official Licensed Streaming Distributors
                </h3>
              </div>
              <p className="text-xs text-zinc-400">
                Support the creators by viewing licensed high-definition releases on official distribution platforms:
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 pt-2">
                {anime.streamingLinks && anime.streamingLinks.length > 0 ? (
                  anime.streamingLinks.map((link) => (
                    <a
                      key={link.id}
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group flex items-center justify-between rounded-md border border-white/10 bg-white/5 p-3.5 hover:border-[var(--accent)] hover:bg-[var(--accent)]/10 hover:shadow-glow transition-all"
                    >
                      <div>
                        <span className="text-xs font-bold text-white group-hover:text-[var(--accent)] block">
                          {link.site}
                        </span>
                        <span className="text-[10px] text-zinc-500">Official Partner</span>
                      </div>
                      <ExternalLink className="h-4 w-4 text-zinc-400 group-hover:text-white" />
                    </a>
                  ))
                ) : (
                  <div className="col-span-full py-4 text-xs text-zinc-500">
                    Check major legal anime distributors like Crunchyroll, Netflix, or HIDIVE for regional licensing availability.
                  </div>
                )}
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
                      className={`group flex w-full items-center gap-3 rounded-lg p-2 text-left transition-all ${
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
