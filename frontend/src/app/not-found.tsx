import React from "react";
import Link from "next/link";
import { Compass, Home, Search } from "lucide-react";
import { Button } from "@/components/ui/Button";

export default function NotFound() {
  return (
    <div className="relative flex min-h-[75vh] flex-col items-center justify-center px-4 text-center overflow-hidden">
      {/* Background ambient glow */}
      <div className="absolute h-96 w-96 rounded-full bg-[var(--accent)]/10 blur-[120px] pointer-events-none" />

      <div className="relative z-10 flex flex-col items-center">
        <span className="font-display text-8xl sm:text-9xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-b from-white to-white/20 select-none">
          404
        </span>
        <h2 className="mt-2 font-display text-2xl sm:text-3xl font-extrabold text-white">
          Lost in the Anime Multiverse?
        </h2>
        <p className="mt-2 max-w-md text-sm text-zinc-400">
          The page or anime dimension you are looking for does not exist or has been moved to another timeline.
        </p>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link href="/">
            <Button variant="accent" className="gap-2">
              <Home className="h-4 w-4" />
              <span>Back to Home</span>
            </Button>
          </Link>
          <Link href="/browse">
            <Button variant="outline" className="gap-2">
              <Compass className="h-4 w-4" />
              <span>Browse Catalog</span>
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
