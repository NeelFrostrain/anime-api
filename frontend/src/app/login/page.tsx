"use client";

import React, { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Lock, Mail, ArrowRight, ShieldCheck, UserCheck, AlertCircle } from "lucide-react";
import { api } from "@/lib/api";
import { useAuthStore } from "@/stores/auth";
import { SITE_CONFIG } from "@/lib/constants";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const setUser = useAuthStore((s) => s.setUser);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const data = await api.login({ email, password });
      setUser(data.user);
      router.push("/profile");
    } catch (err: any) {
      setError(err.message || "Failed to log in. Please check your credentials.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center px-4 py-12">
      <div className="grid grid-cols-1 md:grid-cols-2 w-full max-w-4xl overflow-hidden rounded-md border border-white/10 bg-[#131318] shadow-2xl">
        {/* Left Side: Anime Visual Branding */}
        <div className="relative hidden md:flex flex-col justify-between p-8 bg-gradient-to-br from-purple-900/40 via-zinc-900 to-black overflow-hidden">
          <div className="absolute inset-0 opacity-20 pointer-events-none">
            <Image
              src="https://s4.anilist.co/file/anilistcdn/media/anime/banner/21-wf37VakJNmSr.jpg"
              alt="anime background"
              fill
              className="object-cover"
            />
          </div>

          <div className="relative z-10">
            <div className="flex h-10 w-10 items-center justify-center rounded-md bg-[var(--accent)] text-white font-black text-xl shadow-glow mb-4">
              K
            </div>
            <h2 className="font-display text-2xl font-extrabold text-white">
              {SITE_CONFIG.name}
            </h2>
            <p className="text-xs text-zinc-400 mt-1">Your cinematic anime tracking realm.</p>
          </div>

          <div className="relative z-10 space-y-3">
            <div className="flex items-center gap-2.5 text-xs text-zinc-300">
              <ShieldCheck className="h-4 w-4 text-emerald-400" />
              <span>Free, 100% legal, and secure tracking</span>
            </div>
            <div className="flex items-center gap-2.5 text-xs text-zinc-300">
              <UserCheck className="h-4 w-4 text-[var(--accent)]" />
              <span>Sync watchlists across all your devices</span>
            </div>
          </div>
        </div>

        {/* Right Side: Form */}
        <div className="p-8 sm:p-10 flex flex-col justify-center space-y-6">
          <div>
            <h2 className="font-display text-2xl font-extrabold text-white">Welcome back</h2>
            <p className="text-xs text-zinc-400 mt-1">
              Sign in to manage your watchlist and continuing progress.
            </p>
          </div>

          {error && (
            <div className="flex items-center gap-2 rounded-md border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-300">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-zinc-300 block mb-1.5">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your.email@example.com"
                  className="w-full rounded-md border border-white/10 bg-white/5 pl-10 pr-4 py-2.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-[var(--accent)]"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold text-zinc-300">Password</label>
              </div>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full rounded-md border border-white/10 bg-white/5 pl-10 pr-4 py-2.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-[var(--accent)]"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="flex w-full items-center justify-center gap-2 rounded-md bg-[var(--accent)] hover:brightness-110 text-white font-bold text-xs py-3 shadow-[0_0_15px_var(--accent-glow)] transition-all active:scale-95 disabled:opacity-50"
            >
              {isLoading ? (
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              ) : (
                <>
                  <span>Sign In</span>
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </form>

          {/* Continue without account */}
          <div className="pt-2 text-center space-y-3">
            <Link
              href="/"
              className="inline-block text-xs font-semibold text-zinc-400 hover:text-white transition-colors"
            >
              Continue as Guest (Local Storage Mode) &rarr;
            </Link>

            <p className="text-xs text-zinc-500">
              Don&apos;t have an account?{" "}
              <Link href="/register" className="font-semibold text-[var(--accent)] hover:underline">
                Create one now
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
