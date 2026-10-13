"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import Hls from "hls.js";

const DEFAULT_API_BASE = "http://127.0.0.1:8000";

const PROVIDERS = [
  { id: "", name: "auto (fastest wins)", tag: "Recommended" },
  { id: "miruro", name: "miruro", tag: "Decrypted" },
  { id: "kaa", name: "kaa", tag: "Direct HLS" },
  { id: "anizone", name: "anizone", tag: "Multi-res" },
  { id: "anikoto", name: "anikoto", tag: "Fast" },
  { id: "reanime", name: "reanime", tag: "Standard" },
  { id: "aniwaves", name: "aniwaves", tag: "Standard" },
  { id: "anineko", name: "anineko", tag: "Multi-stream" },
  { id: "anibd", name: "anibd", tag: "Dual-audio" },
  { id: "mkissa", name: "mkissa", tag: "Fallback" },
  { id: "animegg", name: "animegg", tag: "Fallback" },
  { id: "animeonsen", name: "animeonsen", tag: "Fallback" },
];

const PRESET_ENDPOINTS = [
  {
    method: "GET",
    tag: "Search",
    path: "/anime/search?query=violet evergarden&page=1",
    desc: "Global anime search with full AniList metadata, posters, and formats.",
  },
  {
    method: "GET",
    tag: "Autocomplete",
    path: "/anime/suggestions?query=violet evergarden",
    desc: "Lightweight search autocomplete for rapid UI dropdowns.",
  },
  {
    method: "GET",
    tag: "Featured",
    path: "/anime/spotlight",
    desc: "Curated hot list of top trending anime series in focus.",
  },
  {
    method: "GET",
    tag: "Details",
    path: "/anime/info/21827",
    desc: "Complete anime information chunk: synopsis, characters, relations, and staff.",
  },
  {
    method: "GET",
    tag: "Episodes",
    path: "/anime/episodes/21827",
    desc: "Internal episode mappings and multi-provider episode identifiers.",
  },
  {
    method: "GET",
    tag: "Trending",
    path: "/anime/trending?page=1",
    desc: "Currently trending anime series globally.",
  },
  {
    method: "GET",
    tag: "Popular",
    path: "/anime/popular?page=1",
    desc: "Most popular anime series of all time.",
  },
  {
    method: "GET",
    tag: "Upcoming",
    path: "/anime/upcoming?page=1",
    desc: "Upcoming anime releases for next seasons.",
  },
  {
    method: "GET",
    tag: "Recent",
    path: "/anime/recent?page=1",
    desc: "Recently broadcasted episodes and updates.",
  },
  {
    method: "GET",
    tag: "Filter",
    path: "/anime/filter?genre=Action&sort=SCORE_DESC",
    desc: "Multi-parameter filter combining genre, year, season, and sort order.",
  },
  {
    method: "GET",
    tag: "Metadata",
    path: "/anime/genres",
    desc: "Full collection of AniList genres for filtering.",
  },
  {
    method: "GET",
    tag: "Subtitles",
    path: "/proxy_subtitle?url=https://raw.githubusercontent.com/brenopolanski/html5-video-webvtt-example/master/subtitles/subtitles-en.vtt&offset=0.0&speed=1.0",
    desc: "Proxy & convert WebVTT/SRT/ASS subtitles with real-time timing shift and speed scaling.",
  },
  {
    method: "GET",
    tag: "Providers",
    path: "/anime/providers/status",
    desc: "Health, latency, and status rankings of all streaming providers.",
  },
];

// Helper to parse WebVTT text cues
function parseVttText(vttText) {
  const cues = [];
  const lines = vttText.split(/\r?\n/);
  const tsRegex = /(?:(\d{1,2}):)?(\d{2}):(\d{2})[.,](\d{3})\s*-->\s*(?:(\d{1,2}):)?(\d{2}):(\d{2})[.,](\d{3})/;

  let i = 0;
  while (i < lines.length) {
    const line = lines[i].trim();
    const match = tsRegex.exec(line);
    if (match) {
      const parseSeconds = (h, m, s, ms) => {
        const hr = h ? parseInt(h, 10) : 0;
        return hr * 3600 + parseInt(m, 10) * 60 + parseInt(s, 10) + parseInt(ms, 10) / 1000;
      };
      const start = parseSeconds(match[1], match[2], match[3], match[4]);
      const end = parseSeconds(match[5], match[6], match[7], match[8]);

      i++;
      const textLines = [];
      while (i < lines.length && lines[i].trim() !== "" && !tsRegex.test(lines[i])) {
        textLines.push(lines[i].replace(/<[^>]+>/g, "").trim());
        i++;
      }
      if (textLines.length > 0) {
        cues.push({ start, end, text: textLines.join("\n") });
      }
    } else {
      i++;
    }
  }
  return cues;
}

function formatSeconds(sec) {
  const s = Math.max(0, Math.floor(sec || 0));
  const m = Math.floor(s / 60);
  const rem = s % 60;
  return `${m}:${rem < 10 ? "0" : ""}${rem}`;
}

