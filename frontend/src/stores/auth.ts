import { create } from "zustand";
import { persist } from "zustand/middleware";
import { User } from "@/types/user";
import { api } from "@/lib/api";

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  setUser: (user: User | null) => void;
  checkAuth: () => Promise<void>;
  logout: () => Promise<void>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      isAuthenticated: false,
      isLoading: true,

      setUser: (user) => set({ user, isAuthenticated: !!user, isLoading: false }),

      checkAuth: async () => {
        set({ isLoading: true });
        try {
          const user = await api.getMe();
          if (user && user.id) {
            set({ user, isAuthenticated: true, isLoading: false });
          } else {
            set({ user: null, isAuthenticated: false, isLoading: false });
          }
        } catch {
          set({ user: null, isAuthenticated: false, isLoading: false });
        }
      },

      logout: async () => {
        try {
          await api.logout();
        } catch {}
        set({ user: null, isAuthenticated: false, isLoading: false });
      },
    }),
    {
      name: "kuromi-auth",
    }
  )
);
