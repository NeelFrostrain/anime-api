import React from "react";
import Image from "next/image";
import Link from "next/link";
import { StaffItem } from "@/types/anime";
import { User } from "lucide-react";

interface StaffTabProps {
  staff: StaffItem[];
}

export function StaffTab({ staff }: StaffTabProps) {
  if (!staff || staff.length === 0) {
    return (
      <div className="py-16 text-center text-zinc-400">
        No staff members listed for this production.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
      {staff.map((member) => (
        <Link
          key={`${member.id}-${member.role}`}
          href={`/staff/${member.id}`}
          className="group flex items-center gap-3 rounded-md border border-white/10 bg-[#131318] p-3 shadow-md hover:border-white/20 transition-all"
        >
          <div className="relative h-16 w-12 shrink-0 overflow-hidden rounded-md bg-zinc-800">
            {member.image ? (
              <Image
                src={member.image}
                alt={member.name.full}
                fill
                className="object-cover transition-transform group-hover:scale-105"
                sizes="48px"
              />
            ) : (
              <User className="h-6 w-6 m-auto text-zinc-600" />
            )}
          </div>
          <div className="min-w-0">
            <h4 className="line-clamp-1 text-xs font-bold text-white group-hover:text-[var(--accent)] transition-colors">
              {member.name.full}
            </h4>
            <p className="line-clamp-1 text-[11px] text-[var(--accent)] font-semibold mt-0.5">
              {member.role || "Staff"}
            </p>
            {member.occupations?.length > 0 && (
              <p className="line-clamp-1 text-[10px] text-zinc-400 mt-0.5">
                {member.occupations.join(", ")}
              </p>
            )}
          </div>
        </Link>
      ))}
    </div>
  );
}
