"use client";

import { useState, useEffect } from "react";

/**
 * Hook to determine if the component has mounted on the client.
 * Essential for components reading from localStorage or Zustand persist
 * to prevent Next.js SSR hydration mismatches.
 */
export function useMounted(): boolean {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return mounted;
}
