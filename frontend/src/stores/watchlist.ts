import { create } from "zustand";
import { persist } from "zustand/middleware";
import { WatchlistItem, WatchlistStatus } from "@/types/user";
import { api } from "@/lib/api";
import { useAuthStore } from "./auth";

interface WatchlistState {
  items: WatchlistItem[];
  isLoading: boolean;
  loadWatchlist: (status?: string) => Promise<void>;
  addItem: (item: Partial<WatchlistItem> & { animeId: number; animeTitle: string }) => Promise<void>;
  updateItem: (animeId: number, data: Partial<WatchlistItem>) => Promise<void>;
  removeItem: (animeId: number) => Promise<void>;
  getItem: (animeId: number) => WatchlistItem | undefined;
}

export const useWatchlistStore = create<WatchlistState>()(
  persist(
    (set, get) => ({
      items: [],
      isLoading: false,

      loadWatchlist: async (status) => {
        if (!useAuthStore.getState().isAuthenticated) {
          return;
        }
        set({ isLoading: true });
        try {
          const items = await api.getWatchlist(status);
          if (Array.isArray(items)) {
            set({ items, isLoading: false });
          } else {
            set({ isLoading: false });
          }
        } catch {
          // If unauthenticated, keep local items
          set({ isLoading: false });
        }
      },

      addItem: async (itemData) => {
        const newItem: WatchlistItem = {
          id: Date.now(),
          animeId: itemData.animeId,
          animeTitle: itemData.animeTitle,
          animePoster: itemData.animePoster || null,
          animeFormat: itemData.animeFormat || null,
          animeYear: itemData.animeYear || null,
          status: (itemData.status as WatchlistStatus) || "PLANNING",
          progress: itemData.progress || 0,
          totalEpisodes: itemData.totalEpisodes || null,
          score: itemData.score || null,
          notes: itemData.notes || null,
          updatedAt: new Date().toISOString(),
        };

        // Optimistic local update
        set((state) => ({
          items: [newItem, ...state.items.filter((i) => i.animeId !== itemData.animeId)],
        }));

        if (!useAuthStore.getState().isAuthenticated) {
          return;
        }

        try {
          const saved = await api.updateWatchlist({
            animeId: itemData.animeId,
            animeTitle: itemData.animeTitle,
            animePoster: itemData.animePoster,
            animeFormat: itemData.animeFormat,
            animeYear: itemData.animeYear,
            status: newItem.status,
            progress: newItem.progress,
            totalEpisodes: newItem.totalEpisodes,
            score: newItem.score,
            notes: newItem.notes,
          });
          if (saved) {
            set((state) => ({
              items: state.items.map((i) => (i.animeId === itemData.animeId ? saved : i)),
            }));
          }
        } catch {
          // Keep local state for guests
        }
      },

      updateItem: async (animeId, data) => {
        set((state) => ({
          items: state.items.map((i) =>
            i.animeId === animeId
              ? { ...i, ...data, updatedAt: new Date().toISOString() }
              : i
          ),
        }));

        if (!useAuthStore.getState().isAuthenticated) {
          return;
        }

        try {
          await api.patchWatchlist(animeId, data);
        } catch {
          // Keep local changes
        }
      },

      removeItem: async (animeId) => {
        set((state) => ({
          items: state.items.filter((i) => i.animeId !== animeId),
        }));

        if (!useAuthStore.getState().isAuthenticated) {
          return;
        }

        try {
          await api.deleteWatchlistItem(animeId);
        } catch {
          // Guest mode fallback
        }
      },

      getItem: (animeId) => {
        return get().items.find((i) => i.animeId === animeId);
      },
    }),
    {
      name: "kuromi-watchlist",
    }
  )
);
