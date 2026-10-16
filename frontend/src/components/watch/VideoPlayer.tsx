"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import Hls from "hls.js";
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize,
  Minimize,
  Settings,
  FastForward,
  RotateCcw,
  RotateCw,
  Subtitles as SubtitlesIcon,
  HelpCircle,
  Server,
  Layers,
  Sparkles,
  Zap,
  Globe,
  Sliders,
  Check,
  ChevronDown,
  RefreshCw,
  Radio,
  AlertTriangle,
  X,
} from "lucide-react";
import { ClassicAnimeLoader } from "@/components/ui/ClassicAnimeLoader";
import { formatDuration } from "@/lib/utils";
import { StreamSource, SubtitleTrack } from "@/types/anime";
import { PROVIDER_NAMES } from "@/lib/constants";

interface VideoPlayerProps {
  streams?: StreamSource[];
  subtitles?: SubtitleTrack[];
  animeTitle: string;
  episodeNumber: number;
  activeAudio: "sub" | "dub";
  onAudioChange: (audio: "sub" | "dub") => void;
  isDubAvailable?: boolean;
  activeProvider?: string;
  onProviderChange?: (provider: string) => void;
  availableProviders?: string[];
  playerMode?: "stream" | "embed";
  onPlayerModeChange?: (mode: "stream" | "embed") => void;
  hideTopBar?: boolean;
  autoPlay?: boolean;
  autoNext?: boolean;
  autoSkipIntro?: boolean;
  onAutoToggle?: (key: "autoPlay" | "autoNext" | "autoSkipIntro") => void;
  onTimeUpdate?: (currentTime: number, duration: number) => void;
  onEnded?: () => void;
  isLoadingStreams?: boolean;
  onRetry?: () => void;
}

