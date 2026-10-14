"use client";

import React from "react";
import Link from "next/link";
import { SITE_CONFIG, NAV_ITEMS } from "@/lib/constants";
import { useSettingsStore } from "@/stores/settings";
import { Moon, Palette } from "lucide-react";

export function Footer() {
  const { themeAccent, setThemeAccent, isAmoled, setAmoled } = useSettingsStore();

  const ACCENT_COLORS = [
    { label: "Violet", color: "#8b7cf6" },
    { label: "Emerald", color: "#10b981" },
    { label: "Rose", color: "#f43f5e" },
    { label: "Cyan", color: "#06b6d4" },
    { label: "Amber", color: "#f59e0b" },
    { label: "Fuchsia", color: "#d946ef" },
  ];

  return (
    <footer className="w-full border-t border-white/10 bg-[#0a0a0c] pt-6 pb-20 md:pb-8 text-zinc-400 text-xs">
      <div className="w-full px-4 sm:px-6 md:px-8 lg:px-10 xl:px-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
          {/* Col 1: Brand & Disclaimer */}
          <div className="md:col-span-2 space-y-2">
            <Link href="/" className="flex items-center gap-2">
              <span className="font-display font-extrabold text-lg tracking-wider text-white">
                {SITE_CONFIG.name}
              </span>
            </Link>
            <p className="text-xs text-zinc-400 max-w-md leading-relaxed">
              {SITE_CONFIG.description}
            </p>
            <p className="text-[11px] text-zinc-500 leading-relaxed max-w-md">
              {SITE_CONFIG.disclaimer}
            </p>
          </div>

          {/* Col 2: Navigation Links */}
          <div>
            <h4 className="text-xs font-semibold text-white uppercase tracking-wider mb-2">
              Explore
            </h4>
            <ul className="space-y-1 text-xs">
              {NAV_ITEMS.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className="hover:text-white transition-colors"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Col 3: Theme Controls */}
          <div className="space-y-2.5">
            <h4 className="text-xs font-semibold text-white uppercase tracking-wider">
              Theme Controls
            </h4>

            {/* Accent Picker */}
            <div>
              <p className="text-[11px] text-zinc-400 flex items-center gap-1.5 mb-1.5">
                <Palette className="h-3 w-3 text-zinc-400" />
                <span>Accent Color</span>
              </p>
              <div className="flex items-center gap-1.5">
                {ACCENT_COLORS.map((accent) => (
                  <button
                    key={accent.color}
                    onClick={() => setThemeAccent(accent.color)}
                    title={accent.label}
                    className={`h-5 w-5 rounded-full transition-all border active:scale-90 ${
                      themeAccent === accent.color ? "ring-2 ring-white border-transparent scale-110" : "border-white/20"
                    }`}
                    style={{
                      backgroundColor: accent.color,
                    }}
                  />
                ))}
              </div>
            </div>

            {/* AMOLED Toggle */}
            <div>
              <button
                onClick={() => setAmoled(!isAmoled)}
                className="flex items-center gap-1.5 text-[11px] rounded-md border border-white/10 bg-white/5 px-2.5 py-1.5 hover:bg-white/10 transition-colors text-zinc-300"
              >
                <Moon className="h-3.5 w-3.5 text-[var(--accent)]" />
                <span>AMOLED Black: {isAmoled ? "ON" : "OFF"}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="border-t border-white/10 pt-4 flex flex-col sm:flex-row items-center justify-between text-[11px] text-zinc-500 gap-2">
          <p>© {new Date().getFullYear()} {SITE_CONFIG.name}. Built with Next.js & FastAPI.</p>
          <div className="flex items-center gap-4">
            <Link href="/browse" className="hover:text-zinc-300 transition-colors">Browse</Link>
            <Link href="/schedule" className="hover:text-zinc-300 transition-colors">Schedule</Link>
            <Link href="/profile" className="hover:text-zinc-300 transition-colors">Profile</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
