import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatTimeUntil(seconds: number): string {
  if (seconds <= 0) return "Airing now";
  const days = Math.floor(seconds / (3600 * 24));
  const hours = Math.floor((seconds % (3600 * 24)) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

export function formatAiringTime(timestamp: number, locale = "en-US"): string {
  const date = new Date(timestamp * 1000);
  return date.toLocaleTimeString(locale, {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

export function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
}

export function formatScore(score: number | null | undefined): string {
  if (!score) return "N/A";
  return (score / 10).toFixed(1);
}

export function getStatusDotColor(status: string | null | undefined): string {
  switch (status?.toUpperCase()) {
    case "RELEASING":
      return "bg-emerald-400";
    case "FINISHED":
      return "bg-blue-400";
    case "NOT_YET_RELEASED":
      return "bg-amber-400";
    default:
      return "bg-zinc-400";
  }
}
