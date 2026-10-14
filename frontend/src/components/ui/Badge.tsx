import React from "react";
import { cn } from "@/lib/utils";

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: "default" | "accent" | "outline" | "score" | "status";
}

export const Badge: React.FC<BadgeProps> = ({
  className,
  variant = "default",
  children,
  ...props
}) => {
  const variants = {
    default: "bg-white/10 text-zinc-200 border-white/10",
    accent: "bg-[var(--accent)]/15 text-[var(--accent)] border-[var(--accent)]/30 font-medium",
    outline: "bg-transparent text-zinc-300 border-white/20",
    score: "bg-amber-500/15 text-amber-300 border-amber-500/30 font-semibold",
    status: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30 font-medium",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs border backdrop-blur-sm",
        variants[variant],
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
};
