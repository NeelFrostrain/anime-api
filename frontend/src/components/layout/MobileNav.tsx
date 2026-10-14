"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Search, Calendar, Bookmark, User } from "lucide-react";
import { CommandPalette } from "./CommandPalette";
import { cn } from "@/lib/utils";

export function MobileNav() {
  const pathname = usePathname();
  const [searchOpen, setSearchOpen] = useState(false);

  const navItems = [
    { label: "Home", href: "/", icon: Home },
    { label: "Search", href: "#search", icon: Search, onClick: () => setSearchOpen(true) },
    { label: "Schedule", href: "/schedule", icon: Calendar },
    { label: "Library", href: "/profile/watchlist", icon: Bookmark },
    { label: "Profile", href: "/profile", icon: User },
  ];

  return (
    <>
      <nav className="fixed bottom-0 left-0 right-0 z-40 md:hidden border-t border-white/10 bg-[#0c0c10]/95 backdrop-blur-xl px-1 py-0.5">
        <div className="flex items-center justify-around">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = item.href !== "#search" && pathname === item.href;

            if (item.onClick) {
              return (
                <button
                  key={item.label}
                  onClick={item.onClick}
                  className="flex flex-col items-center gap-0.5 py-1 px-2 text-zinc-400 hover:text-white transition-colors"
                >
                  <Icon className="h-4 w-4" />
                  <span className="text-[9px] font-medium">{item.label}</span>
                </button>
              );
            }

            return (
              <Link
                key={item.label}
                href={item.href}
                className={cn(
                  "flex flex-col items-center gap-0.5 py-1 px-2 transition-colors",
                  isActive
                    ? "text-[var(--accent)] font-semibold"
                    : "text-zinc-400 hover:text-zinc-200"
                )}
              >
                <Icon className="h-4 w-4" />
                <span className="text-[9px]">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>

      <CommandPalette open={searchOpen} onOpenChange={setSearchOpen} />
    </>
  );
}
