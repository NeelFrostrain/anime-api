import React from "react";
import Image from "next/image";
import Link from "next/link";
import { CharacterItem } from "@/types/anime";
import { Mic, User } from "lucide-react";

interface CharactersTabProps {
  characters: CharacterItem[];
}

export function CharactersTab({ characters }: CharactersTabProps) {
  if (!characters || characters.length === 0) {
    return (
      <div className="py-16 text-center text-zinc-400">
        No character data available for this anime.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-2.5">
      {characters.map((char) => {
        const va = char.voiceActors?.[0]; // Japanese primary voice actor

        return (
          <div
            key={char.id}
            className="flex items-center justify-between rounded-md border border-white/10 bg-[#131318] p-2 hover:border-white/20 transition-all"
          >
            {/* Character Info (Left) */}
            <div className="flex items-center gap-2.5 min-w-0">
              <Link
                href={`/character/${char.id}`}
                className="relative h-12 w-9 shrink-0 overflow-hidden rounded bg-zinc-800"
              >
                {char.image ? (
                  <Image
                    src={char.image}
                    alt={char.name.full}
                    fill
                    className="object-cover"
                    sizes="40px"
                  />
                ) : (
                  <User className="h-5 w-5 m-auto text-zinc-600" />
                )}
              </Link>
              <div className="min-w-0">
                <Link
                  href={`/character/${char.id}`}
                  className="line-clamp-1 text-xs font-bold text-white hover:text-[var(--accent)] transition-colors"
                >
                  {char.name.full}
                </Link>
                {char.name.native && (
                  <p className="text-[10px] text-zinc-400 truncate">{char.name.native}</p>
                )}
                <span className="inline-block text-[9px] font-semibold uppercase tracking-wider text-[var(--accent)]">
                  {char.role || "Main"}
                </span>
              </div>
            </div>

            {/* Voice Actor Info (Right) */}
            {va && (
              <div className="flex items-center gap-2 text-right shrink-0 pl-2.5 border-l border-white/10">
                <div className="min-w-0">
                  <Link
                    href={`/staff/${va.id}`}
                    className="line-clamp-1 text-xs font-semibold text-zinc-200 hover:text-[var(--accent)] transition-colors"
                  >
                    {va.name}
                  </Link>
                  <span className="flex items-center justify-end gap-1 text-[9px] text-zinc-400 mt-0.5">
                    <Mic className="h-2 w-2 text-zinc-400" />
                    <span>{va.language || "JP"}</span>
                  </span>
                </div>
                <Link
                  href={`/staff/${va.id}`}
                  className="relative h-12 w-9 shrink-0 overflow-hidden rounded bg-zinc-800"
                >
                  {va.image ? (
                    <Image
                      src={va.image}
                      alt={va.name}
                      fill
                      className="object-cover"
                      sizes="40px"
                    />
                  ) : null}
                </Link>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
