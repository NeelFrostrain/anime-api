import { create } from "zustand";
import { persist } from "zustand/middleware";
import { HistoryItem } from "@/types/user";
import { api } from "@/lib/api";
import { useAuthStore } from "./auth";

interface HistoryState {
  items: HistoryItem[];
  loadHistory: () => Promise<void>;
  recordProgress: (data: {
    animeId: number;
    animeTitle: string;
    animePoster?: string | null;
    episode: number;
    episodeTitle?: string | null;
    playbackPosition: number;
    playbackDuration: number;
  }) => Promise<void>;
  getItem: (animeId: number) => HistoryItem | undefined;
}

let syncTimeout: ReturnType<typeof setTimeout> | null = null;

export const useHistoryStore = create<HistoryState>()(
  persist(
    (set, get) => ({
      items: [],

      loadHistory: async () => {
        // Only fetch remote history if authenticated
        if (!useAuthStore.getState().isAuthenticated) {
          return;
        }
        try {
          const items = await api.getHistory(30);
          if (Array.isArray(items)) {
            set({ items });
          }
        } catch {
          // Keep local storage items for guest
        }
      },

      recordProgress: async (data) => {
        const updated: HistoryItem = {
          id: Date.now(),
          animeId: data.animeId,
          animeTitle: data.animeTitle,
          animePoster: data.animePoster || null,
          episode: data.episode,
          episodeTitle: data.episodeTitle || null,
          playbackPosition: data.playbackPosition,
          playbackDuration: data.playbackDuration,
          updatedAt: new Date().toISOString(),
        };

        // Always update local Zustand state and localStorage for guest playback resume
        set((state) => ({
          items: [updated, ...state.items.filter((i) => i.animeId !== data.animeId)],
        }));

        // Never make backend calls if user is a guest (prevents 401 Unauthorized errors)
        if (!useAuthStore.getState().isAuthenticated) {
          return;
        }

        // Debounce backend sync for authenticated users (sync every 3 seconds max)
        if (syncTimeout) {
          clearTimeout(syncTimeout);
        }
        syncTimeout = setTimeout(async () => {
          try {
            await api.updateHistory(data);
          } catch {
            // Backend sync fallback
          }
        }, 3000);
      },

      getItem: (animeId) => {
        return get().items.find((i) => i.animeId === animeId);
      },
    }),
    {
      name: "kuromi-history",
    }
  )
);
