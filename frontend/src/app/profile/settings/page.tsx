"use client";

import React from "react";
import Link from "next/link";
import {
  Sliders,
  Palette,
  Moon,
  Shield,
  Languages,
  ChevronLeft,
  Check,
  RotateCcw,
} from "lucide-react";
import { useSettingsStore } from "@/stores/settings";

export default function SettingsPage() {
  const {
    titleLanguage,
    setTitleLanguage,
    themeAccent,
    setThemeAccent,
    adultFilter,
    setAdultFilter,
    isAmoled,
    setAmoled,
  } = useSettingsStore();

  const ACCENTS = [
    { label: "Kuromi Violet (Default)", color: "#8b7cf6" },
    { label: "Emerald Blossom", color: "#10b981" },
    { label: "Cyber Rose", color: "#f43f5e" },
    { label: "Neon Cyan", color: "#06b6d4" },
    { label: "Amber Sunset", color: "#f59e0b" },
    { label: "Fuchsia Anime", color: "#d946ef" },
    { label: "Electric Indigo", color: "#6366f1" },
  ];

  return (
    <div className="w-full px-4 sm:px-6 md:px-8 lg:px-10 xl:px-12 py-8 space-y-8 min-h-screen">
      {/* Header */}
      <div className="border-b border-white/10 pb-6 space-y-2">
        <Link
          href="/profile"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--accent)] hover:underline mb-2"
        >
          <ChevronLeft className="h-4 w-4" />
          Profile Overview
        </Link>
        <h1 className="font-display text-3xl sm:text-4xl font-extrabold text-white flex items-center gap-2">
          <Sliders className="h-7 w-7 text-[var(--accent)]" />
          <span>Theme & Preferences</span>
        </h1>
        <p className="text-xs text-zinc-400">
          Personalize your anime discovery experience, color accents, and display modes.
        </p>
      </div>

      <div className="space-y-6">
        {/* Title Display Language */}
        <div className="rounded-md border border-white/10 bg-[#131318] p-6 shadow-xl space-y-4">
          <div className="flex items-center gap-3">
            <Languages className="h-5 w-5 text-blue-400" />
            <div>
              <h3 className="font-display font-bold text-sm text-white">
                Preferred Title Language
              </h3>
              <p className="text-xs text-zinc-400 mt-0.5">
                Controls the primary display title on posters, spotlights, and search results.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
            {[
              { id: "english", label: "English", example: "Attack on Titan" },
              { id: "romaji", label: "Romaji", example: "Shingeki no Kyojin" },
              { id: "native", label: "Japanese Native", example: "進撃の巨人" },
            ].map((option) => {
              const isSelected = titleLanguage === option.id;
              return (
                <button
                  key={option.id}
                  onClick={() => setTitleLanguage(option.id as any)}
                  className={`flex flex-col rounded-md p-3.5 text-left border transition-all ${
                    isSelected
                      ? "border-[var(--accent)] bg-[var(--accent)]/15 shadow-glow"
                      : "border-white/10 bg-white/5 hover:border-white/20 text-zinc-300"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-white">{option.label}</span>
                    {isSelected && <Check className="h-4 w-4 text-[var(--accent)]" />}
                  </div>
                  <span className="text-[11px] text-zinc-400 mt-1">{option.example}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Dynamic Theme Accent Picker */}
        <div className="rounded-md border border-white/10 bg-[#131318] p-6 shadow-xl space-y-4">
          <div className="flex items-center gap-3">
            <Palette className="h-5 w-5 text-[var(--accent)]" />
            <div>
              <h3 className="font-display font-bold text-sm text-white">
                Theme Accent Color
              </h3>
              <p className="text-xs text-zinc-400 mt-0.5">
                Applied to glows, badges, buttons, active tabs, and highlights.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 pt-2">
            {ACCENTS.map((accent) => {
              const isSelected = themeAccent === accent.color;
              return (
                <button
                  key={accent.color}
                  onClick={() => setThemeAccent(accent.color)}
                  className={`flex items-center gap-2.5 rounded-md border p-3 text-left transition-all ${
                    isSelected
                      ? "border-white/40 bg-white/10 shadow-lg"
                      : "border-white/10 bg-white/5 hover:bg-white/10 text-zinc-300"
                  }`}
                >
                  <span
                    className="h-5 w-5 rounded-full shrink-0 border border-white/20 shadow-sm"
                    style={{ backgroundColor: accent.color }}
                  />
                  <span className="text-xs font-semibold text-white truncate">
                    {accent.label.split(" ")[0]}
                  </span>
                  {isSelected && <Check className="h-3.5 w-3.5 ml-auto text-white" />}
                </button>
              );
            })}
          </div>
        </div>

        {/* AMOLED Black Mode */}
        <div className="rounded-md border border-white/10 bg-[#131318] p-6 shadow-xl flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Moon className="h-5 w-5 text-indigo-400" />
            <div>
              <h3 className="font-display font-bold text-sm text-white">
                AMOLED Deep Black
              </h3>
              <p className="text-xs text-zinc-400 mt-0.5">
                Turns background surfaces pitch black (#000000) for OLED displays and battery savings.
              </p>
            </div>
          </div>

          <button
            onClick={() => setAmoled(!isAmoled)}
            className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
              isAmoled ? "bg-[var(--accent)]" : "bg-white/20"
            }`}
          >
            <span
              className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                isAmoled ? "translate-x-5" : "translate-x-0"
              }`}
            />
          </button>
        </div>

        {/* Adult Content Safe Filter */}
        <div className="rounded-md border border-white/10 bg-[#131318] p-6 shadow-xl flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Shield className="h-5 w-5 text-emerald-400" />
            <div>
              <h3 className="font-display font-bold text-sm text-white">
                Safe Mode (Adult Content Filter)
              </h3>
              <p className="text-xs text-zinc-400 mt-0.5">
                Automatically hides NSFW 18+ titles from discovery queries, spotlight, and search.
              </p>
            </div>
          </div>

          <button
            onClick={() => setAdultFilter(!adultFilter)}
            className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
              adultFilter ? "bg-emerald-500" : "bg-white/20"
            }`}
          >
            <span
              className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                adultFilter ? "translate-x-5" : "translate-x-0"
              }`}
            />
          </button>
        </div>
      </div>
    </div>
  );
}