export default function Home() {
  const [activeTab, setActiveTab] = useState("player"); // "player" | "explorer" | "logs" | "providers"
  const [apiBase, setApiBase] = useState(DEFAULT_API_BASE);
  const [apiOnline, setApiOnline] = useState(false);

  // Extractor & Player state
  const [query, setQuery] = useState("violet-evergarden");
  const [episode, setEpisode] = useState(1);
  const [provider, setProvider] = useState("");
  const [audio, setAudio] = useState("sub");
  const [extracting, setExtracting] = useState(false);
  const [extractResult, setExtractResult] = useState(null);
  const [extractError, setExtractError] = useState(null);
  const [nowPlaying, setNowPlaying] = useState(null);
  const [curlCommand, setCurlCommand] = useState("");
  const [copiedCurl, setCopiedCurl] = useState(false);

  // Audio track switching state
  const [audioTracks, setAudioTracks] = useState([]);
  const [selectedTrackIdx, setSelectedTrackIdx] = useState(0);
  const [activeTrackName, setActiveTrackName] = useState("");

  // Subtitle switching & timing state
  const [subtitlesList, setSubtitlesList] = useState([]);
  const [selectedSubId, setSelectedSubId] = useState("none");
  const [parsedCues, setParsedCues] = useState([]);
  const [currentCueText, setCurrentCueText] = useState("");
  const [videoCurrentTime, setVideoCurrentTime] = useState(0);
  const [subOffset, setSubOffset] = useState(0.0); // in seconds (+ = delay, - = advance)
  const [subSpeed, setSubSpeed] = useState(1.0); // multiplier (1.0 = normal)
  const [subSize, setSubSize] = useState("md"); // "sm" | "md" | "lg"
  const [subDisplayMode, setSubDisplayMode] = useState("overlay"); // "overlay" | "native" | "both"
  const [showScriptList, setShowScriptList] = useState(false);
  const [copiedSubUrl, setCopiedSubUrl] = useState(false);

  // Custom Anime Video Player Controls State
  const [isPlaying, setIsPlaying] = useState(false);
  const [videoDuration, setVideoDuration] = useState(0);
  const [bufferedPercent, setBufferedPercent] = useState(0);
  const [volume, setVolume] = useState(1.0);
  const [isMuted, setIsMuted] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1.0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [controlsVisible, setControlsVisible] = useState(true);
  const [hoverScrubTime, setHoverScrubTime] = useState(null);
  const [hoverScrubPos, setHoverScrubPos] = useState(0);
  const [osdBadge, setOsdBadge] = useState(null); // { icon, text }
  const [useNativeControls, setUseNativeControls] = useState(false);
  const controlsTimeoutRef = useRef(null);
  const osdTimeoutRef = useRef(null);

  // Refs for video & HLS
  const videoRef = useRef(null);
  const videoContainerRef = useRef(null);
  const iframeRef = useRef(null);
  const hlsRef = useRef(null);

  // API Explorer state
  const [endpoints, setEndpoints] = useState(
    PRESET_ENDPOINTS.map((ep) => ({ ...ep, url: ep.path, response: null, loading: false }))
  );

  // Live Logs state
  const [logsText, setLogsText] = useState("Loading server logs...");
  const [autoLogs, setAutoLogs] = useState(true);
  const [logFilter, setLogFilter] = useState("");
  const terminalRef = useRef(null);

  // Provider status state
  const [providersData, setProvidersData] = useState(null);
  const [loadingProviders, setLoadingProviders] = useState(false);

  // Check Backend Health
  useEffect(() => {
    let isMounted = true;
    async function checkHealth() {
      try {
        const res = await fetch(`${apiBase}/`, { cache: "no-store" });
        if (res.ok) {
          if (isMounted) setApiOnline(true);
        } else {
          if (isMounted) setApiOnline(false);
        }
      } catch (e) {
        if (isMounted) setApiOnline(false);
      }
    }
    checkHealth();
    const interval = setInterval(checkHealth, 5000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [apiBase]);

  // Live Logs Poller
  useEffect(() => {
    if (!autoLogs && activeTab !== "logs") return;
    let isMounted = true;
    async function fetchLogs() {
      try {
        const res = await fetch(`${apiBase}/logs/raw?lines=100`, { cache: "no-store" });
        if (res.ok) {
          const text = await res.text();
          if (isMounted) {
            setLogsText(text || "No logs recorded yet.");
            if (terminalRef.current) {
              terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
            }
          }
        }
      } catch (e) {}
    }
    fetchLogs();
    const interval = setInterval(fetchLogs, 2000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [apiBase, autoLogs, activeTab]);

  // Cleanup HLS on unmount
  useEffect(() => {
    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, []);

  // Fetch Providers Status when tab opened
  useEffect(() => {
    if (activeTab === "providers" && !providersData) {
      loadProviders();
    }
  }, [activeTab]);

  async function loadProviders() {
    setLoadingProviders(true);
    try {
      const res = await fetch(`${apiBase}/anime/providers/status`);
      const data = await res.json();
      setProvidersData(data);
    } catch (e) {
      setProvidersData({ error: e.message });
    } finally {
      setLoadingProviders(false);
    }
  }

  // Load external subtitle track file and parse cues
  const loadExternalSubtitle = useCallback(
    async (sub) => {
      try {
        const proxiedUrl = `${apiBase}/proxy_subtitle?url=${encodeURIComponent(
          sub.url
        )}&referer=${encodeURIComponent(sub.referer || "")}`;
        const res = await fetch(proxiedUrl);
        if (res.ok) {
          const text = await res.text();
          const cues = parseVttText(text);
          setParsedCues(cues);
          if (videoRef.current) {
            const ct = videoRef.current.currentTime;
            setVideoCurrentTime(ct);
            const match = cues.find((c) => {
              const adjustedStart = c.start * subSpeed + subOffset;
              const adjustedEnd = c.end * subSpeed + subOffset;
              return ct >= adjustedStart && ct <= adjustedEnd;
            });
            setCurrentCueText(match ? match.text : "");
          }
        } else {
          setParsedCues([]);
        }
      } catch (err) {
        console.error("Failed to fetch subtitle cues:", err);
        setParsedCues([]);
      }
    },
    [apiBase, subOffset, subSpeed]
  );

  // Sync subtitle cues with video playback time and user seek/pause events
  const updateCurrentCue = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    const ct = video.currentTime;
    setVideoCurrentTime(ct);

    if (selectedSubId === "none" || parsedCues.length === 0) {
      setCurrentCueText("");
      return;
    }
    const match = parsedCues.find((c) => {
      const adjustedStart = c.start * subSpeed + subOffset;
      const adjustedEnd = c.end * subSpeed + subOffset;
      return ct >= adjustedStart && ct <= adjustedEnd;
    });
    setCurrentCueText(match ? match.text : "");
  }, [parsedCues, subOffset, subSpeed, selectedSubId]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    updateCurrentCue();

    const events = ["timeupdate", "seeked", "seeking", "play", "pause", "ratechange"];
    events.forEach((ev) => video.addEventListener(ev, updateCurrentCue));
    return () => {
      events.forEach((ev) => video.removeEventListener(ev, updateCurrentCue));
    };
  }, [updateCurrentCue]);

  // Sync native video text tracks mode
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !video.textTracks) return;

    const syncTracks = () => {
      for (let i = 0; i < video.textTracks.length; i++) {
        if (subDisplayMode === "native" || subDisplayMode === "both") {
          video.textTracks[i].mode = "showing";
        } else {
          video.textTracks[i].mode = "hidden";
        }
      }
    };

    syncTracks();
    video.addEventListener("loadedmetadata", syncTracks);
    return () => {
      video.removeEventListener("loadedmetadata", syncTracks);
    };
  }, [selectedSubId, subOffset, subSpeed, subDisplayMode]);

  // Switch Subtitle Track
  const handleSelectSubtitle = useCallback(
    (subId, trackList = null) => {
      setSelectedSubId(subId);
      setCurrentCueText("");

      if (subId === "none") {
        setParsedCues([]);
        if (hlsRef.current) {
          hlsRef.current.subtitleTrack = -1;
        }
        return;
      }

      const listToSearch = trackList || subtitlesList;
      const found = listToSearch.find((s) => s.id === subId);
      if (!found) return;

      if (found.type === "hls") {
        setParsedCues([]);
        if (hlsRef.current) {
          hlsRef.current.subtitleTrack = found.hlsIdx;
        }
      } else {
        if (hlsRef.current) {
          hlsRef.current.subtitleTrack = -1;
        }
        loadExternalSubtitle(found);
      }
    },
    [subtitlesList, loadExternalSubtitle]
  );


  // Handle Stream Extraction
  async function handleExtract() {
    if (!query.trim()) return;
    setExtracting(true);
    setExtractError(null);
    setExtractResult(null);
    setNowPlaying(null);
    setAudioTracks([]);
    setSubtitlesList([]);
    setSelectedSubId("none");
    setParsedCues([]);
    setCurrentCueText("");
    setCurlCommand("");

    // Unload existing video
    if (hlsRef.current) {
      try {
        hlsRef.current.destroy();
      } catch (e) {}
      hlsRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.removeAttribute("src");
      videoRef.current.load();
    }
    if (iframeRef.current) {
      iframeRef.current.src = "about:blank";
    }

    try {
      const cleanSlug = encodeURIComponent(query.trim());
      let endpoint = `${apiBase}/anime/extract/${cleanSlug}?e=${episode}&type=${audio}`;
      if (provider) {
        endpoint += `&provider=${encodeURIComponent(provider)}`;
      }

      const res = await fetch(endpoint);
      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.detail || `Server returned status ${res.status}`);
      }

      const data = await res.json();
      setExtractResult(data);

      // Collect external subtitles from API response
      const initialSubs = (data.subtitles || []).map((s, idx) => ({
        id: `ext-${idx}`,
        url: s.url,
        label: s.label || s.lang || `Subtitle ${idx + 1}`,
        lang: s.srclang || s.lang || "",
        format: s.format || "vtt",
        referer: s.referer || (data.streams?.[0]?.referer) || "",
        type: "external",
      }));
      setSubtitlesList(initialSubs);
      if (initialSubs.length > 0) {
        const engSub = initialSubs.find((s) => /eng|en/i.test(s.label || s.lang));
        handleSelectSubtitle(engSub ? engSub.id : initialSubs[0].id, initialSubs);
      }


      if (data.streams && data.streams.length > 0) {
        const hlsStream = data.streams.find((s) => s.type === "hls");
        if (hlsStream && Hls.isSupported()) {
          const reqAudio = (data.type || audio || "sub").toLowerCase();
          const proxyUrl = `${apiBase}/proxy_m3u8?url=${encodeURIComponent(
            hlsStream.url
          )}&referer=${encodeURIComponent(hlsStream.referer || "")}&audio=${encodeURIComponent(
            reqAudio
          )}`;

          const hls = new Hls({
            maxBufferLength: 30,
            maxMaxBufferLength: 60,
            startFragPrefetch: true,
            enableWorker: true,
            lowLatencyMode: false,
            backBufferLength: 30,
          });
          hlsRef.current = hls;

          hls.on(Hls.Events.ERROR, (event, errData) => {
            if (errData.fatal) {
              if (errData.type === Hls.ErrorTypes.NETWORK_ERROR) {
                hls.startLoad();
              } else if (errData.type === Hls.ErrorTypes.MEDIA_ERROR) {
                hls.recoverMediaError();
              } else {
                console.error("Fatal HLS error:", errData);
              }
            }
          });

          // Sync Audio Tracks
          const syncAudioTracks = () => {
            if (!hls.audioTracks || hls.audioTracks.length === 0) return;
            const tracks = hls.audioTracks.map((t, idx) => ({
              id: idx,
              name: t.name || t.lang || `Track ${idx + 1}`,
              lang: t.lang || "",
            }));
            setAudioTracks(tracks);

            let chosenIdx = 0;
            if (reqAudio === "dub") {
              const engIdx = tracks.findIndex(
                (t) => /eng|dub/i.test(t.name) || /eng|en/i.test(t.lang)
              );
              if (engIdx !== -1) chosenIdx = engIdx;
            } else {
              const jpnIdx = tracks.findIndex(
                (t) => /jpn|jap|sub/i.test(t.name) || /jpn|ja/i.test(t.lang)
              );
              if (jpnIdx !== -1) chosenIdx = jpnIdx;
            }

            hls.audioTrack = chosenIdx;
            setSelectedTrackIdx(chosenIdx);
            setActiveTrackName(tracks[chosenIdx]?.name || "Default");
          };

          // Sync Subtitle Tracks from HLS Manifest
          const syncSubtitleTracks = () => {
            const hlsSubs = (hls.subtitleTracks || []).map((t, idx) => ({
              id: `hls-${idx}`,
              hlsIdx: idx,
              label: t.name || t.lang || `HLS Subtitle ${idx + 1}`,
              lang: t.lang || "",
              type: "hls",
            }));

            const combined = [...initialSubs, ...hlsSubs];
            setSubtitlesList(combined);

            // Auto-select English or first subtitle if available
            if (combined.length > 0) {
              const engSub = combined.find((s) => /eng|en/i.test(s.label || s.lang));
              const firstSub = engSub || combined[0];
              handleSelectSubtitle(firstSub.id, combined);
            }
          };

          hls.on(Hls.Events.MANIFEST_PARSED, () => {
            syncAudioTracks();
            syncSubtitleTracks();
          });
          hls.on(Hls.Events.AUDIO_TRACKS_UPDATED, syncAudioTracks);
          hls.on(Hls.Events.SUBTITLE_TRACKS_UPDATED, syncSubtitleTracks);

          hls.on(Hls.Events.AUDIO_TRACK_SWITCHED, (ev, trackData) => {
            setSelectedTrackIdx(trackData.id);
            if (hls.audioTracks[trackData.id]) {
              setActiveTrackName(
                hls.audioTracks[trackData.id].name ||
                  hls.audioTracks[trackData.id].lang ||
                  `Track ${trackData.id + 1}`
              );
            }
          });

          hls.loadSource(proxyUrl);
          if (videoRef.current) {
            hls.attachMedia(videoRef.current);
            videoRef.current.play().catch(() => {});
          }

          setNowPlaying({
            type: "hls",
            provider: data.provider || "auto",
            episode: data.episode || episode,
            audio: data.type || audio,
          });

          setCurlCommand(`curl -H "Referer: ${hlsStream.referer || ""}" "${hlsStream.url}"`);
        } else {
          // Fallback to embed
          const embedStream = data.streams.find((s) => s.type === "embed");
          if (embedStream && iframeRef.current) {
            iframeRef.current.src = embedStream.url;
            setNowPlaying({
              type: "embed",
              provider: data.provider || "auto",
              episode: data.episode || episode,
              audio: data.type || audio,
            });
            setSubtitlesList(initialSubs);
          }
        }
      } else {
        throw new Error("No playable streams returned from providers.");
      }
    } catch (err) {
      setExtractError(err.message);
    } finally {
      setExtracting(false);
    }
  }

  // Handle Audio Track Switch
  function handleAudioTrackChange(idx) {
    const chosen = parseInt(idx, 10);
    setSelectedTrackIdx(chosen);
    if (hlsRef.current) {
      hlsRef.current.audioTrack = chosen;
      if (hlsRef.current.audioTracks[chosen]) {
        setActiveTrackName(
          hlsRef.current.audioTracks[chosen].name ||
            hlsRef.current.audioTracks[chosen].lang ||
            `Track ${chosen + 1}`
        );
      }
    }
  }

  // Copy Curl Command
  function handleCopyCurl() {
    if (!curlCommand) return;
    navigator.clipboard.writeText(curlCommand);
    setCopiedCurl(true);
    setTimeout(() => setCopiedCurl(false), 2000);
  }

  // Copy Proxied Subtitle URL
  function handleCopySubUrl() {
    const currentSub = subtitlesList.find((s) => s.id === selectedSubId);
    if (!currentSub || !currentSub.url) return;
    const urlWithParams = `${apiBase}/proxy_subtitle?url=${encodeURIComponent(
      currentSub.url
    )}&offset=${subOffset.toFixed(1)}&speed=${subSpeed.toFixed(2)}`;
    navigator.clipboard.writeText(urlWithParams);
    setCopiedSubUrl(true);
    setTimeout(() => setCopiedSubUrl(false), 2000);
  }

  // Execute endpoint sandbox request
  async function executeEndpoint(idx) {
    const ep = endpoints[idx];
    setEndpoints((prev) =>
      prev.map((item, i) => (i === idx ? { ...item, loading: true, response: null } : item))
    );

    const fullUrl = ep.url.startsWith("http")
      ? ep.url
      : `${apiBase}${ep.url.startsWith("/") ? "" : "/"}${ep.url}`;

    const t0 = performance.now();
    try {
      const res = await fetch(fullUrl);
      const isJson = (res.headers.get("content-type") || "").includes("json");
      const data = isJson ? await res.json() : await res.text();
      const elapsed = Math.round(performance.now() - t0);
      setEndpoints((prev) =>
        prev.map((item, i) =>
          i === idx
            ? { ...item, loading: false, response: { status: res.status, timeMs: elapsed, data } }
            : item
        )
      );
    } catch (err) {
      const elapsed = Math.round(performance.now() - t0);
      setEndpoints((prev) =>
        prev.map((item, i) =>
          i === idx
            ? {
                ...item,
                loading: false,
                response: { status: 500, timeMs: elapsed, error: err.message },
              }
            : item
        )
      );
    }
  }

  // Filter logs
  const filteredLogs = logFilter
    ? logsText
        .split("\n")
        .filter((line) => line.toLowerCase().includes(logFilter.toLowerCase()))
        .join("\n")
    : logsText;

  const currentSelectedSub = subtitlesList.find((s) => s.id === selectedSubId);

  const activeCue = useMemo(() => {
    if (!parsedCues || parsedCues.length === 0) return null;
    return parsedCues.find((c) => {
      const adjustedStart = c.start * subSpeed + subOffset;
      const adjustedEnd = c.end * subSpeed + subOffset;
      return videoCurrentTime >= adjustedStart && videoCurrentTime <= adjustedEnd;
    });
  }, [parsedCues, subSpeed, subOffset, videoCurrentTime]);

  const nearestNextCue = useMemo(() => {
    if (!parsedCues || parsedCues.length === 0) return null;
    return parsedCues.find((c) => {
      const adjustedStart = c.start * subSpeed + subOffset;
      return adjustedStart > videoCurrentTime;
    });
  }, [parsedCues, subSpeed, subOffset, videoCurrentTime]);

  const nearestPrevCue = useMemo(() => {
    if (!parsedCues || parsedCues.length === 0) return null;
    const prevs = parsedCues.filter((c) => {
      const adjustedStart = c.start * subSpeed + subOffset;
      return adjustedStart < videoCurrentTime - 0.5;
    });
    return prevs.length > 0 ? prevs[prevs.length - 1] : null;
  }, [parsedCues, subSpeed, subOffset, videoCurrentTime]);

  const jumpToCue = (cue) => {
    if (!videoRef.current || !cue) return;
    const targetTime = cue.start * subSpeed + subOffset;
    videoRef.current.currentTime = Math.max(0, targetTime + 0.05);
    updateCurrentCue();
  };

  const toggleContainerFullscreen = () => {
    if (!videoContainerRef.current) return;
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    } else {
      videoContainerRef.current.requestFullscreen().catch(() => {});
    }
  };

  const showOsd = useCallback((icon, text) => {
    if (osdTimeoutRef.current) clearTimeout(osdTimeoutRef.current);
    setOsdBadge({ icon, text });
    osdTimeoutRef.current = setTimeout(() => {
      setOsdBadge(null);
    }, 1200);
  }, []);

  const handleMouseMovePlayer = useCallback(() => {
    setControlsVisible(true);
    if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    if (videoRef.current && !videoRef.current.paused) {
      controlsTimeoutRef.current = setTimeout(() => {
        setControlsVisible(false);
      }, 3000);
    }
  }, []);

  const handleMouseLeavePlayer = useCallback(() => {
    if (videoRef.current && !videoRef.current.paused) {
      if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
      controlsTimeoutRef.current = setTimeout(() => {
        setControlsVisible(false);
      }, 800);
    }
  }, []);

  const togglePlay = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) {
      v.play().catch(() => {});
      showOsd("▶", "Play");
    } else {
      v.pause();
      showOsd("⏸", "Pause");
    }
  }, [showOsd]);

  const handleSkip = useCallback(
    (seconds) => {
      const v = videoRef.current;
      if (!v) return;
      const dur = v.duration || Infinity;
      const newT = Math.max(0, Math.min(dur, v.currentTime + seconds));
      v.currentTime = newT;
      setVideoCurrentTime(newT);
      showOsd(seconds > 0 ? `+${seconds}s ⏩` : `⏪ ${seconds}s`, formatSeconds(newT));
    },
    [showOsd]
  );

  const handleSkipIntro = useCallback(() => {
    handleSkip(85);
    showOsd("⏩", "Skipped Intro (+85s)");
  }, [handleSkip, showOsd]);

  const handleVolumeChange = useCallback((newVol) => {
    const v = videoRef.current;
    if (!v) return;
    const val = Math.max(0, Math.min(1, parseFloat(newVol)));
    v.volume = val;
    v.muted = val === 0;
    setVolume(val);
    setIsMuted(val === 0);
  }, []);

  const toggleMute = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    if (v.muted || v.volume === 0) {
      v.muted = false;
      v.volume = volume > 0 ? volume : 1.0;
      setIsMuted(false);
      showOsd("🔊", `${Math.round(v.volume * 100)}%`);
    } else {
      v.muted = true;
      setIsMuted(true);
      showOsd("🔇", "Muted");
    }
  }, [volume, showOsd]);

  const cycleSpeed = useCallback(() => {
    const speeds = [0.75, 1.0, 1.25, 1.5, 2.0];
    const curIdx = speeds.indexOf(playbackRate);
    const nextSpeed = speeds[(curIdx + 1) % speeds.length];
    setPlaybackRate(nextSpeed);
    if (videoRef.current) {
      videoRef.current.playbackRate = nextSpeed;
    }
    showOsd("⚡", `Speed ${nextSpeed}x`);
  }, [playbackRate, showOsd]);

  const toggleFullscreen = useCallback(() => {
    if (!videoContainerRef.current) return;
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    } else {
      videoContainerRef.current.requestFullscreen().catch(() => {});
    }
  }, []);

  const togglePiP = useCallback(async () => {
    const v = videoRef.current;
    if (!v) return;
    try {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
      } else if (document.pictureInPictureEnabled) {
        await v.requestPictureInPicture();
      }
    } catch (e) {
      console.error("PiP error:", e);
    }
  }, []);

  const handleScrubberMouseMove = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const targetTime = pct * (videoDuration || 0);
    setHoverScrubTime(targetTime);
    setHoverScrubPos(pct * 100);
  };

  const handleScrubberMouseLeave = () => {
    setHoverScrubTime(null);
  };

  const handleScrubberClick = (e) => {
    const v = videoRef.current;
    if (!v || !videoDuration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const newT = pct * videoDuration;
    v.currentTime = newT;
    setVideoCurrentTime(newT);
    showOsd("⏱", formatSeconds(newT));
  };

  // Video playback & buffer event listeners
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const onPlay = () => setIsPlaying(true);
    const onPause = () => {
      setIsPlaying(false);
      setControlsVisible(true);
    };
    const onDuration = () => setVideoDuration(video.duration || 0);
    const onTime = () => setVideoCurrentTime(video.currentTime || 0);
    const onVol = () => {
      setVolume(video.volume);
      setIsMuted(video.muted);
    };
    const onProgress = () => {
      if (video.buffered && video.buffered.length > 0 && video.duration > 0) {
        const ct = video.currentTime;
        let buffEnd = 0;
        for (let i = 0; i < video.buffered.length; i++) {
          if (video.buffered.start(i) <= ct && ct <= video.buffered.end(i)) {
            buffEnd = video.buffered.end(i);
            break;
          }
        }
        if (!buffEnd && video.buffered.length > 0) {
          buffEnd = video.buffered.end(video.buffered.length - 1);
        }
        setBufferedPercent(Math.min(100, (buffEnd / video.duration) * 100));
      }
    };

    video.addEventListener("play", onPlay);
    video.addEventListener("pause", onPause);
    video.addEventListener("durationchange", onDuration);
    video.addEventListener("loadedmetadata", onDuration);
    video.addEventListener("timeupdate", onTime);
    video.addEventListener("volumechange", onVol);
    video.addEventListener("progress", onProgress);

    return () => {
      video.removeEventListener("play", onPlay);
      video.removeEventListener("pause", onPause);
      video.removeEventListener("durationchange", onDuration);
      video.removeEventListener("loadedmetadata", onDuration);
      video.removeEventListener("timeupdate", onTime);
      video.removeEventListener("volumechange", onVol);
      video.removeEventListener("progress", onProgress);
    };
  }, []);

  // Global Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!nowPlaying || nowPlaying.type !== "hls") return;
      if (["INPUT", "TEXTAREA", "SELECT"].includes(document.activeElement?.tagName)) return;

      const video = videoRef.current;
      if (!video) return;

      switch (e.key) {
        case " ":
        case "k":
        case "K":
          e.preventDefault();
          togglePlay();
          break;
        case "f":
        case "F":
          e.preventDefault();
          toggleFullscreen();
          break;
        case "m":
        case "M":
          e.preventDefault();
          toggleMute();
          break;
        case "ArrowRight":
        case "l":
        case "L":
          e.preventDefault();
          handleSkip(10);
          break;
        case "ArrowLeft":
        case "j":
        case "J":
          e.preventDefault();
          handleSkip(-10);
          break;
        case "ArrowUp":
          e.preventDefault();
          handleVolumeChange(Math.min(1, (video.volume || 0) + 0.1));
          showOsd("🔊", `${Math.round(Math.min(1, video.volume + 0.1) * 100)}%`);
          break;
        case "ArrowDown":
          e.preventDefault();
          handleVolumeChange(Math.max(0, (video.volume || 0) - 0.1));
          showOsd("🔉", `${Math.round(Math.max(0, video.volume - 0.1) * 100)}%`);
          break;
        case "i":
        case "s":
          e.preventDefault();
          handleSkipIntro();
          break;
        case "c":
        case "C":
          e.preventDefault();
          if (subtitlesList.length > 0) {
            if (selectedSubId === "none") {
              const first = subtitlesList[0];
              handleSelectSubtitle(first.id);
              showOsd("💬", `CC On (${first.label})`);
            } else {
              handleSelectSubtitle("none");
              showOsd("💬", "CC Off");
            }
          }
          break;
        default:
          if (e.key >= "0" && e.key <= "9" && video.duration) {
            e.preventDefault();
            const pct = parseInt(e.key) / 10;
            video.currentTime = pct * video.duration;
            showOsd("⏱", `${pct * 100}% (${formatSeconds(pct * video.duration)})`);
          }
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [nowPlaying, togglePlay, toggleFullscreen, toggleMute, handleSkip, handleSkipIntro, handleVolumeChange, subtitlesList, selectedSubId, handleSelectSubtitle, showOsd]);

  // Sync fullscreen state
  useEffect(() => {
    const handleFs = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener("fullscreenchange", handleFs);
    return () => document.removeEventListener("fullscreenchange", handleFs);
  }, []);

  return (
    <div className="app-container">
      {/* Header */}
      <header className="app-header">
        <div className="brand-wrapper">
          <div className="brand-logo">K</div>
          <div>
            <h1 className="brand-title">kuhi native studio</h1>
            <p className="brand-subtitle">
              Decrypted multi-provider anime extraction, subtitle sync engine & API studio.
            </p>
          </div>
        </div>

        <div className="header-status-bar">
          <span className={apiOnline ? "pulse-dot" : "pulse-dot-red"}></span>
          <span>
            Backend:{" "}
            <strong style={{ color: apiOnline ? "#34d399" : "#f87171" }}>
              {apiOnline ? "Online (127.0.0.1:8000)" : "Connecting..."}
            </strong>
          </span>
          <span style={{ opacity: 0.3 }}>|</span>
          <span style={{ color: "#a5b4fc", fontWeight: 600 }}>v2.0 Native</span>
        </div>
      </header>

      {/* Disclaimer */}
      <div className="disclaimer-banner">
        <strong>⚠ Developer Notice:</strong> Streaming API is built for research and high-performance proxy routing. Make sure your local FastAPI backend is active on <code>{apiBase}</code>.
      </div>

      {/* Tabs */}
      <nav className="nav-tabs">
        <button
          className={`nav-tab-btn ${activeTab === "player" ? "active" : ""}`}
          onClick={() => setActiveTab("player")}
        >
          🎬 Stream Player & Subtitles
        </button>
        <button
          className={`nav-tab-btn ${activeTab === "explorer" ? "active" : ""}`}
          onClick={() => setActiveTab("explorer")}
        >
          ⚡ API Explorer ({PRESET_ENDPOINTS.length})
        </button>
        <button
          className={`nav-tab-btn ${activeTab === "logs" ? "active" : ""}`}
          onClick={() => setActiveTab("logs")}
        >
          📜 Live Server Logs
        </button>
        <button
          className={`nav-tab-btn ${activeTab === "providers" ? "active" : ""}`}
          onClick={() => setActiveTab("providers")}
        >
          📊 Provider Rankings
        </button>
      </nav>

      {/* TAB 1: Stream Player & Extractor */}
      {activeTab === "player" && (
        <section className="animate-fade-in">
          <div className="glass-card">
            <div className="card-header">
              <div className="card-title">
                <span>Fast Stream Race & Playback</span>
                <span className="pill-badge">Zero Lag Engine</span>
              </div>
              <div style={{ display: "flex", gap: "8px" }}>
                <span className="pill-badge pill-badge-emerald">11 Providers Active</span>
              </div>
            </div>

            {/* Controls Row */}
            <div className="input-row">
              <input
                type="text"
                className="custom-input"
                placeholder="Anime title or AniList ID (e.g. violet-evergarden, 21827)..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleExtract()}
              />

              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <button
                  className="btn-secondary"
                  style={{ padding: "8px 12px" }}
                  onClick={() => setEpisode((prev) => Math.max(1, prev - 1))}
                >
                  -
                </button>
                <input
                  type="number"
                  min="1"
                  className="custom-input"
                  style={{ width: "80px", minWidth: "60px", textAlign: "center" }}
                  value={episode}
                  onChange={(e) => setEpisode(Math.max(1, parseInt(e.target.value) || 1))}
                />
                <button
                  className="btn-secondary"
                  style={{ padding: "8px 12px" }}
                  onClick={() => setEpisode((prev) => prev + 1)}
                >
                  +
                </button>
              </div>

              <select
                className="custom-select"
                value={provider}
                onChange={(e) => setProvider(e.target.value)}
              >
                {PROVIDERS.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} {p.tag ? `(${p.tag})` : ""}
                  </option>
                ))}
              </select>

              <div className="toggle-group">
                <button
                  className={`toggle-option ${audio === "sub" ? "active" : ""}`}
                  onClick={() => setAudio("sub")}
                >
                  SUB
                </button>
                <button
                  className={`toggle-option ${audio === "dub" ? "active" : ""}`}
                  onClick={() => setAudio("dub")}
                >
                  DUB
                </button>
              </div>

              <button
                className="btn-primary"
                onClick={handleExtract}
                disabled={extracting}
              >
                {extracting ? "Racing Providers..." : "Extract & Stream ⚡"}
              </button>
            </div>

            {/* Error banner */}
            {extractError && (
              <div
                style={{
                  background: "rgba(239, 68, 68, 0.15)",
                  border: "1px solid rgba(239, 68, 68, 0.3)",
                  color: "#fca5a5",
                  padding: "12px 16px",
                  borderRadius: "8px",
                  fontSize: "0.85rem",
                  margin: "12px 0",
                }}
              >
                ❌ <strong>Extraction Failed:</strong> {extractError}
              </div>
            )}

            {/* Status bar */}
            {nowPlaying && (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  flexWrap: "wrap",
                  gap: "10px",
                  background: "rgba(16, 185, 129, 0.1)",
                  border: "1px solid rgba(16, 185, 129, 0.3)",
                  padding: "10px 16px",
                  borderRadius: "8px",
                  margin: "14px 0",
                  fontSize: "0.86rem",
                  color: "#6ee7b7",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <span className="pulse-dot"></span>
                  <span>
                    <strong>Streaming Live:</strong> Provider{" "}
                    <code style={{ color: "#fff", background: "#064e3b", padding: "2px 6px", borderRadius: "4px" }}>
                      {nowPlaying.provider.toUpperCase()}
                    </code>{" "}
                    (Episode {nowPlaying.episode}, {nowPlaying.audio.toUpperCase()})
                  </span>
                </div>
                {activeTrackName && (
                  <span style={{ color: "#a7f3d0", fontSize: "0.8rem" }}>
                    Audio: {activeTrackName}
                  </span>
                )}
              </div>
            )}

            {/* Audio Track Selector Strip */}
            {audioTracks.length > 0 && (
              <div className="audio-track-strip">
                <span style={{ color: "#cbd5e1", fontWeight: 600 }}>🎧 Audio Tracks:</span>
                <select
                  className="custom-select"
                  style={{ padding: "6px 12px", fontSize: "0.82rem" }}
                  value={selectedTrackIdx}
                  onChange={(e) => handleAudioTrackChange(e.target.value)}
                >
                  {audioTracks.map((tr) => (
                    <option key={tr.id} value={tr.id}>
                      {tr.name} {tr.lang ? `(${tr.lang})` : ""}
                    </option>
                  ))}
                </select>
                <span style={{ color: "#34d399", fontSize: "0.78rem", marginLeft: "auto" }}>
                  ✓ Instant seamless switch
                </span>
              </div>
            )}

            {/* Video Player Display with Custom Anime Controls & Subtitle Overlay */}
            <div
              className="video-container"
              ref={videoContainerRef}
              onMouseMove={handleMouseMovePlayer}
              onMouseLeave={handleMouseLeavePlayer}
            >
              <video
                ref={videoRef}
                controls={useNativeControls}
                playsInline
                crossOrigin="anonymous"
                style={{ display: nowPlaying?.type === "hls" ? "block" : "none" }}
              >
                {currentSelectedSub?.url && currentSelectedSub.type === "external" && (
                  <track
                    key={`${currentSelectedSub.id}-${subOffset.toFixed(1)}-${subSpeed.toFixed(2)}`}
                    kind="subtitles"
                    label={currentSelectedSub.label || "Subtitles"}
                    srcLang={currentSelectedSub.lang || "en"}
                    src={`${apiBase}/proxy_subtitle?url=${encodeURIComponent(
                      currentSelectedSub.url
                    )}&referer=${encodeURIComponent(currentSelectedSub.referer || "")}&offset=${subOffset.toFixed(1)}&speed=${subSpeed.toFixed(2)}`}
                    default
                  />
                )}
              </video>
              <iframe
                ref={iframeRef}
                allowFullScreen
                style={{ display: nowPlaying?.type === "embed" ? "block" : "none" }}
              />

              {/* Custom Player Controls Suite (Active for HLS streams) */}
              {nowPlaying?.type === "hls" && !useNativeControls && (
                <div
                  className={`custom-player-overlay ${
                    controlsVisible ? "controls-visible" : "controls-hidden"
                  }`}
                >
                  {/* Top Bar: Title, Episode, Skip Intro, Native Switch */}
                  <div className="player-top-bar">
                    <div className="player-title-info">
                      <span className="pulse-dot"></span>
                      <span>
                        {query.toUpperCase()} • Ep {episode}
                      </span>
                      <span className="pill-badge" style={{ fontSize: "0.68rem" }}>
                        {audio.toUpperCase()} • {nowPlaying.provider.toUpperCase()}
                      </span>
                    </div>

                    <div className="player-top-actions">
                      <button
                        className="player-pill-action"
                        onClick={handleSkipIntro}
                        title="Skip Opening Theme (+85s) [I]"
                      >
                        ⚡ Skip Intro (+85s)
                      </button>
                      <button
                        className="player-speed-badge"
                        onClick={() => setUseNativeControls(true)}
                        title="Switch to default browser native controls"
                      >
                        Native UI
                      </button>
                    </div>
                  </div>

                  {/* Center Clickable Action Surface & OSD Badge */}
                  <div
                    className="player-center-surface"
                    onClick={togglePlay}
                    onDoubleClick={toggleFullscreen}
                  >
                    {osdBadge && (
                      <div className="player-osd-badge">
                        <span>{osdBadge.icon}</span>
                        <span>{osdBadge.text}</span>
                      </div>
                    )}
                  </div>

                  {/* Bottom Controls Bar */}
                  <div className="player-bottom-bar">
                    {/* Interactive Scrubber / Progress Bar */}
                    <div
                      className="player-scrubber-container"
                      onClick={handleScrubberClick}
                      onMouseMove={handleScrubberMouseMove}
                      onMouseLeave={handleScrubberMouseLeave}
                    >
                      <div className="player-scrubber-track">
                        <div
                          className="player-scrubber-buffer"
                          style={{ width: `${bufferedPercent}%` }}
                        />
                        <div
                          className="player-scrubber-played"
                          style={{
                            width: `${
                              videoDuration > 0
                                ? (videoCurrentTime / videoDuration) * 100
                                : 0
                            }%`,
                          }}
                        />
                        <div
                          className="player-scrubber-thumb"
                          style={{
                            left: `${
                              videoDuration > 0
                                ? (videoCurrentTime / videoDuration) * 100
                                : 0
                            }%`,
                          }}
                        />

                        {hoverScrubTime !== null && (
                          <div
                            className="player-scrubber-tooltip"
                            style={{ left: `${hoverScrubPos}%` }}
                          >
                            {formatSeconds(hoverScrubTime)}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Controls Row */}
                    <div className="player-controls-row">
                      {/* Left: Play/Pause, Skips, Volume, Time */}
                      <div className="player-controls-left">
                        <button
                          className="player-btn"
                          onClick={togglePlay}
                          title={isPlaying ? "Pause (Space)" : "Play (Space)"}
                        >
                          {isPlaying ? "⏸" : "▶"}
                        </button>

                        <button
                          className="player-btn"
                          onClick={() => handleSkip(-10)}
                          title="Rewind 10s (← / J)"
                        >
                          ↺ 10s
                        </button>
                        <button
                          className="player-btn"
                          onClick={() => handleSkip(10)}
                          title="Forward 10s (→ / L)"
                        >
                          10s ↻
                        </button>

                        {/* Volume Control */}
                        <div className="player-volume-group">
                          <button
                            className="player-btn"
                            onClick={toggleMute}
                            title={isMuted ? "Unmute (M)" : "Mute (M)"}
                          >
                            {isMuted || volume === 0
                              ? "🔇"
                              : volume < 0.5
                              ? "🔉"
                              : "🔊"}
                          </button>
                          <input
                            type="range"
                            min="0"
                            max="1"
                            step="0.05"
                            className="player-volume-slider"
                            value={isMuted ? 0 : volume}
                            onChange={(e) => handleVolumeChange(e.target.value)}
                            title={`Volume: ${Math.round((isMuted ? 0 : volume) * 100)}%`}
                          />
                        </div>

                        {/* Time Indicator */}
                        <div className="player-time-display">
                          <span>{formatSeconds(videoCurrentTime)}</span>
                          <span style={{ opacity: 0.5, margin: "0 4px" }}>/</span>
                          <span style={{ opacity: 0.8 }}>
                            {formatSeconds(videoDuration)}
                          </span>
                        </div>
                      </div>

                      {/* Right: Audio Track, Subtitle (CC), Speed, PiP, Fullscreen */}
                      <div className="player-controls-right">
                        {/* Audio Track Badge */}
                        {audioTracks.length > 0 && (
                          <button
                            className="player-btn"
                            onClick={() => {
                              const nextIdx = (selectedTrackIdx + 1) % audioTracks.length;
                              handleAudioTrackChange(nextIdx);
                              showOsd("🎧", `Audio: ${audioTracks[nextIdx]?.name || "Track"}`);
                            }}
                            title={`Audio Track: ${activeTrackName} (Click to cycle)`}
                          >
                            🎧 <span style={{ fontSize: "0.72rem", marginLeft: "4px" }}>{activeTrackName.slice(0, 8)}</span>
                          </button>
                        )}

                        {/* Subtitle CC toggle */}
                        {subtitlesList.length > 0 && (
                          <button
                            className={`player-btn ${
                              selectedSubId !== "none" ? "active" : ""
                            }`}
                            onClick={() => {
                              if (selectedSubId === "none") {
                                const first = subtitlesList[0];
                                handleSelectSubtitle(first.id);
                                showOsd("💬", `CC On (${first.label})`);
                              } else {
                                handleSelectSubtitle("none");
                                showOsd("💬", "CC Off");
                              }
                            }}
                            title={`Subtitles [C]: ${selectedSubId !== "none" ? "Enabled" : "Disabled"}`}
                          >
                            [CC]
                          </button>
                        )}

                        {/* Speed Picker */}
                        <button
                          className="player-speed-badge"
                          onClick={cycleSpeed}
                          title="Click to cycle playback speed (0.75x, 1x, 1.25x, 1.5x, 2x)"
                        >
                          {playbackRate}x
                        </button>

                        {/* Picture-in-Picture */}
                        <button
                          className="player-btn"
                          onClick={togglePiP}
                          title="Picture-in-Picture"
                        >
                          ⧉
                        </button>

                        {/* Fullscreen Toggle */}
                        <button
                          className="player-btn"
                          onClick={toggleFullscreen}
                          title={isFullscreen ? "Exit Fullscreen (F)" : "Fullscreen (F)"}
                        >
                          {isFullscreen ? "🗗" : "⛶"}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Native Controls Return Switch (if user switched to native) */}
              {nowPlaying?.type === "hls" && useNativeControls && (
                <div style={{ position: "absolute", top: "12px", right: "12px", zIndex: 35 }}>
                  <button
                    className="player-pill-action"
                    style={{ background: "rgba(99, 102, 241, 0.85)" }}
                    onClick={() => setUseNativeControls(false)}
                    title="Switch to Custom Anime Video Player Controls"
                  >
                    ★ Switch to Custom UI
                  </button>
                </div>
              )}

              {/* Real-time Subtitle Cue Overlay with dynamic float height */}
              {currentCueText && (subDisplayMode === "overlay" || subDisplayMode === "both") && (
                <div
                  className={`subtitle-overlay-container ${
                    controlsVisible && nowPlaying?.type === "hls" && !useNativeControls
                      ? "controls-active"
                      : ""
                  }`}
                >
                  <div
                    className={`subtitle-cue-box ${
                      subSize === "sm"
                        ? "subtitle-cue-sm"
                        : subSize === "lg"
                        ? "subtitle-cue-lg"
                        : "subtitle-cue-md"
                    }`}
                  >
                    {currentCueText}
                  </div>
                </div>
              )}

              {!nowPlaying && (
                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "var(--text-dim)",
                    gap: "12px",
                  }}
                >
                  <div style={{ fontSize: "2.5rem" }}>▶</div>
                  <p style={{ fontSize: "0.9rem" }}>Select an anime and click &apos;Extract &amp; Stream&apos; to start playback</p>
                </div>
              )}
            </div>

            {/* SUBTITLE CONTROLS PANEL */}
            <div className="sub-panel">
              <div className="sub-panel-header">
                <div className="sub-panel-title">
                  <span>💬 Subtitle & Sync Studio</span>
                  <span
                    className={`sub-badge ${
                      subOffset === 0 && subSpeed === 1.0
                        ? "sub-badge-synced"
                        : "sub-badge-shifted"
                    }`}
                  >
                    {subOffset === 0 && subSpeed === 1.0
                      ? "In Sync (0.0s, 1.00x)"
                      : `Offset: ${subOffset > 0 ? "+" : ""}${subOffset.toFixed(1)}s | Speed: ${subSpeed.toFixed(2)}x`}
                  </span>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                  {/* Subtitle Render Mode */}
                  <div className="sub-bump-row">
                    <button
                      className={`sub-bump-btn ${subDisplayMode === "overlay" ? "active" : ""}`}
                      style={{ padding: "3px 8px", fontSize: "0.75rem" }}
                      onClick={() => setSubDisplayMode("overlay")}
                      title="Styled Overlay with custom font size, outline, and zero-latency offset"
                    >
                      Styled Overlay
                    </button>
                    <button
                      className={`sub-bump-btn ${subDisplayMode === "native" ? "active" : ""}`}
                      style={{ padding: "3px 8px", fontSize: "0.75rem" }}
                      onClick={() => setSubDisplayMode("native")}
                      title="Native HTML5 / Fullscreen CC track"
                    >
                      Native CC
                    </button>
                    <button
                      className={`sub-bump-btn ${subDisplayMode === "both" ? "active" : ""}`}
                      style={{ padding: "3px 8px", fontSize: "0.75rem" }}
                      onClick={() => setSubDisplayMode("both")}
                      title="Render both styled overlay and native captions"
                    >
                      Both
                    </button>
                  </div>

                  {/* Size selector */}
                  <span style={{ fontSize: "0.78rem", color: "var(--text-muted)", marginLeft: "4px" }}>Size:</span>
                  <div className="sub-bump-row">
                    {["sm", "md", "lg"].map((sz) => (
                      <button
                        key={sz}
                        className={`sub-bump-btn ${subSize === sz ? "active" : ""}`}
                        style={{ padding: "3px 8px", fontSize: "0.75rem" }}
                        onClick={() => setSubSize(sz)}
                      >
                        {sz.toUpperCase()}
                      </button>
                    ))}
                  </div>

                  <button
                    className="btn-secondary"
                    style={{ padding: "4px 10px", fontSize: "0.75rem" }}
                    onClick={toggleContainerFullscreen}
                    title="Fullscreen container with styled subtitle overlay"
                  >
                    ⛶ Fullscreen
                  </button>

                  {currentSelectedSub?.url && (
                    <button
                      className="btn-secondary"
                      style={{ padding: "4px 10px", fontSize: "0.75rem" }}
                      onClick={handleCopySubUrl}
                    >
                      {copiedSubUrl ? "✓ Copied VTT" : "Copy VTT URL"}
                    </button>
                  )}
                </div>
              </div>

              {/* Live Dialogue Navigator Banner */}
              {selectedSubId !== "none" && parsedCues.length > 0 && (
                <div className="sub-status-banner">
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "10px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", flex: 1, minWidth: "260px" }}>
                      <span className={activeCue ? "pulse-dot" : "pulse-dot-amber"}></span>
                      <div style={{ fontSize: "0.85rem", color: "#f8fafc" }}>
                        {activeCue ? (
                          <span>
                            <strong style={{ color: "#34d399" }}>Dialogue Active ({formatSeconds(videoCurrentTime)}):</strong> &ldquo;{activeCue.text}&rdquo;
                          </span>
                        ) : (
                          <span>
                            <span style={{ color: "var(--text-muted)" }}>Silence at {formatSeconds(videoCurrentTime)}.</span>
                            {nearestNextCue && (
                              <span style={{ marginLeft: "6px", color: "#93c5fd" }}>
                                Next line at {formatSeconds(nearestNextCue.start * subSpeed + subOffset)} (in {Math.max(0, nearestNextCue.start * subSpeed + subOffset - videoCurrentTime).toFixed(1)}s): &ldquo;{nearestNextCue.text.slice(0, 36)}...&rdquo;
                              </span>
                            )}
                          </span>
                        )}
                      </div>
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                      {subOffset !== 0.0 && (
                        <button
                          className="sub-bump-btn"
                          style={{ background: "#78350f", color: "#fde68a", borderColor: "#b45309", padding: "4px 10px", fontSize: "0.75rem" }}
                          onClick={() => setSubOffset(0.0)}
                          title="Reset offset to 0.0s to sync with original broadcast audio"
                        >
                          ↺ Reset Offset ({subOffset > 0 ? `+${subOffset.toFixed(1)}s` : `${subOffset.toFixed(1)}s`})
                        </button>
                      )}
                      {nearestPrevCue && (
                        <button
                          className="btn-secondary"
                          style={{ padding: "4px 10px", fontSize: "0.75rem" }}
                          onClick={() => jumpToCue(nearestPrevCue)}
                          title={`Jump to: "${nearestPrevCue.text}"`}
                        >
                          ⏮ Prev ({formatSeconds(nearestPrevCue.start * subSpeed + subOffset)})
                        </button>
                      )}
                      {nearestNextCue && (
                        <button
                          className="btn-primary"
                          style={{ padding: "4px 10px", fontSize: "0.75rem" }}
                          onClick={() => jumpToCue(nearestNextCue)}
                          title={`Jump to: "${nearestNextCue.text}"`}
                        >
                          ⚡ Jump to Next ({formatSeconds(nearestNextCue.start * subSpeed + subOffset)})
                        </button>
                      )}
                      <button
                        className="btn-secondary"
                        style={{ padding: "4px 10px", fontSize: "0.75rem" }}
                        onClick={() => setShowScriptList(!showScriptList)}
                      >
                        {showScriptList ? "Hide Script ▲" : "Show Script ▼"}
                      </button>
                    </div>
                  </div>

                  {/* Collapsible Dialogue Script List */}
                  {showScriptList && (
                    <div
                      style={{
                        marginTop: "10px",
                        maxHeight: "180px",
                        overflowY: "auto",
                        background: "rgba(0, 0, 0, 0.4)",
                        borderRadius: "6px",
                        padding: "8px 12px",
                        border: "1px solid rgba(255, 255, 255, 0.06)",
                        display: "flex",
                        flexDirection: "column",
                        gap: "4px",
                      }}
                    >
                      {parsedCues.map((c, i) => {
                        const adjStart = c.start * subSpeed + subOffset;
                        const isCurrent = activeCue === c;
                        return (
                          <div
                            key={i}
                            onClick={() => jumpToCue(c)}
                            style={{
                              display: "flex",
                              gap: "10px",
                              padding: "4px 8px",
                              borderRadius: "4px",
                              cursor: "pointer",
                              fontSize: "0.78rem",
                              background: isCurrent ? "rgba(99, 102, 241, 0.3)" : "transparent",
                              color: isCurrent ? "#fff" : "#cbd5e1",
                            }}
                          >
                            <span style={{ color: "#a5b4fc", fontFamily: "var(--font-mono)", minWidth: "48px" }}>
                              {formatSeconds(adjStart)}
                            </span>
                            <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                              {c.text}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              <div className="sub-controls-grid">
                {/* 1. Track Switcher */}
                <div className="sub-control-block">
                  <div className="sub-control-label">
                    <span>1. Active Subtitle Track</span>
                    <span style={{ fontSize: "0.75rem", color: "#a5b4fc" }}>
                      {subtitlesList.length} Tracks Available
                    </span>
                  </div>

                  <select
                    className="custom-select"
                    value={selectedSubId}
                    onChange={(e) => handleSelectSubtitle(e.target.value)}
                    style={{ width: "100%" }}
                  >
                    <option value="none">Off / No Subtitles</option>
                    {subtitlesList.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.label} {s.lang ? `[${s.lang}]` : ""} ({s.type === "hls" ? "Embedded HLS" : s.format?.toUpperCase() || "VTT"})
                      </option>
                    ))}
                  </select>

                  <div style={{ fontSize: "0.75rem", color: "var(--text-dim)", marginTop: "2px" }}>
                    Switch between external VTT tracks and embedded HLS captions seamlessly.
                  </div>
                </div>

                {/* 2. Timing Offset / Startpoint Adjuster */}
                <div className="sub-control-block">
                  <div className="sub-control-label">
                    <span>2. Startpoint & Timing Offset</span>
                    <span style={{ color: subOffset === 0 ? "#34d399" : "#fbbf24", fontFamily: "var(--font-mono)" }}>
                      {subOffset > 0 ? `+${subOffset.toFixed(1)}s` : `${subOffset.toFixed(1)}s`}
                    </span>
                  </div>

                  {/* Quick bump buttons */}
                  <div className="sub-bump-row">
                    <button className="sub-bump-btn" onClick={() => setSubOffset((o) => Math.round((o - 2.0) * 10) / 10)}>
                      -2s
                    </button>
                    <button className="sub-bump-btn" onClick={() => setSubOffset((o) => Math.round((o - 0.5) * 10) / 10)}>
                      -0.5s
                    </button>
                    <button className="sub-bump-btn" onClick={() => setSubOffset((o) => Math.round((o - 0.1) * 10) / 10)}>
                      -0.1s
                    </button>
                    <button
                      className={`sub-bump-btn ${subOffset === 0 ? "active" : ""}`}
                      onClick={() => setSubOffset(0.0)}
                    >
                      Reset 0s
                    </button>
                    <button className="sub-bump-btn" onClick={() => setSubOffset((o) => Math.round((o + 0.1) * 10) / 10)}>
                      +0.1s
                    </button>
                    <button className="sub-bump-btn" onClick={() => setSubOffset((o) => Math.round((o + 0.5) * 10) / 10)}>
                      +0.5s
                    </button>
                    <button className="sub-bump-btn" onClick={() => setSubOffset((o) => Math.round((o + 2.0) * 10) / 10)}>
                      +2s
                    </button>
                  </div>

                  {/* Precision slider */}
                  <input
                    type="range"
                    min="-10.0"
                    max="10.0"
                    step="0.1"
                    className="sub-slider"
                    value={subOffset}
                    onChange={(e) => setSubOffset(parseFloat(e.target.value))}
                  />
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.7rem", color: "var(--text-dim)" }}>
                    <span>-10s (Earlier)</span>
                    <span>0s (Default)</span>
                    <span>+10s (Later)</span>
                  </div>
                </div>

                {/* 3. Subtitle Speed Sync Multiplier */}
                <div className="sub-control-block">
                  <div className="sub-control-label">
                    <span>3. Subtitle Speed Multiplier</span>
                    <span style={{ color: subSpeed === 1.0 ? "#34d399" : "#a5b4fc", fontFamily: "var(--font-mono)" }}>
                      {subSpeed.toFixed(2)}x
                    </span>
                  </div>

                  <div className="sub-bump-row">
                    <button className="sub-bump-btn" onClick={() => setSubSpeed((s) => Math.max(0.5, Math.round((s - 0.05) * 100) / 100))}>
                      0.95x
                    </button>
                    <button className="sub-bump-btn" onClick={() => setSubSpeed((s) => Math.max(0.5, Math.round((s - 0.01) * 100) / 100))}>
                      -0.01x
                    </button>
                    <button
                      className={`sub-bump-btn ${subSpeed === 1.0 ? "active" : ""}`}
                      onClick={() => setSubSpeed(1.0)}
                    >
                      1.00x Normal
                    </button>
                    <button className="sub-bump-btn" onClick={() => setSubSpeed((s) => Math.min(2.0, Math.round((s + 0.01) * 100) / 100))}>
                      +0.01x
                    </button>
                    <button className="sub-bump-btn" onClick={() => setSubSpeed((s) => Math.min(2.0, Math.round((s + 0.05) * 100) / 100))}>
                      1.05x
                    </button>
                  </div>

                  <div style={{ fontSize: "0.75rem", color: "var(--text-dim)", marginTop: "2px" }}>
                    Fixes frame-rate drift if subtitle timing runs faster or slower than audio over time.
                  </div>
                </div>
              </div>
            </div>

            {/* cURL Copy Box */}
            {curlCommand && (
              <div
                style={{
                  background: "var(--bg-input)",
                  border: "1px solid var(--border-subtle)",
                  borderRadius: "8px",
                  padding: "12px 16px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: "12px",
                  marginTop: "16px",
                }}
              >
                <code
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: "0.78rem",
                    color: "#cbd5e1",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {curlCommand}
                </code>
                <button className="btn-secondary" onClick={handleCopyCurl}>
                  {copiedCurl ? "✓ Copied" : "Copy cURL"}
                </button>
              </div>
            )}

            {/* Raw JSON inspection */}
            {extractResult && (
              <div style={{ marginTop: "20px" }}>
                <details>
                  <summary
                    style={{
                      cursor: "pointer",
                      fontSize: "0.84rem",
                      color: "var(--text-muted)",
                      marginBottom: "8px",
                    }}
                  >
                    View Complete Stream &amp; Subtitle Metadata JSON ({extractResult.streams?.length || 0} streams, {subtitlesList.length} subtitles)
                  </summary>
                  <pre className="code-block">
                    {JSON.stringify(extractResult, null, 2)}
                  </pre>
                </details>
              </div>
            )}
          </div>
        </section>
      )}

      {/* TAB 2: API Explorer & Sandbox */}
      {activeTab === "explorer" && (
        <section className="animate-fade-in">
          <div style={{ marginBottom: "20px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <h2 style={{ fontSize: "1.2rem", fontWeight: 700 }}>Interactive API Sandbox</h2>
            <span style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>
              All endpoints CORS-enabled with real-time subtitle proxies
            </span>
          </div>

          {endpoints.map((ep, idx) => (
            <div key={idx} className="glass-card">
              <div className="card-header">
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <span
                    style={{
                      background: "#22c55e",
                      color: "#000",
                      fontWeight: 800,
                      fontSize: "0.72rem",
                      padding: "3px 7px",
                      borderRadius: "4px",
                    }}
                  >
                    {ep.method}
                  </span>
                  <code style={{ fontFamily: "var(--font-mono)", fontSize: "0.95rem" }}>
                    {ep.path}
                  </code>
                </div>
                <span className="pill-badge">{ep.tag}</span>
              </div>

              <p style={{ color: "var(--text-muted)", fontSize: "0.88rem", marginBottom: "14px" }}>
                {ep.desc}
              </p>

              <div className="input-row">
                <input
                  type="text"
                  className="custom-input"
                  value={ep.url}
                  onChange={(e) => {
                    const val = e.target.value;
                    setEndpoints((prev) =>
                      prev.map((item, i) => (i === idx ? { ...item, url: val } : item))
                    );
                  }}
                  onKeyDown={(e) => e.key === "Enter" && executeEndpoint(idx)}
                />
                <button
                  className="btn-primary"
                  onClick={() => executeEndpoint(idx)}
                  disabled={ep.loading}
                >
                  {ep.loading ? "Executing..." : "Execute ⚡"}
                </button>
              </div>

              {ep.response && (
                <div style={{ marginTop: "14px" }}>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      fontSize: "0.8rem",
                      marginBottom: "6px",
                      color: "var(--text-muted)",
                    }}
                  >
                    <span>
                      Status:{" "}
                      <strong
                        style={{
                          color: ep.response.status === 200 ? "#34d399" : "#f87171",
                        }}
                      >
                        {ep.response.status}
                      </strong>{" "}
                      ({ep.response.timeMs}ms)
                    </span>
                    <button
                      style={{
                        background: "transparent",
                        border: "none",
                        color: "#a5b4fc",
                        cursor: "pointer",
                        fontSize: "0.78rem",
                      }}
                      onClick={() =>
                        navigator.clipboard.writeText(
                          typeof ep.response.data === "string"
                            ? ep.response.data
                            : JSON.stringify(ep.response.data || ep.response.error, null, 2)
                        )
                      }
                    >
                      Copy Response
                    </button>
                  </div>
                  <pre className="code-block">
                    {typeof ep.response.data === "string"
                      ? ep.response.data
                      : JSON.stringify(ep.response.data || ep.response.error, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          ))}
        </section>
      )}

      {/* TAB 3: Live Server Logs */}
      {activeTab === "logs" && (
        <section className="animate-fade-in">
          <div className="glass-card">
            <div className="card-header">
              <div className="card-title">
                <span className="pulse-dot"></span>
                <span>Live Disk Activity Stream</span>
                <span className="pill-badge pill-badge-emerald">Disk Persisted</span>
              </div>
              <div style={{ display: "flex", gap: "10px" }}>
                <a
                  href={`${apiBase}/logs/raw?lines=200`}
                  target="_blank"
                  rel="noreferrer"
                  className="btn-secondary"
                >
                  Raw File ↗
                </a>
                <a
                  href={`${apiBase}/logs/stats`}
                  target="_blank"
                  rel="noreferrer"
                  className="btn-secondary"
                >
                  Disk Stats ↗
                </a>
              </div>
            </div>

            <p style={{ color: "var(--text-muted)", fontSize: "0.88rem", marginBottom: "16px" }}>
              Real-time monitoring of provider races, segment streaming latency, and cache hits saved to <code>logs/api.log</code>.
            </p>

            <div className="input-row" style={{ alignItems: "center" }}>
              <input
                type="text"
                className="custom-input"
                placeholder="Filter logs (e.g. RACE, PROXY, EXTRACT, miruro)..."
                value={logFilter}
                onChange={(e) => setLogFilter(e.target.value)}
              />

              <label
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  fontSize: "0.84rem",
                  color: "var(--text-muted)",
                  cursor: "pointer",
                }}
              >
                <input
                  type="checkbox"
                  checked={autoLogs}
                  onChange={(e) => setAutoLogs(e.target.checked)}
                />
                Auto-Refresh (2s)
              </label>

              <button
                className="btn-secondary"
                onClick={() => {
                  fetch(`${apiBase}/logs/raw?lines=100`)
                    .then((res) => res.text())
                    .then((t) => setLogsText(t));
                }}
              >
                Refresh Now
              </button>

              <button
                className="btn-secondary"
                onClick={() => navigator.clipboard.writeText(logsText)}
              >
                Copy All
              </button>
            </div>

            <pre ref={terminalRef} className="terminal-window">
              {filteredLogs}
            </pre>
          </div>
        </section>
      )}

      {/* TAB 4: Provider Rankings & Status */}
      {activeTab === "providers" && (
        <section className="animate-fade-in">
          <div className="glass-card">
            <div className="card-header">
              <div className="card-title">
                <span>Streaming Provider Race Rankings</span>
                <span className="pill-badge">Real-time Bench</span>
              </div>
              <button
                className="btn-secondary"
                onClick={loadProviders}
                disabled={loadingProviders}
              >
                {loadingProviders ? "Checking..." : "Refresh Status"}
              </button>
            </div>

            <p style={{ color: "var(--text-muted)", fontSize: "0.88rem", marginBottom: "20px" }}>
              Dynamic provider health and priority order. Fastest responding stream server wins the race.
            </p>

            {providersData && (
              <pre className="code-block">
                {JSON.stringify(providersData, null, 2)}
              </pre>
            )}
          </div>
        </section>
      )}

      {/* Footer */}
      <footer className="app-footer">
        <p>Kuhi Native 2.0 Anime Streaming Platform</p>
        <p style={{ opacity: 0.6 }}>
          FastAPI High-Speed Core + Next.js Dynamic Client Studio
        </p>
      </footer>
    </div>
  );
}
