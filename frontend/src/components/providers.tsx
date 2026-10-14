"use client";

import React, { useState, useEffect } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useAuthStore } from "@/stores/auth";
import { useSettingsStore } from "@/stores/settings";

function sanitizeAccent(color?: string): string {
  if (!color || typeof color !== "string" || !color.startsWith("#")) {
    return "#8b7cf6";
  }
  const hex = color.replace("#", "");
  if (hex.length !== 3 && hex.length !== 6) return "#8b7cf6";
  const r = parseInt(hex.length === 3 ? hex[0] + hex[0] : hex.substring(0, 2), 16) || 0;
  const g = parseInt(hex.length === 3 ? hex[1] + hex[1] : hex.substring(2, 4), 16) || 0;
  const b = parseInt(hex.length === 3 ? hex[2] + hex[2] : hex.substring(4, 6), 16) || 0;
  // If brightness is too high (> 185), white text becomes completely invisible
  const brightness = (r * 299 + g * 587 + b * 114) / 1000;
  if (brightness > 185) {
    return "#8b7cf6";
  }
  return color;
}

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000 * 5, // 5 mins
            refetchOnWindowFocus: false,
            retry: 1,
          },
        },
      })
  );

  const checkAuth = useAuthStore((s) => s.checkAuth);
  const themeAccent = useSettingsStore((s) => s.themeAccent);
  const isAmoled = useSettingsStore((s) => s.isAmoled);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  useEffect(() => {
    const validAccent = sanitizeAccent(themeAccent);
    document.documentElement.style.setProperty("--accent", validAccent);
    if (themeAccent && validAccent !== themeAccent) {
      useSettingsStore.getState().setThemeAccent(validAccent);
    }
    if (isAmoled) {
      document.documentElement.setAttribute("data-theme", "amoled");
    } else {
      document.documentElement.removeAttribute("data-theme");
    }
  }, [themeAccent, isAmoled]);

  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}
