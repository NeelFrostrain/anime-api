import React from "react";
import { cn } from "@/lib/utils";

interface RatingRingProps {
  score: number | null | undefined; // 0 - 100
  size?: number;
  strokeWidth?: number;
  className?: string;
  showPercent?: boolean;
}

export const RatingRing: React.FC<RatingRingProps> = ({
  score,
  size = 46,
  strokeWidth = 3.5,
  className,
  showPercent = false,
}) => {
  const radius = (size - strokeWidth * 2) / 2;
  const circumference = radius * 2 * Math.PI;
  const percentage = Math.min(Math.max(score || 0, 0), 100);
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  const getColor = (val: number) => {
    if (val >= 80) return "#34d399"; // emerald
    if (val >= 70) return "#60a5fa"; // blue
    if (val >= 60) return "#fbbf24"; // amber
    return "#f87171"; // rose
  };

  const strokeColor = getColor(percentage);

  return (
    <div
      className={cn("relative inline-flex items-center justify-center font-bold", className)}
      style={{ width: size, height: size }}
    >
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="rgba(255, 255, 255, 0.12)"
          strokeWidth={strokeWidth}
          fill="none"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={strokeColor}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          fill="none"
          className="transition-all duration-700 ease-out"
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center text-xs font-semibold tracking-tight">
        {score ? (showPercent ? `${score}%` : (score / 10).toFixed(1)) : "—"}
      </div>
    </div>
  );
};
