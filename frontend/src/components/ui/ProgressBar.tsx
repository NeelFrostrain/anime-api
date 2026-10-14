import React from "react";
import { cn } from "@/lib/utils";

interface ProgressBarProps {
  value: number; // 0 to 100 or current progress
  max?: number;
  className?: string;
  barColor?: string;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
  value,
  max = 100,
  className,
  barColor,
}) => {
  const percentage = Math.min(Math.max((value / max) * 100, 0), 100);

  return (
    <div className={cn("relative h-1.5 w-full overflow-hidden rounded-full bg-white/10", className)}>
      <div
        className="h-full rounded-full transition-all duration-300 ease-out"
        style={{
          width: `${percentage}%`,
          backgroundColor: barColor || "var(--accent, #8b7cf6)",
        }}
      />
    </div>
  );
};
