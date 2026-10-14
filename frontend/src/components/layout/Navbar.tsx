"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Menu,
  Search,
  Shuffle,
  Bell,
  User as UserIcon,
  Sparkles,
  Bookmark,
  LogOut,
  Sliders,
} from "lucide-react";
import { SITE_CONFIG, NAV_ITEMS } from "@/lib/constants";
import { CommandPalette } from "./CommandPalette";
import { Sidebar } from "./Sidebar";
import { useAuthStore } from "@/stores/auth";
import { useMounted } from "@/hooks/useMounted";
import Image from "next/image";

export function Navbar() {
  const mounted = useMounted();
  const router = useRouter();
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);

  const { user, isAuthenticated, logout } = useAuthStore();
  const isAuthed = mounted && isAuthenticated && !!user;

  const handleRandom = async () => {
    router.push("/random");
  };

  return (
    <>
      <header className="sticky top-0 z-40 w-full glass-nav transition-all">
        <div className="w-full flex h-16 items-center justify-between px-4 sm:px-6 md:px-8 lg:px-10 xl:px-12">
          {/* Left: Hamburger & Logo */}
          <div className="flex items-center gap-2.5 sm:gap-4">
            <button
              onClick={() => setSidebarOpen(true)}
              className="rounded-md p-1.5 text-zinc-400 hover:bg-white/10 hover:text-white transition-colors"
              aria-label="Open navigation menu"
            >
              <Menu className="h-5 w-5" />
            </button>

            <Link href="/" className="flex items-center gap-2 group">
              <span className="font-display font-extrabold text-base sm:text-lg tracking-wider text-white group-hover:text-[var(--accent)] transition-colors">
                {SITE_CONFIG.name}
              </span>
            </Link>

            {/* Desktop Navigation Links */}
            <nav className="hidden lg:flex items-center gap-1 ml-4">
              {NAV_ITEMS.slice(0, 5).map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="rounded-md px-3 py-1.5 text-xs font-semibold text-zinc-300 hover:text-white hover:bg-white/5 transition-colors"
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>
          {/* Right: Actions & User - Notification -> Search -> Random -> Sign In */}
          <div className="flex items-center gap-2 sm:gap-2.5">
            {/* 1. Notification Bell */}
            <button
              type="button"
              title="Notifications"
              className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-white/10 bg-white/5 text-zinc-300 hover:border-white/20 hover:bg-white/10 hover:text-white transition-all"
              aria-label="Notifications"
            >
              <Bell className="h-4 w-4" />
              <span className="absolute top-2 right-2 h-1.5 w-1.5 rounded-full bg-amber-500" />
            </button>

            {/* 2. Search (Desktop Bar / Mobile Icon) */}
            <button
              type="button"
              onClick={() => setPaletteOpen(true)}
              className="hidden sm:flex h-9 w-44 md:w-56 lg:w-64 shrink-0 items-center justify-between rounded-md border border-white/10 bg-white/5 px-3 text-xs text-zinc-400 hover:border-white/20 hover:bg-white/10 hover:text-zinc-200 transition-all"
            >
              <span className="flex items-center gap-2 truncate">
                <Search className="h-3.5 w-3.5 text-zinc-400 shrink-0" />
                <span className="truncate">Search anime...</span>
              </span>
              <kbd className="shrink-0 rounded border border-white/15 bg-white/5 px-1.5 py-0.5 text-[10px] font-mono text-zinc-400">
                Ctrl K
              </kbd>
            </button>

            <button
              type="button"
              onClick={() => setPaletteOpen(true)}
              className="sm:hidden flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-white/10 bg-white/5 text-zinc-300 hover:border-white/20 hover:bg-white/10 hover:text-white transition-all"
              aria-label="Search"
            >
              <Search className="h-4 w-4" />
            </button>

            {/* 3. Random Button */}
            <button
              type="button"
              onClick={handleRandom}
              title="Random Anime"
              className="flex h-9 w-9 sm:w-auto shrink-0 items-center justify-center sm:justify-start gap-1.5 rounded-md border border-white/10 bg-white/5 sm:px-3 text-xs font-semibold text-zinc-200 hover:border-white/20 hover:bg-white/10 hover:text-white transition-all"
            >
              <Shuffle className="h-3.5 w-3.5 text-purple-400 shrink-0" />
              <span className="hidden sm:inline">Random</span>
            </button>

            {/* 4. User Profile / Sign In */}
            <div className="relative shrink-0">
              {isAuthed ? (
                <button
                  type="button"
                  onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
                  className="flex h-9 w-9 items-center justify-center rounded-md border border-white/10 hover:border-white/25 hover:ring-2 hover:ring-[var(--accent)] transition-all overflow-hidden"
                >
                  <div className="relative h-full w-full bg-zinc-800">
                    <Image
                      src={user.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${user.username}`}
                      alt={user.username}
                      fill
                      className="object-cover"
                    />
                  </div>
                </button>
              ) : (
                <Link
                  href="/login"
                  title="Sign In"
                  className="flex h-9 w-9 sm:w-auto shrink-0 items-center justify-center gap-1.5 rounded-md border border-white/15 bg-white/10 hover:bg-white/15 hover:border-white/25 sm:px-3.5 text-xs font-semibold text-white transition-all"
                >
                  <UserIcon className="h-3.5 w-3.5 shrink-0" />
                  <span className="hidden sm:inline">Sign In</span>
                </Link>
              )}

              {/* Profile Dropdown */}
              {profileDropdownOpen && isAuthenticated && user && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setProfileDropdownOpen(false)}
                  />
                  <div className="absolute right-0 mt-1.5 w-52 rounded-md border border-white/10 bg-[#131318] p-1.5 z-50 animate-in fade-in zoom-in-95 duration-150">
                    <div className="px-2.5 py-1.5 border-b border-white/10">
                      <p className="text-xs font-bold text-white truncate">{user.username}</p>
                      <p className="text-[11px] text-zinc-400 truncate">{user.email}</p>
                    </div>
                    <div className="py-1">
                      <Link
                        href="/profile"
                        onClick={() => setProfileDropdownOpen(false)}
                        className="flex items-center gap-2.5 rounded-md px-3 py-2 text-xs font-medium text-zinc-200 hover:bg-white/10"
                      >
                        <UserIcon className="h-4 w-4 text-[var(--accent)]" />
                        <span>Profile Overview</span>
                      </Link>
                      <Link
                        href="/profile/watchlist"
                        onClick={() => setProfileDropdownOpen(false)}
                        className="flex items-center gap-2.5 rounded-md px-3 py-2 text-xs font-medium text-zinc-200 hover:bg-white/10"
                      >
                        <Bookmark className="h-4 w-4 text-blue-400" />
                        <span>My Watchlist</span>
                      </Link>
                      <Link
                        href="/profile/settings"
                        onClick={() => setProfileDropdownOpen(false)}
                        className="flex items-center gap-2.5 rounded-md px-3 py-2 text-xs font-medium text-zinc-200 hover:bg-white/10"
                      >
                        <Sliders className="h-4 w-4 text-purple-400" />
                        <span>Theme & Preferences</span>
                      </Link>
                    </div>
                    <div className="pt-1 border-t border-white/10">
                      <button
                        onClick={() => {
                          setProfileDropdownOpen(false);
                          logout();
                        }}
                        className="flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-xs font-medium text-rose-400 hover:bg-rose-500/10"
                      >
                        <LogOut className="h-4 w-4" />
                        <span>Sign Out</span>
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Slide-in Navigation Sidebar */}
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Command Palette Modal */}
      <CommandPalette open={paletteOpen} onOpenChange={setPaletteOpen} />
    </>
  );
}
