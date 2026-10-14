"use client";

import React, { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, RotateCcw, Home } from "lucide-react";
import { Button } from "@/components/ui/Button";

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Application error:", error);
  }, [error]);

  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center px-4 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-md bg-rose-500/10 text-rose-400 border border-rose-500/20 mb-4 shadow-[0_0_20px_rgba(244,63,94,0.2)]">
        <AlertTriangle className="h-8 w-8" />
      </div>
      <h2 className="font-display text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
        Something went wrong
      </h2>
      <p className="mt-2 max-w-md text-sm text-zinc-400">
        {error.message || "An unexpected error occurred while loading this page. Please try again."}
      </p>
      <div className="mt-6 flex items-center gap-3">
        <Button onClick={reset} variant="accent" className="gap-2">
          <RotateCcw className="h-4 w-4" />
          <span>Try Again</span>
        </Button>
        <Link href="/">
          <Button variant="outline" className="gap-2">
            <Home className="h-4 w-4" />
            <span>Go Home</span>
          </Button>
        </Link>
      </div>
    </div>
  );
}