export function VideoPlayer({
  streams = [],
  subtitles = [],
  animeTitle,
  episodeNumber,
  activeAudio,
  onAudioChange,
  isDubAvailable = true,
  activeProvider = "auto",
  onProviderChange,
  availableProviders = [],
  playerMode: propPlayerMode,
  onPlayerModeChange,
  hideTopBar = true,
  autoPlay = true,
  autoNext = true,
  autoSkipIntro = false,
  onAutoToggle,
  onTimeUpdate,
  onEnded,
  isLoadingStreams = false,
  onRetry,
}: VideoPlayerProps) {
  const [internalPlayerMode, setInternalPlayerMode] = useState<"stream" | "embed">(propPlayerMode || "stream");
  const playerMode = propPlayerMode !== undefined ? propPlayerMode : internalPlayerMode;
  const setPlayerMode = (mode: "stream" | "embed") => {
    setInternalPlayerMode(mode);
    onPlayerModeChange?.(mode);
  };

  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const dashRef = useRef<any>(null);

  // Selected stream index
  const [selectedStreamIdx, setSelectedStreamIdx] = useState(0);

  // Subtitle state
  const [selectedSubUrl, setSelectedSubUrl] = useState<string | null>(null);
  const [subOffset, setSubOffset] = useState<number>(0);
  const [subSize, setSubSize] = useState<"small" | "medium" | "large">("medium");

  // Player state
  const [isPlaying, setIsPlaying] = useState(false);
  const [isBuffering, setIsBuffering] = useState(false);
  const [bufferingDuration, setBufferingDuration] = useState<number>(0);
  const [hasFatalError, setHasFatalError] = useState(false);
  const [showTopServerMenu, setShowTopServerMenu] = useState(false);
  const topServerMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!showTopServerMenu) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (topServerMenuRef.current && !topServerMenuRef.current.contains(e.target as Node)) {
        setShowTopServerMenu(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showTopServerMenu]);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [levels, setLevels] = useState<string[]>([]);
  const [currentLevel, setCurrentLevel] = useState<number>(-1);

  // Volume Booster State (Web Audio API)
  const [volumeBoost, setVolumeBoost] = useState<number>(1); // 1.0 (100%) up to 3.0 (300%)
  const [boosterToast, setBoosterToast] = useState<number | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);
  const sourceNodeRef = useRef<MediaElementAudioSourceNode | null>(null);
  const boosterToastTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Timeline Scrubber & Buffer state
  const [bufferedTime, setBufferedTime] = useState(0);
  const [hoverTime, setHoverTime] = useState<number | null>(null);
  const [hoverPercent, setHoverPercent] = useState<number>(0);
  const timelineContainerRef = useRef<HTMLDivElement>(null);

  // Menu Popups
  const [activeMenu, setActiveMenu] = useState<"settings" | "subtitles" | "audio" | "servers" | "auto" | "booster" | null>(null);
  const activeMenuRef = useRef<HTMLDivElement>(null);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [controlsVisible, setControlsVisible] = useState(true);
  const [hasAutoSkipped, setHasAutoSkipped] = useState(false);
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const userPausedRef = useRef(false);
  const stallCountRef = useRef(0);
  const lastPlayTimeRef = useRef(-1);

  // Close active popup menu on outside click, touch, or Escape
  useEffect(() => {
    if (!activeMenu) return;

    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      if (
        activeMenuRef.current &&
        !activeMenuRef.current.contains(e.target as Node)
      ) {
        setActiveMenu(null);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        setActiveMenu(null);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("touchstart", handleClickOutside);
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [activeMenu]);

  const activeStream = streams[selectedStreamIdx] || streams[0];
  const activeEmbedUrl =
    activeStream?.embed ||
    (activeStream?.type === "embed" ? activeStream.url : null) ||
    streams.find((s) => s.embed)?.embed ||
    streams.find((s) => s.type === "embed")?.url ||
    null;

  // Auto select default subtitle (prefer English) on mount or subtitle list update
  useEffect(() => {
    if (subtitles && subtitles.length > 0 && selectedSubUrl === null) {
      const eng = subtitles.find(
        (s) =>
          s.lang?.toLowerCase().includes("en") ||
          s.language?.toLowerCase().includes("en") ||
          s.label?.toLowerCase().includes("english")
      );
      if (eng) {
        setSelectedSubUrl(eng.url);
      } else {
        setSelectedSubUrl(subtitles[0].url);
      }
    }
  }, [subtitles, selectedSubUrl]);

  const lastLoadedUrlRef = useRef<string | null>(null);

  // Attempt reliable autoplay with muted fallback if browser blocks unmuted playback
  const attemptAutoplay = useCallback((videoEl: HTMLVideoElement) => {
    if (!autoPlay) {
      setIsBuffering(false);
      return;
    }
    const playPromise = videoEl.play();
    if (playPromise !== undefined) {
      playPromise
        .then(() => {
          setIsPlaying(true);
          setIsBuffering(false);
          setHasFatalError(false);
        })
        .catch((err) => {
          // If browser policy blocked unmuted autoplay, attempt muted autoplay
          if (err?.name === "NotAllowedError" || err?.name === "SecurityError") {
            videoEl.muted = true;
            setIsMuted(true);
            videoEl
              .play()
              .then(() => {
                setIsPlaying(true);
                setIsBuffering(false);
                setHasFatalError(false);
              })
              .catch((err2) => {
                if (err2?.name !== "AbortError") {
                  console.warn("[VideoPlayer] Autoplay was prevented by browser policy:", err2);
                }
                setIsPlaying(false);
                setIsBuffering(false);
              });
          } else {
            setIsPlaying(false);
            setIsBuffering(false);
          }
        });
    } else {
      setIsBuffering(false);
    }
  }, [autoPlay]);

  // Safety watchdog: clear isBuffering after 4 seconds so the player is NEVER stuck
  useEffect(() => {
    if (isBuffering) {
      const timer = setTimeout(() => {
        setIsBuffering(false);
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [isBuffering]);

  const triedStreamsRef = useRef<Set<number>>(new Set());

  // Reset auto-skip, fatal error, and index on episode / stream list change
  useEffect(() => {
    setHasAutoSkipped(false);
    setHasFatalError(false);
    setIsBuffering(false);
    userPausedRef.current = false;
    stallCountRef.current = 0;
    lastPlayTimeRef.current = -1;
    triedStreamsRef.current.clear();
    lastLoadedUrlRef.current = null;

    if (streams && streams.length > 0) {
      const firstDirectIdx = streams.findIndex((s) => s.type !== "embed");
      if (firstDirectIdx !== -1) {
        setSelectedStreamIdx(firstDirectIdx);
        setPlayerMode("stream");
      } else {
        setSelectedStreamIdx(0);
        setPlayerMode("embed");
      }
    } else {
      setSelectedStreamIdx(0);
    }
  }, [episodeNumber, activeAudio, activeProvider, streams]);

  // Seamless auto-recovery when a stream fails, 404s, or freezes (only cycles direct streams)
  const handleAutoRecoverStream = useCallback(() => {
    triedStreamsRef.current.add(selectedStreamIdx);

    // 1. Advance to next untried DIRECT HLS stream if available
    if (streams && streams.length > 0) {
      const nextIdx = streams.findIndex(
        (s, idx) => idx > selectedStreamIdx && s.type !== "embed" && !triedStreamsRef.current.has(idx)
      );
      if (nextIdx !== -1) {
        console.log(`[VideoPlayer] Direct stream ${selectedStreamIdx} failed, auto-advancing to direct stream ${nextIdx}`);
        setSelectedStreamIdx(nextIdx);
        setHasFatalError(false);
        setIsBuffering(true);
        userPausedRef.current = false;
        stallCountRef.current = 0;
        lastPlayTimeRef.current = -1;
        return;
      }
    }

    // 2. DO NOT silently force user into adblocker-broken embed. Show recovery options.
    console.warn("[VideoPlayer] Direct stream playback stalled. Showing recovery overlay.");
    setHasFatalError(true);
    setIsBuffering(false);
  }, [streams, selectedStreamIdx]);

  // Active Playback Monitor & Stall Detector
  useEffect(() => {
    if (playerMode !== "stream" || isLoadingStreams || !streams || streams.length === 0) {
      stallCountRef.current = 0;
      lastPlayTimeRef.current = -1;
      return;
    }

    const interval = setInterval(() => {
      const video = videoRef.current;
      if (!video) return;

      // If video has loaded enough data to play, clear buffering state
      if (video.readyState >= 3 && isBuffering) {
        setIsBuffering(false);
      }

      // Only check stall if actively playing and unpaused
      if (!userPausedRef.current && !video.paused && isPlaying) {
        const current = video.currentTime;
        const isProgressing = lastPlayTimeRef.current >= 0 && current > lastPlayTimeRef.current;
        lastPlayTimeRef.current = current;

        if (!isProgressing || video.readyState < 2) {
          stallCountRef.current += 1;
          if (stallCountRef.current >= 15) {
            console.warn(`[VideoPlayer] Stream ${selectedStreamIdx} stalled for 15s during playback, attempting recovery...`);
            stallCountRef.current = 0;
            lastPlayTimeRef.current = -1;
            handleAutoRecoverStream();
            return;
          }
        } else {
          stallCountRef.current = 0;
          setHasFatalError(false);
          setIsBuffering(false);
        }
      } else {
        stallCountRef.current = 0;
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [playerMode, isLoadingStreams, streams, selectedStreamIdx, isBuffering, hasFatalError, isPlaying, handleAutoRecoverStream]);

  const handleRetryPlayback = () => {
    setHasFatalError(false);
    setIsBuffering(true);
    setBufferingDuration(0);
    userPausedRef.current = false;
    stallCountRef.current = 0;
    lastPlayTimeRef.current = -1;
    if (hlsRef.current) {
      try {
        hlsRef.current.destroy();
        hlsRef.current = null;
      } catch {}
    }
    if (dashRef.current) {
      try {
        dashRef.current.reset();
        dashRef.current = null;
      } catch {}
    }
    const video = videoRef.current;
    if (video) {
      video.load();
      attemptAutoplay(video);
    }
    onRetry?.();
  };

  const handleSwitchNextProvider = () => {
    if (!availableProviders || availableProviders.length <= 1) return;
    const currentIdx = availableProviders.indexOf(activeProvider || "auto");
    const nextIdx = (currentIdx + 1) % availableProviders.length;
    setHasFatalError(false);
    setIsBuffering(false);
    setBufferingDuration(0);
    onProviderChange?.(availableProviders[nextIdx]);
  };

  // Build proxied stream URL to bypass CORS and Referer restrictions
  const getPlayableStreamUrl = useCallback((stream: StreamSource | undefined) => {
    if (!stream || !stream.url) {
      return "https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8"; // CC Fallback
    }

    const streamUrl = stream.url;

    // Direct Cloudflare Worker origin: avoids routing large media streams through Netlify serverless functions which return 429
    const getWorkerBase = () => {
      if (typeof window !== "undefined") {
        const hostname = window.location.hostname;
        if (hostname.includes("netlify.app") || hostname.includes("vercel.app") || process.env.NODE_ENV === "production") {
          return "https://anime-api.neelofficial0812.workers.dev";
        }
      }
      const envBack = process.env.NEXT_PUBLIC_BACKEND_URL?.replace(/\/api\/v1\/?$/, "");
      return envBack && !envBack.includes("127.0.0.1") && !envBack.includes("localhost")
        ? envBack
        : "https://anime-api.neelofficial0812.workers.dev";
    };

    const workerBase = getWorkerBase();

    // If it's already a proxied URL, ensure it points directly to Cloudflare Worker to avoid Netlify function 429 rate limits
    if (streamUrl.startsWith("/proxy_m3u8") || streamUrl.includes("/proxy_m3u8")) {
      return streamUrl.startsWith("/") ? `${workerBase}${streamUrl}` : streamUrl;
    }

    const targetUrl = (stream as any).rawUrl || streamUrl;
    const isM3U8 = targetUrl.includes(".m3u8") || stream.type === "hls" || stream.isM3U8;

    if (isM3U8) {
      return `${workerBase}/proxy_m3u8?url=${encodeURIComponent(targetUrl)}&referer=${encodeURIComponent(stream.referer || "")}&audio=${activeAudio}`;
    }

    if (streamUrl.startsWith("/proxy_segment") || streamUrl.includes("/proxy_segment")) {
      return streamUrl.startsWith("/") ? `${workerBase}${streamUrl}` : streamUrl;
    }

    if (targetUrl.startsWith("http://") || targetUrl.startsWith("https://")) {
      return `${workerBase}/proxy_segment?url=${encodeURIComponent(targetUrl)}&referer=${encodeURIComponent(stream.referer || "")}&audio=${activeAudio}`;
    }

    return streamUrl;
  }, [activeAudio]);

  // Stop and cleanup when stream extraction starts or streams are empty
  useEffect(() => {
    if (isLoadingStreams || !streams || streams.length === 0) {
      if (hlsRef.current) {
        try {
          hlsRef.current.stopLoad();
          hlsRef.current.destroy();
        } catch {}
        hlsRef.current = null;
      }
      if (dashRef.current) {
        try {
          dashRef.current.reset();
        } catch {}
        dashRef.current = null;
      }
      if (videoRef.current) {
        try {
          videoRef.current.pause();
        } catch {}
      }
      lastLoadedUrlRef.current = null;
      setIsPlaying(false);
      setIsBuffering(false);
      setCurrentTime(0);
    }
  }, [isLoadingStreams, streams?.length]);

  // Initialize or re-attach Hls / MP4
  useEffect(() => {
    if (playerMode !== "stream") return;
    if (isLoadingStreams || !streams || streams.length === 0) return;

    const video = videoRef.current;
    if (!video) return;

    let currentStream = streams[selectedStreamIdx];
    if (!currentStream || currentStream.type === "embed") {
      const firstDirectIdx = streams.findIndex((s) => s.type !== "embed");
      if (firstDirectIdx !== -1) {
        setSelectedStreamIdx(firstDirectIdx);
        currentStream = streams[firstDirectIdx];
      } else {
        if (activeEmbedUrl) {
          setPlayerMode("embed");
          setHasFatalError(false);
          setIsBuffering(false);
          return;
        }
        setHasFatalError(true);
        setIsBuffering(false);
        return;
      }
    }

    const playableUrl = getPlayableStreamUrl(currentStream);
    if (!playableUrl) return;

    // Prevent destroying active playback if this exact URL is already playing
    if (lastLoadedUrlRef.current === playableUrl && (hlsRef.current || video.src)) {
      return;
    }
    lastLoadedUrlRef.current = playableUrl;

    if (hlsRef.current) {
      try {
        hlsRef.current.destroy();
      } catch {}
      hlsRef.current = null;
    }
    if (dashRef.current) {
      try {
        dashRef.current.reset();
      } catch {}
      dashRef.current = null;
    }

    // Reset playback tracker for new stream
    stallCountRef.current = 0;
    lastPlayTimeRef.current = -1;
    setIsBuffering(true);
    const isM3U8 = playableUrl.includes("proxy_m3u8") || playableUrl.includes(".m3u8") || currentStream?.type === "hls";
    const isMPD = playableUrl.includes(".mpd") || currentStream?.type === "dash";

    if (isM3U8 && Hls.isSupported()) {
      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: false,
        backBufferLength: 90,
        maxBufferLength: 30,
        maxMaxBufferLength: 60,
        maxBufferSize: 60 * 1000 * 1000,
        maxBufferHole: 0.5,
        fragLoadingTimeOut: 20000,
        fragLoadingMaxRetry: 6,
        fragLoadingRetryDelay: 1000,
        fragLoadingMaxRetryTimeout: 64000,
        manifestLoadingTimeOut: 20000,
        manifestLoadingMaxRetry: 5,
        manifestLoadingRetryDelay: 1000,
        levelLoadingTimeOut: 20000,
      });
      hlsRef.current = hls;

      hls.loadSource(playableUrl);
      hls.attachMedia(video);

      hls.on(Hls.Events.MANIFEST_PARSED, (event, data) => {
        const qualityLevels = data.levels.map((l) => `${l.height}p`);
        setLevels(["Auto", ...qualityLevels]);
        if (autoPlay && !userPausedRef.current) {
          attemptAutoplay(video);
        } else {
          setIsBuffering(false);
        }
      });

      hls.on(Hls.Events.LEVEL_SWITCHED, (event, data) => {
        setCurrentLevel(data.level);
      });

      hls.on(Hls.Events.BUFFER_APPENDED, () => {
        setIsBuffering(false);
        setHasFatalError(false);
      });

      hls.on(Hls.Events.FRAG_BUFFERED, () => {
        setIsBuffering(false);
        setHasFatalError(false);
      });

      let netRetries = 0;
      hls.on(Hls.Events.ERROR, (event, data) => {
        if (data.details === Hls.ErrorDetails.BUFFER_STALLED_ERROR) {
          setIsBuffering(true);
          try {
            hls.startLoad();
          } catch {}
          return;
        }

        if (data.fatal) {
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              netRetries++;
              if (netRetries <= 3) {
                console.warn(`[VideoPlayer] HLS network error, retrying (${netRetries}/3)...`);
                setTimeout(() => {
                  try {
                    hls.startLoad();
                  } catch {}
                }, 800);
              } else {
                hls.destroy();
                handleAutoRecoverStream();
              }
              break;
            case Hls.ErrorTypes.MEDIA_ERROR:
              hls.recoverMediaError();
              break;
            default:
              hls.destroy();
              handleAutoRecoverStream();
              break;
          }
        }
      });

      return () => {
        try {
          hls.destroy();
        } catch {}
      };
    } else if (isMPD) {
      import("dashjs").then((dashModule) => {
        const dashjs = (dashModule as any).default || dashModule;
        const player = dashjs.MediaPlayer().create();
        dashRef.current = player;
        player.initialize(video, playableUrl, false);
        player.on(dashjs.MediaPlayer.events.STREAM_INITIALIZED, () => {
          setIsBuffering(false);
          setHasFatalError(false);
          if (autoPlay && !userPausedRef.current) {
            attemptAutoplay(video);
          }
        });
        player.on(dashjs.MediaPlayer.events.ERROR, () => {
          console.warn("[VideoPlayer] DASH playback error, auto-recovering...");
          handleAutoRecoverStream();
        });
      }).catch(() => {
        handleAutoRecoverStream();
      });

      return () => {
        if (dashRef.current) {
          try {
            dashRef.current.reset();
          } catch {}
          dashRef.current = null;
        }
      };
    } else {
      video.src = playableUrl;
      video.load();

      const onCanPlay = () => {
        setIsBuffering(false);
        setHasFatalError(false);
        if (autoPlay && !userPausedRef.current) {
          attemptAutoplay(video);
        }
      };

      const onVideoError = () => {
        console.warn("[VideoPlayer] Direct video playback error, auto-recovering...");
        handleAutoRecoverStream();
      };

      video.addEventListener("canplay", onCanPlay, { once: true });
      video.addEventListener("error", onVideoError, { once: true });

      if (video.readyState >= 2) {
        onCanPlay();
      }

      return () => {
        video.removeEventListener("canplay", onCanPlay);
        video.removeEventListener("error", onVideoError);
      };
    }
  }, [streams, selectedStreamIdx, playerMode, autoPlay, getPlayableStreamUrl, handleAutoRecoverStream, attemptAutoplay]);

  // Auto skip intro handling
  useEffect(() => {
    if (autoSkipIntro && !hasAutoSkipped && currentTime > 0.5 && currentTime < 5 && duration > 120) {
      skipTime(85);
      setHasAutoSkipped(true);
    }
  }, [autoSkipIntro, hasAutoSkipped, currentTime, duration]);

  // Controls auto-hide
  const handleMouseMove = () => {
    setControlsVisible(true);
    if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    controlsTimeoutRef.current = setTimeout(() => {
      if (isPlaying && !activeMenu) setControlsVisible(false);
    }, 3500);
  };

  // Web Audio API Booster Engine
  const initAudioBooster = useCallback(() => {
    if (typeof window === "undefined") return;
    const video = videoRef.current;
    if (!video) return;

    try {
      if (!audioCtxRef.current) {
        const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        if (!AudioCtx) return;
        const ctx = new AudioCtx();
        const gain = ctx.createGain();
        gain.gain.value = volumeBoost;

        if (!sourceNodeRef.current) {
          const source = ctx.createMediaElementSource(video);
          source.connect(gain);
          gain.connect(ctx.destination);
          sourceNodeRef.current = source;
        }

        gainNodeRef.current = gain;
        audioCtxRef.current = ctx;
      }

      if (audioCtxRef.current && audioCtxRef.current.state === "suspended") {
        audioCtxRef.current.resume().catch(() => {});
      }
    } catch (err) {
      console.warn("Volume booster AudioContext init error:", err);
    }
  }, [volumeBoost]);

  const applyVolumeBoost = useCallback(
    (multiplier: number) => {
      initAudioBooster();
      const clamped = Math.max(1, Math.min(Number(multiplier.toFixed(2)), 3.0));
      setVolumeBoost(clamped);

      if (gainNodeRef.current && audioCtxRef.current) {
        try {
          gainNodeRef.current.gain.setTargetAtTime(
            clamped,
            audioCtxRef.current.currentTime,
            0.03
          );
        } catch {
          gainNodeRef.current.gain.value = clamped;
        }
      }

      // Display anime-themed HUD Toast notification
      setBoosterToast(Math.round(clamped * 100));
      if (boosterToastTimeoutRef.current) clearTimeout(boosterToastTimeoutRef.current);
      boosterToastTimeoutRef.current = setTimeout(() => {
        setBoosterToast(null);
      }, 1400);
    },
    [initAudioBooster]
  );

  const cycleVolumeBoost = useCallback(() => {
    const BOOST_PRESETS = [1, 1.5, 2, 2.5, 3];
    const currentIdx = BOOST_PRESETS.findIndex((b) => Math.abs(b - volumeBoost) < 0.08);
    const nextIdx = currentIdx === -1 ? 1 : (currentIdx + 1) % BOOST_PRESETS.length;
    applyVolumeBoost(BOOST_PRESETS[nextIdx]);
  }, [volumeBoost, applyVolumeBoost]);

  // Audio Context cleanup
  useEffect(() => {
    return () => {
      if (boosterToastTimeoutRef.current) clearTimeout(boosterToastTimeoutRef.current);
      if (audioCtxRef.current && audioCtxRef.current.state !== "closed") {
        audioCtxRef.current.close().catch(() => {});
      }
    };
  }, []);

  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) return;

    if (audioCtxRef.current && audioCtxRef.current.state === "suspended") {
      audioCtxRef.current.resume().catch(() => {});
    }

    if (video.paused) {
      userPausedRef.current = false;
      const playPromise = video.play();
      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            setIsPlaying(true);
            setIsBuffering(false);
          })
          .catch((err) => {
            console.warn("[VideoPlayer] Play interrupted or blocked, trying muted:", err);
            video.muted = true;
            setIsMuted(true);
            video
              .play()
              .then(() => {
                setIsPlaying(true);
                setIsBuffering(false);
              })
              .catch(() => {
                setIsPlaying(false);
              });
          });
      }
    } else {
      userPausedRef.current = true;
      video.pause();
      setIsPlaying(false);
      setIsBuffering(false);
    }
  };

  const updateBuffered = () => {
    const video = videoRef.current;
    if (!video || !video.buffered || video.buffered.length === 0) return;
    try {
      for (let i = video.buffered.length - 1; i >= 0; i--) {
        if (video.buffered.start(i) <= video.currentTime) {
          setBufferedTime(video.buffered.end(i));
          break;
        }
      }
    } catch {}
  };

  const handleTimeUpdate = () => {
    const video = videoRef.current;
    if (!video) return;
    setCurrentTime(video.currentTime);
    const d = video.duration || 0;
    setDuration(d);
    onTimeUpdate?.(video.currentTime, d);
    updateBuffered();
    if (!isPlaying && !video.paused && video.readyState >= 2) {
      setIsPlaying(true);
    }
    if (isBuffering && video.currentTime > 0) {
      setIsBuffering(false);
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const video = videoRef.current;
    if (!video) return;
    const time = parseFloat(e.target.value);
    video.currentTime = time;
    setCurrentTime(time);
  };

  const handleTimelineMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!timelineContainerRef.current || duration <= 0) return;
    const rect = timelineContainerRef.current.getBoundingClientRect();
    const pos = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    setHoverPercent(pos * 100);
    setHoverTime(pos * duration);
  };

  const handleTimelineMouseLeave = () => {
    setHoverTime(null);
  };

  const handleTimelineClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!timelineContainerRef.current || !videoRef.current || duration <= 0) return;
    const rect = timelineContainerRef.current.getBoundingClientRect();
    const pos = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const targetTime = pos * duration;
    videoRef.current.currentTime = targetTime;
    setCurrentTime(targetTime);
  };

  const toggleMute = () => {
    const video = videoRef.current;
    if (!video) return;
    video.muted = !isMuted;
    setIsMuted(!isMuted);
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const video = videoRef.current;
    if (!video) return;

    if (audioCtxRef.current && audioCtxRef.current.state === "suspended") {
      audioCtxRef.current.resume().catch(() => {});
    }

    const val = parseFloat(e.target.value);
    video.volume = val;
    setVolume(val);
    setIsMuted(val === 0);
  };

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  const changeSpeed = (speed: number) => {
    if (videoRef.current) {
      videoRef.current.playbackRate = speed;
      setPlaybackSpeed(speed);
      setActiveMenu(null);
    }
  };

  const changeQuality = (levelIdx: number) => {
    if (hlsRef.current) {
      hlsRef.current.currentLevel = levelIdx; // -1 for auto
      setCurrentLevel(levelIdx);
      setActiveMenu(null);
    }
  };

  const skipTime = (seconds: number) => {
    if (videoRef.current) {
      videoRef.current.currentTime = Math.max(0, Math.min(videoRef.current.currentTime + seconds, duration));
    }
  };

  // Keyboard Shortcuts Listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (["INPUT", "TEXTAREA"].includes((e.target as HTMLElement)?.tagName)) return;

      if (e.key === "Escape") {
        if (activeMenu) {
          e.preventDefault();
          setActiveMenu(null);
        }
        if (showShortcuts) {
          e.preventDefault();
          setShowShortcuts(false);
        }
        if (showTopServerMenu) {
          e.preventDefault();
          setShowTopServerMenu(false);
        }
        return;
      }

      if (e.code === "Space") {
        e.preventDefault();
        togglePlay();
      } else if (e.key === "f" || e.key === "F") {
        e.preventDefault();
        toggleFullscreen();
      } else if (e.key === "m" || e.key === "M") {
        e.preventDefault();
        toggleMute();
      } else if (e.key === "b" || e.key === "B") {
        e.preventDefault();
        cycleVolumeBoost();
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        skipTime(10);
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        skipTime(-10);
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        if (e.shiftKey) {
          applyVolumeBoost(Math.min(3, volumeBoost + 0.25));
        } else if (videoRef.current) {
          const newVol = Math.min(1, volume + 0.1);
          videoRef.current.volume = newVol;
          setVolume(newVol);
        }
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        if (e.shiftKey) {
          applyVolumeBoost(Math.max(1, volumeBoost - 0.25));
        } else if (videoRef.current) {
          const newVol = Math.max(0, volume - 0.1);
          videoRef.current.volume = newVol;
          setVolume(newVol);
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isPlaying, volume, isMuted, duration, volumeBoost, cycleVolumeBoost, applyVolumeBoost]);

  // Selected subtitle object
  const currentSub = subtitles.find((s) => s.url === selectedSubUrl);
  const proxiedSubtitleUrl = selectedSubUrl
    ? `${typeof window !== "undefined" && (window.location.hostname.includes("netlify.app") || window.location.hostname.includes("vercel.app") || process.env.NODE_ENV === "production") ? "https://anime-api.neelofficial0812.workers.dev" : ""}/proxy_subtitle?url=${encodeURIComponent(selectedSubUrl)}&offset=${subOffset}&speed=1.0`
    : null;

  return (
    <div className={`space-y-2 sub-size-${subSize}`}>
      {/* Top Controls Header Bar - Optional, hidden by default when unified below player */}
      {!hideTopBar && (
        <div className="relative z-30 flex items-center justify-between gap-1.5 sm:gap-2 bg-[#131318] border border-white/10 rounded-md p-1.5 sm:p-2">
          {/* Left: Mode Buttons (Stream, Embed) */}
          <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
            <button
              onClick={() => {
                setPlayerMode("stream");
                if (activeStream?.type === "embed") {
                  const streamIdx = streams.findIndex((s) => s.type !== "embed");
                  if (streamIdx !== -1) setSelectedStreamIdx(streamIdx);
                }
              }}
              className={`flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-semibold whitespace-nowrap transition-all ${
                playerMode === "stream"
                  ? "bg-[var(--accent)] text-white shadow-sm"
                  : "border border-white/10 bg-white/5 text-zinc-400 hover:text-white"
              }`}
            >
              <Zap className="h-3.5 w-3.5 text-amber-400 shrink-0" />
              <span>Fast Stream</span>
            </button>

            {activeEmbedUrl && (
              <button
                onClick={() => setPlayerMode("embed")}
                className={`flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-semibold whitespace-nowrap transition-all ${
                  playerMode === "embed"
                    ? "bg-[var(--accent)] text-white shadow-sm"
                    : "border border-white/10 bg-white/5 text-zinc-400 hover:text-white"
                }`}
              >
                <Layers className="h-3.5 w-3.5 shrink-0" />
                <span>Embed</span>
              </button>
            )}
          </div>

          {/* Right: Server Selector, Audio Selector, Refresh, Shortcuts */}
          <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
            {/* Server Selector Dropdown */}
            {availableProviders && availableProviders.length > 0 && (
              <div ref={topServerMenuRef} className="relative">
                <button
                  type="button"
                  onClick={() => setShowTopServerMenu(!showTopServerMenu)}
                  className={`flex items-center gap-1 rounded-md border px-2 py-1 text-xs font-semibold transition-all ${
                    showTopServerMenu
                      ? "bg-white/15 border-white/30 text-white shadow-sm"
                      : "bg-white/5 border-white/10 text-zinc-300 hover:text-white hover:bg-white/10"
                  }`}
                  title="Change Server"
                >
                  <Server className="h-3 w-3 text-amber-400 shrink-0" />
                  <span className="truncate max-w-[110px]">{PROVIDER_NAMES[activeProvider] || activeProvider || "SERVER"}</span>
                  <ChevronDown className={`h-3 w-3 text-zinc-400 shrink-0 transition-transform duration-200 ${showTopServerMenu ? "rotate-180 text-white" : ""}`} />
                </button>

                {showTopServerMenu && (
                  <div className="absolute right-0 top-full mt-1.5 w-48 max-h-72 overflow-y-auto scrollbar-thin rounded-md bg-[#18181f] border border-white/20 p-1.5 z-50 space-y-0.5 shadow-2xl backdrop-blur-md">
                    <span className="text-[10px] uppercase font-bold text-zinc-400 px-2 py-1 block border-b border-white/10 sticky top-0 bg-[#18181f] z-10">
                      Select Server
                    </span>
                    {availableProviders.map((prov) => (
                      <button
                        key={prov}
                        type="button"
                        onClick={() => {
                          onProviderChange?.(prov);
                          setShowTopServerMenu(false);
                        }}
                        className={`flex w-full items-center justify-between px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors ${
                          activeProvider === prov
                            ? "bg-[var(--accent)] text-white font-bold shadow-sm"
                            : "text-zinc-300 hover:bg-white/10 hover:text-white"
                        }`}
                      >
                        <span className="truncate">{PROVIDER_NAMES[prov] || prov}</span>
                        {activeProvider === prov && <Check className="h-3.5 w-3.5 shrink-0 ml-1.5 text-white" />}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Audio Sub / Dub Toggle */}
            <div className="flex items-center rounded-md bg-white/5 border border-white/10 p-0.5">
              <button
                onClick={() => onAudioChange("sub")}
                className={`rounded px-2 py-0.5 text-xs font-bold whitespace-nowrap transition-all ${
                  activeAudio === "sub"
                    ? "bg-[var(--accent)] text-white shadow-sm"
                    : "text-zinc-400 hover:text-white"
                }`}
              >
                SUB
              </button>
              <button
                disabled={isDubAvailable === false}
                onClick={() => isDubAvailable !== false && onAudioChange("dub")}
                title={isDubAvailable === false ? "DUB not available for this anime" : "Switch to English DUB"}
                className={`rounded px-2 py-0.5 text-xs font-bold whitespace-nowrap transition-all ${
                  isDubAvailable === false
                    ? "opacity-35 cursor-not-allowed text-zinc-500 line-through"
                    : activeAudio === "dub"
                    ? "bg-[var(--accent)] text-white shadow-sm"
                    : "text-zinc-400 hover:text-white"
                }`}
              >
                DUB
              </button>
            </div>

            {/* Quick Reload Video */}
            <button
              type="button"
              onClick={handleRetryPlayback}
              className="flex items-center gap-1 text-xs text-zinc-400 hover:text-white transition-colors p-1 rounded-md hover:bg-white/5"
              title="Reload Video Stream"
            >
              <RefreshCw className="h-3.5 w-3.5" />
            </button>

            {/* Shortcuts Help */}
            <button
              onClick={() => setShowShortcuts(!showShortcuts)}
              className="hidden sm:flex items-center gap-1 text-xs text-zinc-400 hover:text-white transition-colors p-1 rounded-md hover:bg-white/5"
              title="Keyboard Shortcuts"
            >
              <HelpCircle className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* Main Video Screen Container */}
      <div
        ref={containerRef}
        onMouseMove={handleMouseMove}
        onMouseLeave={() => isPlaying && !activeMenu && setControlsVisible(false)}
        className="group relative aspect-video w-full overflow-hidden rounded-md bg-black border border-white/10 select-none"
      >
        {/* Stream Extraction Loader - Sleek non-blocking loader */}
        {isLoadingStreams && (
          <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-black/50 backdrop-blur-[2px] pointer-events-none transition-opacity duration-200">
            <div className="h-10 w-10 rounded-full border-2 border-white/20 border-t-[var(--accent)] animate-spin" />
            <span className="mt-3 text-xs font-semibold text-zinc-200 tracking-wide">
              Connecting stream...
            </span>
          </div>
        )}

        {/* Buffering Indicator - Subtle non-blocking spinner (stream mode only when actively playing) */}
        {playerMode === "stream" && isBuffering && isPlaying && !isLoadingStreams && !hasFatalError && (
          <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-black/30 backdrop-blur-[1px] pointer-events-none transition-opacity duration-200">
            <div className="h-10 w-10 rounded-full border-2 border-white/20 border-t-[var(--accent)] animate-spin" />
            <span className="mt-2.5 text-[11px] font-semibold text-zinc-300">
              Buffering stream...
            </span>
          </div>
        )}

        {/* Fatal Error Indicator with Quick Actions (stream mode only) */}
        {playerMode === "stream" && hasFatalError && !isLoadingStreams && (
          <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-black/75 backdrop-blur-sm p-4 text-center pointer-events-auto">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-rose-500/15 text-rose-400 border border-rose-500/30 mb-2">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <span className="text-xs font-semibold text-zinc-200">
              Stream connection stalled or failed
            </span>
            <div className="mt-3.5 flex flex-wrap items-center justify-center gap-2 max-w-sm">
              <button
                type="button"
                onClick={handleRetryPlayback}
                className="flex items-center gap-1.5 rounded-md bg-white/10 hover:bg-white/20 text-white text-xs px-3 py-1.5 font-semibold transition-colors border border-white/10"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                <span>Retry Stream</span>
              </button>
              {availableProviders && availableProviders.length > 1 && (
                <button
                  type="button"
                  onClick={handleSwitchNextProvider}
                  className="flex items-center gap-1.5 rounded-md bg-[var(--accent)] hover:brightness-110 text-white text-xs px-3 py-1.5 font-bold transition-all"
                >
                  <Server className="h-3.5 w-3.5" />
                  <span>Try Next Server</span>
                </button>
              )}
              {activeEmbedUrl && (
                <button
                  type="button"
                  onClick={() => {
                    setPlayerMode("embed");
                    setIsBuffering(false);
                    setHasFatalError(false);
                  }}
                  className="flex items-center gap-1.5 rounded-md border border-white/15 bg-white/5 hover:bg-white/10 text-zinc-200 text-xs px-3 py-1.5 font-medium transition-colors"
                >
                  <Layers className="h-3.5 w-3.5 text-zinc-400" />
                  <span>Switch to Embed</span>
                </button>
              )}
            </div>
          </div>
        )}

        {/* Mode: Embed Fallback */}
        {playerMode === "embed" && activeEmbedUrl ? (
          <div className="relative h-full w-full">
            {/* Top helper banner for Embed player so user is NEVER stuck */}
            <div className="absolute top-2 left-2 right-2 z-20 flex items-center justify-between gap-2 bg-[#131318]/90 backdrop-blur-md border border-white/15 px-3 py-1.5 rounded-md text-xs">
              <span className="text-zinc-300 font-medium text-[11px] sm:text-xs truncate">
                External Embed Player (If buffering, switch back)
              </span>
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    setPlayerMode("stream");
                    setIsBuffering(false);
                    setHasFatalError(false);
                    const streamIdx = streams.findIndex((s) => s.type !== "embed");
                    if (streamIdx !== -1) {
                      setSelectedStreamIdx(streamIdx);
                    } else {
                      onRetry?.();
                    }
                  }}
                  className="flex items-center gap-1 rounded bg-[var(--accent)] hover:brightness-110 text-white font-bold px-2.5 py-1 text-[11px] transition-all cursor-pointer"
                >
                  <Zap className="h-3 w-3 text-amber-300" />
                  <span>Fast Stream</span>
                </button>
                {availableProviders && availableProviders.length > 1 && (
                  <button
                    type="button"
                    onClick={handleSwitchNextProvider}
                    className="flex items-center gap-1 rounded bg-white/10 hover:bg-white/20 text-zinc-200 font-medium px-2 py-1 text-[11px] transition-colors cursor-pointer"
                  >
                    <Server className="h-3 w-3" />
                    <span>Next Server</span>
                  </button>
                )}
              </div>
            </div>
            <iframe
              src={activeEmbedUrl}
              title={`${animeTitle} Episode ${episodeNumber}`}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
              allowFullScreen
              className="h-full w-full border-0"
            />
          </div>
        ) : (
          /* Mode: Native HLS / MP4 Player */
          <>
            <video
              ref={videoRef}
              onClick={togglePlay}
              onTimeUpdate={handleTimeUpdate}
              onProgress={updateBuffered}
              onPlaying={() => {
                setIsPlaying(true);
                setIsBuffering(false);
                setHasFatalError(false);
                stallCountRef.current = 0;
              }}
              onCanPlay={() => {
                setIsBuffering(false);
                setHasFatalError(false);
              }}
              onCanPlayThrough={() => {
                setIsBuffering(false);
                setHasFatalError(false);
              }}
              onLoadedData={() => {
                setIsBuffering(false);
                setHasFatalError(false);
              }}
              onSeeked={() => {
                setIsBuffering(false);
              }}
              onPause={() => {
                setIsPlaying(false);
                setIsBuffering(false);
              }}
              onWaiting={() => {
                setIsBuffering(true);
              }}
              onLoadedMetadata={(e) => {
                setDuration(e.currentTarget.duration || 0);
              }}
              onError={() => {
                const err = videoRef.current?.error;
                // Don't trigger recovery on benign aborts or when source is being switched
                if (err && err.code !== 1 && err.code !== 4) {
                  handleAutoRecoverStream();
                }
              }}
              onEnded={() => {
                setIsPlaying(false);
                setIsBuffering(false);
                if (autoNext) onEnded?.();
              }}
              crossOrigin="anonymous"
              playsInline
              className="h-full w-full object-contain cursor-pointer"
            >
              {proxiedSubtitleUrl && (
                <track
                  key={`${proxiedSubtitleUrl}-${subOffset}`}
                  kind="subtitles"
                  label={currentSub?.label || currentSub?.language || "English"}
                  srcLang={currentSub?.srclang || currentSub?.lang || "en"}
                  src={proxiedSubtitleUrl}
                  default
                />
              )}
            </video>

            {/* Custom On-Screen Player Controls */}
            <div
              className={`absolute inset-0 flex flex-col justify-between bg-gradient-to-t from-black/90 via-transparent to-black/60 p-4 transition-opacity duration-300 z-20 ${
                controlsVisible || !isPlaying || activeMenu || isBuffering || hasFatalError ? "opacity-100" : "opacity-0 pointer-events-none"
              }`}
            >
              {/* Top Bar inside Video: Title, Provider Badge, Skip Intro */}
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-display text-sm font-bold text-white">
                      {animeTitle}
                    </h3>
                    <span className="rounded-md bg-[var(--accent)]/30 border border-[var(--accent)]/50 px-2 py-0.5 text-[10px] font-bold text-white uppercase tracking-wider">
                      {activeAudio}
                    </span>
                    {activeStream?.server && (
                      <span className="rounded-md bg-white/10 px-2 py-0.5 text-[10px] font-mono text-zinc-300">
                        {activeStream.server}
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-zinc-400">Episode {episodeNumber}</span>
                </div>

                <div className="flex items-center gap-2">
                  {/* Skip Intro Button */}
                  <button
                    onClick={() => skipTime(85)}
                    className="rounded-md border border-white/20 bg-black/60 backdrop-blur-md px-3 py-1.5 text-xs font-semibold text-white hover:bg-white/20 transition-all flex items-center gap-1.5 active:scale-95"
                  >
                    <FastForward className="h-3.5 w-3.5 text-amber-400" />
                    <span>Skip Intro (+85s)</span>
                  </button>
                </div>
              </div>

              {/* Volume Booster Anime HUD Indicator Toast */}
              {boosterToast !== null && (
                <div className="absolute top-16 right-4 z-40 pointer-events-none transition-all duration-200">
                  <div className="flex items-center gap-2.5 rounded-md border border-amber-500/60 bg-black/90 backdrop-blur-md px-3 py-2 animate-in fade-in zoom-in-95">
                    <div className="flex h-7 w-7 items-center justify-center rounded-md bg-amber-500/20 text-amber-400 border border-amber-500/40">
                      <Zap className="h-4 w-4 fill-amber-400" />
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-amber-300">
                        Volume Booster
                      </span>
                      <div className="flex items-center gap-1.5 font-mono text-sm font-extrabold text-white">
                        <span>{boosterToast}%</span>
                        {boosterToast > 100 && (
                          <span className="text-[10px] px-1 py-0.2 rounded bg-amber-500 text-black font-black uppercase">
                            BOOST
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Big Center Play Button - Shown whenever video is not playing and stream is ready */}
              {!isPlaying && !isLoadingStreams && !hasFatalError && (
                <button
                  type="button"
                  onClick={togglePlay}
                  className="absolute inset-0 m-auto flex h-16 w-16 items-center justify-center rounded-full bg-[var(--accent)] hover:brightness-110 text-white transition-all transform hover:scale-110 active:scale-95 shadow-2xl z-30 cursor-pointer pointer-events-auto"
                  aria-label="Play video"
                >
                  <Play className="h-7 w-7 fill-white ml-1 text-white" />
                </button>
              )}

              {/* Bottom Controls Bar */}
              <div className="space-y-2">
                {/* Progress Timeline Scrubber with Visible Accent Fill and Buffer */}
                <div
                  ref={timelineContainerRef}
                  onMouseMove={handleTimelineMouseMove}
                  onMouseLeave={handleTimelineMouseLeave}
                  onClick={handleTimelineClick}
                  className="group/timeline relative flex items-center h-4 w-full cursor-pointer touch-none select-none py-1"
                >
                  {/* Scrubber Background & Progress Tracks */}
                  <div className="relative h-1.5 w-full rounded-full bg-white/20 transition-all duration-150 group-hover/timeline:h-2.5 overflow-hidden">
                    {/* Buffered Progress Bar */}
                    <div
                      className="absolute top-0 left-0 h-full rounded-full bg-white/30 transition-all duration-150 pointer-events-none"
                      style={{
                        width: `${duration > 0 ? Math.min(100, Math.max(0, (bufferedTime / duration) * 100)) : 0}%`,
                      }}
                    />

                    {/* Hover Ghost Bar */}
                    {hoverTime !== null && (
                      <div
                        className="absolute top-0 left-0 h-full rounded-full bg-white/20 pointer-events-none"
                        style={{ width: `${hoverPercent}%` }}
                      />
                    )}

                    {/* Played Progress Bar (Solid Accent Fill) */}
                    <div
                      className="absolute top-0 left-0 h-full rounded-full bg-[var(--accent)] pointer-events-none"
                      style={{
                        width: `${duration > 0 ? Math.min(100, Math.max(0, (currentTime / duration) * 100)) : 0}%`,
                      }}
                    />
                  </div>

                  {/* Scrubber Thumb */}
                  <div
                    className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 h-3.5 w-3.5 rounded-full bg-[var(--accent)] border-2 border-white pointer-events-none transition-transform duration-100 group-hover/timeline:scale-125"
                    style={{
                      left: `${duration > 0 ? Math.min(100, Math.max(0, (currentTime / duration) * 100)) : 0}%`,
                    }}
                  />

                  {/* Accessible Range Input Overlaid for native drag seeking */}
                  <input
                    type="range"
                    min={0}
                    max={duration || 100}
                    step={0.1}
                    value={currentTime}
                    onChange={handleSeek}
                    className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                    aria-label="Video timeline scrubber"
                  />

                  {/* Hover Time Tooltip */}
                  {hoverTime !== null && (
                    <div
                      className="absolute -top-7 -translate-x-1/2 rounded bg-black/90 px-1.5 py-0.5 text-[10px] font-mono font-bold text-white pointer-events-none border border-white/10"
                      style={{ left: `${hoverPercent}%` }}
                    >
                      {formatDuration(hoverTime)}
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between gap-1.5 sm:gap-3">
                  {/* Left Controls: Play, Skip +/- 10s, Volume, Time */}
                  <div className="flex items-center gap-1.5 sm:gap-3 min-w-0">
                    <button onClick={togglePlay} className="text-white hover:text-[var(--accent)] transition-colors shrink-0">
                      {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5 fill-white" />}
                    </button>

                    <button onClick={() => skipTime(-10)} title="Rewind 10s" className="hidden sm:inline-flex text-zinc-300 hover:text-white transition-colors shrink-0">
                      <RotateCcw className="h-4 w-4" />
                    </button>
                    <button onClick={() => skipTime(10)} title="Forward 10s" className="hidden sm:inline-flex text-zinc-300 hover:text-white transition-colors shrink-0">
                      <RotateCw className="h-4 w-4" />
                    </button>

                    {/* Volume & Volume Booster */}
                    <div className="flex items-center gap-1 sm:gap-2 shrink-0">
                      <button onClick={toggleMute} className="text-zinc-300 hover:text-white transition-colors">
                        {isMuted ? <VolumeX className="h-4 w-4 sm:h-5 sm:w-5" /> : <Volume2 className="h-4 w-4 sm:h-5 sm:w-5" />}
                      </button>
                      <input
                        type="range"
                        min={0}
                        max={1}
                        step={0.05}
                        value={isMuted ? 0 : volume}
                        onChange={handleVolumeChange}
                        style={{
                          background: `linear-gradient(to right, var(--accent) 0%, var(--accent) ${Math.round((isMuted ? 0 : volume) * 100)}%, rgba(255,255,255,0.2) ${Math.round((isMuted ? 0 : volume) * 100)}%, rgba(255,255,255,0.2) 100%)`,
                        }}
                        className="h-1.5 w-10 sm:w-16 cursor-pointer appearance-none rounded-full accent-[var(--accent)]"
                      />

                      {/* Booster Pill & Popover Menu */}
                      <div
                        ref={activeMenu === "booster" ? activeMenuRef : undefined}
                        className="relative"
                      >
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveMenu((prev) => (prev === "booster" ? null : "booster"));
                          }}
                          className={`flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-mono font-bold transition-all ${
                            volumeBoost > 1
                              ? "bg-gradient-to-r from-amber-500/25 to-[var(--accent)]/30 border border-amber-500/60 text-amber-300"
                              : "bg-white/5 border border-white/10 text-zinc-400 hover:text-white hover:bg-white/10"
                          }`}
                          title="Audio Volume Booster (Amplifies up to 300%) [Key: B]"
                        >
                          <Zap className={`h-2.5 w-2.5 ${volumeBoost > 1 ? "text-amber-400 fill-amber-400 animate-pulse" : "text-zinc-400"}`} />
                          <span>{Math.round(volumeBoost * 100)}%</span>
                        </button>

                        {/* Booster Popover Menu */}
                        {activeMenu === "booster" && (
                          <div
                            onClick={(e) => e.stopPropagation()}
                            className="absolute left-0 bottom-10 w-56 sm:w-60 max-w-[calc(100vw-32px)] rounded-md border border-white/15 bg-[#131318]/95 backdrop-blur-md p-3 z-50 text-xs space-y-3 shadow-2xl"
                          >
                            <div className="flex items-center justify-between border-b border-white/10 pb-2">
                              <div className="flex items-center gap-1.5 font-bold text-white">
                                <Zap className="h-4 w-4 text-amber-400 fill-amber-400" />
                                <span>Volume Booster</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="font-mono text-xs font-bold text-amber-400">
                                  {Math.round(volumeBoost * 100)}%
                                </span>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setActiveMenu(null);
                                  }}
                                  className="text-zinc-400 hover:text-white hover:bg-white/10 rounded p-1 transition-colors"
                                  title="Close (Esc)"
                                  aria-label="Close Volume Booster"
                                >
                                  <X className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            </div>

                            {/* Range Slider */}
                            <div className="space-y-1.5">
                              <div className="flex justify-between text-[10px] font-mono text-zinc-400">
                                <span>100% (Normal)</span>
                                <span className="text-amber-400/80">200%</span>
                                <span className="text-amber-400 font-bold">300% MAX</span>
                              </div>
                              <input
                                type="range"
                                min={1}
                                max={3}
                                step={0.05}
                                value={volumeBoost}
                                onChange={(e) => applyVolumeBoost(parseFloat(e.target.value))}
                                style={{
                                   background: `linear-gradient(to right, #f59e0b 0%, #f59e0b ${Math.round(((volumeBoost - 1) / 2) * 100)}%, rgba(255,255,255,0.2) ${Math.round(((volumeBoost - 1) / 2) * 100)}%, rgba(255,255,255,0.2) 100%)`,
                                }}
                                className="h-1.5 w-full cursor-pointer appearance-none rounded-full accent-amber-500 hover:accent-amber-400 transition-all"
                              />
                            </div>

                            {/* Preset Buttons */}
                            <div>
                              <span className="text-[10px] uppercase font-bold text-zinc-400 block mb-1.5">
                                Presets (or press B)
                              </span>
                              <div className="grid grid-cols-4 gap-1">
                                {[1, 1.5, 2, 3].map((b) => {
                                  const isSel = Math.abs(volumeBoost - b) < 0.05;
                                  return (
                                    <button
                                      key={b}
                                      onClick={() => applyVolumeBoost(b)}
                                      className={`rounded py-1 text-[10px] font-mono font-bold transition-all ${
                                        isSel
                                          ? "bg-amber-500 text-black font-black"
                                          : "bg-white/5 text-zinc-300 hover:bg-white/10"
                                      }`}
                                    >
                                      {b === 1 ? "100%" : `${Math.round(b * 100)}%`}
                                    </button>
                                  );
                                })}
                              </div>
                            </div>

                            <p className="text-[10px] leading-tight text-zinc-400 border-t border-white/10 pt-2">
                              Web Audio gain engine amplifies quiet streams beyond standard 100% browser limit.
                            </p>
                          </div>
                        )}
                      </div>
                    </div>

                    <span className="text-xs font-mono text-zinc-300">
                      {formatDuration(currentTime)} / {formatDuration(duration)}
                    </span>
                  </div>

                  {/* Right Controls: Auto, Subtitles, Servers, Settings, Fullscreen */}
                  <div className="relative flex items-center gap-1.5 sm:gap-3 shrink-0">
                    {/* Auto Options Button */}
                    <div
                      ref={activeMenu === "auto" ? activeMenuRef : undefined}
                      className="relative"
                    >
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveMenu((prev) => (prev === "auto" ? null : "auto"));
                        }}
                        className={`flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-md transition-colors ${
                          activeMenu === "auto" || autoSkipIntro || autoNext
                            ? "bg-[var(--accent)] text-white"
                            : "text-zinc-300 hover:text-white hover:bg-white/10"
                        }`}
                        title="Auto Playback Options"
                      >
                        <Sparkles className="h-4 w-4 text-amber-300" />
                        <span className="hidden sm:inline">Auto</span>
                      </button>

                      {/* Auto Options Popup Menu */}
                      {activeMenu === "auto" && (
                        <div
                          onClick={(e) => e.stopPropagation()}
                          className="absolute right-0 bottom-10 w-52 rounded-md border border-white/10 bg-[#131318]/95 backdrop-blur-md p-2.5 z-50 text-xs space-y-2 shadow-2xl"
                        >
                          <div className="flex items-center justify-between px-1 border-b border-white/10 pb-1">
                            <span className="font-bold text-white">Automation</span>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setActiveMenu(null);
                              }}
                              className="text-zinc-400 hover:text-white hover:bg-white/10 rounded p-1 transition-colors"
                              title="Close (Esc)"
                              aria-label="Close Automation Menu"
                            >
                              <X className="h-3.5 w-3.5" />
                            </button>
                          </div>

                          <button
                            onClick={() => onAutoToggle?.("autoPlay")}
                            className="flex w-full items-center justify-between rounded-md px-2 py-1.5 hover:bg-white/10 text-zinc-200"
                          >
                            <span>Autoplay</span>
                            <span className={autoPlay ? "text-emerald-400 font-bold" : "text-zinc-500"}>
                              {autoPlay ? "ON" : "OFF"}
                            </span>
                          </button>

                          <button
                            onClick={() => onAutoToggle?.("autoNext")}
                            className="flex w-full items-center justify-between rounded-md px-2 py-1.5 hover:bg-white/10 text-zinc-200"
                          >
                            <span>Auto Next Episode</span>
                            <span className={autoNext ? "text-emerald-400 font-bold" : "text-zinc-500"}>
                              {autoNext ? "ON" : "OFF"}
                            </span>
                          </button>

                          <button
                            onClick={() => onAutoToggle?.("autoSkipIntro")}
                            className="flex w-full items-center justify-between rounded-md px-2 py-1.5 hover:bg-white/10 text-zinc-200"
                          >
                            <span>Auto Skip Intro (+85s)</span>
                            <span className={autoSkipIntro ? "text-emerald-400 font-bold" : "text-zinc-500"}>
                              {autoSkipIntro ? "ON" : "OFF"}
                            </span>
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Subtitle Selector Button */}
                    <div
                      ref={activeMenu === "subtitles" ? activeMenuRef : undefined}
                      className="relative"
                    >
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveMenu((prev) => (prev === "subtitles" ? null : "subtitles"));
                        }}
                        className={`flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-md transition-colors ${
                          activeMenu === "subtitles" || selectedSubUrl
                            ? "bg-white/15 text-white"
                            : "text-zinc-300 hover:text-white hover:bg-white/10"
                        }`}
                        title="Subtitles & Sync"
                      >
                        <SubtitlesIcon className="h-4 w-4" />
                        <span className="hidden sm:inline">CC</span>
                      </button>

                      {/* Subtitle Popup Menu */}
                      {activeMenu === "subtitles" && (
                        <div
                          onClick={(e) => e.stopPropagation()}
                          className="absolute right-0 bottom-10 w-64 max-h-80 overflow-y-auto rounded-md border border-white/10 bg-[#131318]/95 backdrop-blur-md p-3 z-50 text-xs space-y-3 scrollbar-thin shadow-2xl"
                        >
                          <div className="flex items-center justify-between border-b border-white/10 pb-1.5">
                            <span className="font-bold text-white">Subtitle Track</span>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setActiveMenu(null);
                              }}
                              className="text-zinc-400 hover:text-white hover:bg-white/10 rounded p-1 transition-colors"
                              title="Close (Esc)"
                              aria-label="Close Subtitles Menu"
                            >
                              <X className="h-3.5 w-3.5" />
                            </button>
                          </div>
                            <div className="space-y-1">
                              <button
                                onClick={() => {
                                  setSelectedSubUrl(null);
                                  setActiveMenu(null);
                                }}
                                className={`flex w-full items-center justify-between rounded-md px-2.5 py-1.5 ${
                                  selectedSubUrl === null ? "bg-[var(--accent)] text-white" : "text-zinc-300 hover:bg-white/10"
                                }`}
                              >
                                <span>Off</span>
                                {selectedSubUrl === null && <Check className="h-3.5 w-3.5" />}
                              </button>

                              {subtitles.map((sub, i) => {
                                const isSelected = selectedSubUrl === sub.url;
                                const label = sub.label || sub.language || `Track ${i + 1}`;
                                return (
                                  <button
                                    key={`${sub.url}-${i}`}
                                    onClick={() => {
                                      setSelectedSubUrl(sub.url);
                                      setActiveMenu(null);
                                    }}
                                    className={`flex w-full items-center justify-between rounded-md px-2.5 py-1.5 ${
                                      isSelected ? "bg-[var(--accent)] text-white" : "text-zinc-300 hover:bg-white/10"
                                    }`}
                                  >
                                    <span className="truncate pr-2">{label}</span>
                                    {isSelected && <Check className="h-3.5 w-3.5 shrink-0" />}
                                  </button>
                                );
                              })}
                            </div>

                          {/* Subtitle Sync Offset */}
                          <div className="border-t border-white/10 pt-2">
                            <span className="font-bold text-white block mb-1">
                              Sync Offset: <span className="font-mono text-[var(--accent)]">{subOffset > 0 ? `+${subOffset}` : subOffset}s</span>
                            </span>
                            <div className="grid grid-cols-5 gap-1 pt-1">
                              {[-1.5, -0.5, 0, 0.5, 1.5].map((off) => (
                                <button
                                  key={off}
                                  onClick={() => setSubOffset(off)}
                                  className={`rounded py-1 text-[10px] font-mono font-bold ${
                                    subOffset === off ? "bg-[var(--accent)] text-white" : "bg-white/5 text-zinc-300 hover:bg-white/10"
                                  }`}
                                >
                                  {off > 0 ? `+${off}` : off}s
                                </button>
                              ))}
                            </div>
                          </div>

                          {/* Subtitle Font Size */}
                          <div className="border-t border-white/10 pt-2">
                            <span className="font-bold text-white block mb-1">Font Size</span>
                            <div className="grid grid-cols-3 gap-1 pt-1">
                              {(["small", "medium", "large"] as const).map((sz) => (
                                <button
                                  key={sz}
                                  onClick={() => setSubSize(sz)}
                                  className={`rounded py-1 text-[10px] uppercase font-bold ${
                                    subSize === sz ? "bg-[var(--accent)] text-white" : "bg-white/5 text-zinc-300 hover:bg-white/10"
                                  }`}
                                >
                                  {sz}
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Server Stream Selector */}
                    {streams.length > 1 && (
                      <div
                        ref={activeMenu === "servers" ? activeMenuRef : undefined}
                        className="relative"
                      >
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveMenu((prev) => (prev === "servers" ? null : "servers"));
                          }}
                          className={`flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-md transition-colors ${
                            activeMenu === "servers"
                              ? "bg-white/15 text-white"
                              : "text-zinc-300 hover:text-white hover:bg-white/10"
                          }`}
                          title="Stream Server"
                        >
                          <Server className="h-4 w-4" />
                          <span className="hidden sm:inline">Server</span>
                        </button>

                        {activeMenu === "servers" && (
                          <div
                            onClick={(e) => e.stopPropagation()}
                            className="absolute right-0 bottom-10 w-48 rounded-md border border-white/10 bg-[#131318]/95 backdrop-blur-md p-2 z-50 text-xs space-y-1 shadow-2xl"
                          >
                            <div className="flex items-center justify-between px-2 py-1 border-b border-white/10">
                              <span className="font-bold text-white">Stream Servers</span>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setActiveMenu(null);
                                }}
                                className="text-zinc-400 hover:text-white hover:bg-white/10 rounded p-1 transition-colors"
                                title="Close (Esc)"
                                aria-label="Close Server Menu"
                              >
                                <X className="h-3.5 w-3.5" />
                              </button>
                            </div>
                            {streams.map((s, idx) => (
                              <button
                                key={idx}
                                onClick={() => {
                                  setSelectedStreamIdx(idx);
                                  if (s.type === "embed") {
                                    setPlayerMode("embed");
                                  } else {
                                    setPlayerMode("stream");
                                  }
                                  setActiveMenu(null);
                                }}
                                className={`flex w-full items-center justify-between rounded-md px-2 py-1.5 ${
                                  selectedStreamIdx === idx ? "bg-[var(--accent)] text-white" : "text-zinc-300 hover:bg-white/10"
                                }`}
                              >
                                <span>{s.server || `Server ${idx + 1}`}</span>
                                <span className="font-mono text-[10px] opacity-75">{s.quality || s.type}</span>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {/* General Settings (Speed & Quality) */}
                    <div
                      ref={activeMenu === "settings" ? activeMenuRef : undefined}
                      className="relative"
                    >
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveMenu((prev) => (prev === "settings" ? null : "settings"));
                        }}
                        className="text-zinc-300 hover:text-white transition-colors p-1"
                        title="Player Settings"
                      >
                        <Settings className="h-5 w-5" />
                      </button>

                      {/* Settings Popup Menu */}
                      {activeMenu === "settings" && (
                        <div
                          onClick={(e) => e.stopPropagation()}
                          className="absolute right-0 bottom-10 w-48 rounded-md border border-white/10 bg-[#131318]/95 backdrop-blur-md p-2 z-50 text-xs shadow-2xl"
                        >
                          <div className="flex items-center justify-between px-2 pb-1.5 mb-1.5 border-b border-white/10">
                            <span className="font-bold text-white">Settings</span>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setActiveMenu(null);
                              }}
                              className="text-zinc-400 hover:text-white hover:bg-white/10 rounded p-1 transition-colors"
                              title="Close (Esc)"
                              aria-label="Close Settings Menu"
                            >
                              <X className="h-3.5 w-3.5" />
                            </button>
                          </div>
                          {/* Volume Booster Section */}
                          <div className="border-b border-white/10 pb-1.5 mb-1.5">
                            <div className="flex items-center justify-between px-2 mb-1">
                              <span className="font-bold text-white flex items-center gap-1">
                                <Zap className="h-3 w-3 text-amber-400 fill-amber-400" /> Audio Boost
                              </span>
                              <span className="font-mono text-[10px] font-bold text-amber-400">
                                {Math.round(volumeBoost * 100)}%
                              </span>
                            </div>
                            <div className="grid grid-cols-4 gap-1 px-1">
                              {[1, 1.5, 2, 3].map((b) => (
                                <button
                                  key={b}
                                  onClick={() => applyVolumeBoost(b)}
                                  className={`rounded py-1 text-[10px] font-mono font-bold transition-all ${
                                    Math.abs(volumeBoost - b) < 0.05
                                      ? "bg-amber-500 text-black font-black"
                                      : "bg-white/5 text-zinc-300 hover:bg-white/10"
                                  }`}
                                >
                                  {b === 1 ? "100%" : `${Math.round(b * 100)}%`}
                                </button>
                              ))}
                            </div>
                          </div>

                          {/* Playback Speed */}
                          <div className="border-b border-white/10 pb-1.5 mb-1.5">
                            <span className="font-bold text-white block px-2 mb-1">Playback Speed</span>
                            {[0.75, 1, 1.25, 1.5, 2].map((spd) => (
                              <button
                                key={spd}
                                onClick={() => changeSpeed(spd)}
                                className={`flex w-full items-center justify-between rounded-md px-2 py-1 ${
                                  playbackSpeed === spd ? "bg-[var(--accent)] text-white" : "text-zinc-300 hover:bg-white/10"
                                }`}
                              >
                                <span>{spd}x</span>
                                {playbackSpeed === spd && <Check className="h-3 w-3" />}
                              </button>
                            ))}
                          </div>

                          {/* Quality Levels */}
                          {levels.length > 0 && (
                            <div>
                              <span className="font-bold text-white block px-2 mb-1">Video Quality</span>
                              {levels.map((lvl, idx) => (
                                <button
                                  key={lvl}
                                  onClick={() => changeQuality(idx - 1)}
                                  className={`flex w-full items-center justify-between rounded-md px-2 py-1 ${
                                    (idx === 0 && currentLevel === -1) || currentLevel === idx - 1
                                      ? "bg-[var(--accent)] text-white"
                                      : "text-zinc-300 hover:bg-white/10"
                                  }`}
                                >
                                  <span>{lvl}</span>
                                  {((idx === 0 && currentLevel === -1) || currentLevel === idx - 1) && (
                                    <Check className="h-3 w-3" />
                                  )}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Fullscreen */}
                    <button onClick={toggleFullscreen} className="text-zinc-300 hover:text-white transition-colors p-1">
                      {isFullscreen ? <Minimize className="h-5 w-5" /> : <Maximize className="h-5 w-5" />}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Keyboard Shortcuts Dialog */}
      {showShortcuts && (
        <div className="rounded-md border border-white/10 bg-[#131318] p-4 text-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="font-bold text-white flex items-center gap-1.5">
              <HelpCircle className="h-4 w-4 text-[var(--accent)]" />
              Keyboard Shortcuts
            </span>
            <button onClick={() => setShowShortcuts(false)} className="text-zinc-400 hover:text-white">✕</button>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-zinc-300">
            <div><kbd className="rounded bg-white/10 px-1.5 py-0.5">Space</kbd> Play / Pause</div>
            <div><kbd className="rounded bg-white/10 px-1.5 py-0.5">F</kbd> Fullscreen</div>
            <div><kbd className="rounded bg-white/10 px-1.5 py-0.5">M</kbd> Mute / Unmute</div>
            <div><kbd className="rounded bg-white/10 px-1.5 py-0.5">&larr; / &rarr;</kbd> Seek 10s</div>
            <div><kbd className="rounded bg-white/10 px-1.5 py-0.5">&uarr; / &darr;</kbd> Volume &plusmn;10%</div>
            <div><kbd className="rounded bg-white/10 px-1.5 py-0.5 text-amber-300">B</kbd> Cycle Boost (100%-300%)</div>
            <div><kbd className="rounded bg-white/10 px-1.5 py-0.5 text-amber-300">Shift + &uarr;/&darr;</kbd> Boost &plusmn;25%</div>
          </div>
        </div>
      )}
    </div>
  );
}
