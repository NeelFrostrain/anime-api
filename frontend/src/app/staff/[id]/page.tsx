import React from "react";
import { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { api } from "@/lib/api";
import { AnimeCard } from "@/components/anime/AnimeCard";
import { User, Heart, ChevronLeft, Briefcase } from "lucide-react";

interface Props {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  try {
    const staff = await api.getStaff(id);
    const name = staff.name?.full || "Staff Member";
    return {
      title: `${name} — Anime Staff & Voice Actor Profile`,
      description: staff.description?.slice(0, 160) || `Explore ${name} on KUROMI.`,
    };
  } catch {
    return { title: "Staff Profile" };
  }
}

export default async function StaffPage({ params }: Props) {
  const { id } = await params;
  const staff = await api.getStaff(id).catch(() => null);
  if (!staff) notFound();

  const name = staff.name?.full || "Staff Member";
  const roles = staff.roles || [];

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
          {staff.image ? (
            <Image
              src={staff.image}
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
            {staff.name?.native && (
              <p className="text-sm text-zinc-400 mt-1 font-medium">{staff.name.native}</p>
            )}
          </div>

          {/* Occupations */}
          {staff.primaryOccupations?.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5 text-xs">
              {staff.primaryOccupations.map((occ: string) => (
                <span
                  key={occ}
                  className="rounded-md border border-[var(--accent)]/30 bg-[var(--accent)]/10 px-2.5 py-1 text-[var(--accent)] font-semibold"
                >
                  {occ}
                </span>
              ))}
            </div>
          )}

          {/* Bio */}
          {staff.description && (
            <p className="text-xs sm:text-sm text-zinc-300 leading-relaxed whitespace-pre-line max-h-60 overflow-y-auto pr-2 scrollbar-thin">
              {staff.description}
            </p>
          )}
        </div>
      </div>

      {/* Production Roles Grid */}
      <div className="space-y-4">
        <h2 className="font-display text-xl font-bold text-white flex items-center gap-2">
          <Briefcase className="h-5 w-5 text-[var(--accent)]" />
          <span>Roles & Productions ({roles.length})</span>
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {roles.map((item: any, idx: number) => (
            <AnimeCard key={idx} anime={item.media} />
          ))}
        </div>
      </div>
    </div>
  );
}
