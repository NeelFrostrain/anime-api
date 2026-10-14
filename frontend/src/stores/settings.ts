import { create } from "zustand";
import { persist } from "zustand/middleware";
import { UserSettings } from "@/types/user";

interface SettingsState extends UserSettings {
  isAmoled: boolean;
  setTitleLanguage: (lang: "english" | "romaji" | "native") => void;
  setThemeAccent: (color: string) => void;
  setAdultFilter: (enabled: boolean) => void;
  setAmoled: (enabled: boolean) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      titleLanguage: "english",
      themeAccent: "#8b7cf6",
      adultFilter: true,
      isAmoled: false,

      setTitleLanguage: (titleLanguage) => set({ titleLanguage }),
      setThemeAccent: (themeAccent) => {
        document.documentElement.style.setProperty("--accent", themeAccent);
        set({ themeAccent });
      },
      setAdultFilter: (adultFilter) => set({ adultFilter }),
      setAmoled: (isAmoled) => {
        if (isAmoled) {
          document.documentElement.setAttribute("data-theme", "amoled");
        } else {
          document.documentElement.removeAttribute("data-theme");
        }
        set({ isAmoled });
      },
    }),
    {
      name: "kuromi-settings",
    }
  )
);
