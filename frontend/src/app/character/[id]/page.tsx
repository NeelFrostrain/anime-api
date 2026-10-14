import React from "react";
import { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { api } from "@/lib/api";
import { AnimeCard } from "@/components/anime/AnimeCard";
import { User, Heart, ChevronLeft } from "lucide-react";

interface Props {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  try {
    const char = await api.getCharacter(id);
    const name = char.name?.full || "Character";
    return {
      title: `${name} — Character Profile & Roles`,
      description: char.description?.slice(0, 160) || `Explore ${name} on KUROMI.`,
    };
  } catch {
    return { title: "Character Profile" };
  }
}

export default async function CharacterPage({ params }: Props) {
  const { id } = await params;
  const char = await api.getCharacter(id).catch(() => null);
  if (!char) notFound();

  const name = char.name?.full || "Character";
  const appearances = char.appearances || [];

  return (
    <div className="w-full px-4 sm:px-6 md:px-8 lg:px-10 xl:px-12 py-8 space-y-10 min-h-screen">
      <Link
        href="/browse"
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--accent)] hover:underline"
      >
        <ChevronLeft className="h-4 w-4" />
        Back to Catalog
      </Link>

      {/* Profile Header */}
      <div className="flex flex-col md:flex-row gap-6 md:gap-8 items-start rounded-md border border-white/10 bg-[#131318] p-6 shadow-xl">
        <div className="relative aspect-[2/3] w-48 shrink-0 overflow-hidden rounded-md bg-zinc-900 border border-white/15 shadow-xl">
          {char.image ? (
            <Image
              src={char.image}
              alt={name}
              fill
              priority
              className="object-cover"
              sizes="200px"
            />
          ) : (
            <User className="h-10 w-10 m-auto text-zinc-600" />
          )}
        </div>

        <div className="flex-1 space-y-4">
          <div>
            <h1 className="font-display font-extrabold text-2xl sm:text-3xl text-white">
              {name}
            </h1>
            {char.name?.native && (
              <p className="text-sm text-zinc-400 mt-1 font-medium">{char.name.native}</p>
            )}
          </div>

          {/* Quick stats chips */}
          <div className="flex flex-wrap items-center gap-2 text-xs">
            {char.gender && (
              <span className="rounded-md border border-white/10 bg-white/5 px-2.5 py-1 text-zinc-300">
                Gender: {char.gender}
              </span>
            )}
            {char.age && (
              <span className="rounded-md border border-white/10 bg-white/5 px-2.5 py-1 text-zinc-300">
                Age: {char.age}
              </span>
            )}
            {char.favourites && (
              <span className="flex items-center gap-1 rounded-md border border-rose-500/30 bg-rose-500/10 px-2.5 py-1 text-rose-300 font-semibold">
                <Heart className="h-3 w-3 fill-rose-400" />
                {char.favourites.toLocaleString()}
              </span>
            )}
          </div>

          {/* Bio */}
          {char.description && (
            <p className="text-xs sm:text-sm text-zinc-300 leading-relaxed whitespace-pre-line max-h-60 overflow-y-auto pr-2 scrollbar-thin">
              {char.description}
            </p>
          )}
        </div>
      </div>

      {/* Appearances / Roles Grid */}
      <div className="space-y-4">
        <h2 className="font-display text-xl font-bold text-white">
          Anime Appearances ({appearances.length})
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {appearances.map((item: any, idx: number) => (
            <div key={idx} className="space-y-1">
              <AnimeCard anime={item.media} />
              {item.characterRole && (
                <span className="text-[10px] uppercase font-bold text-[var(--accent)] block text-center">
                  {item.characterRole} Role
                </span>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
