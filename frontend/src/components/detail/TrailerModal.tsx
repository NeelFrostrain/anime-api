"use client";

import React from "react";
import { Modal } from "../ui/Modal";

interface TrailerModalProps {
  isOpen: boolean;
  onClose: () => void;
  trailerId: string | null;
  site?: string | null;
  title: string;
}

export function TrailerModal({
  isOpen,
  onClose,
  trailerId,
  site = "youtube",
  title,
}: TrailerModalProps) {
  if (!trailerId) return null;

  const embedUrl =
    site?.toLowerCase() === "youtube"
      ? `https://www.youtube-nocookie.com/embed/${trailerId}?autoplay=1&rel=0`
      : null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`${title} — Official Trailer`}
      maxWidth="4xl"
    >
      <div className="relative aspect-video w-full overflow-hidden rounded-md bg-black">
        {embedUrl ? (
          <iframe
            src={embedUrl}
            title={title}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            className="h-full w-full border-0"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-zinc-400">
            Trailer video player unavailable for this source.
          </div>
        )}
      </div>
    </Modal>
  );
}
