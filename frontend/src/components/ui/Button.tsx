import React from "react";
import { cn } from "@/lib/utils";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "outline" | "ghost" | "accent" | "danger";
  size?: "sm" | "md" | "lg" | "icon";
  isLoading?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", isLoading, children, disabled, ...props }, ref) => {
    const baseStyles =
      "relative inline-flex items-center justify-center font-medium transition-all duration-200 active:scale-95 disabled:pointer-events-none disabled:opacity-50 select-none rounded-md";

    const variants = {
      primary: "bg-white text-zinc-950 hover:bg-zinc-200",
      secondary: "bg-zinc-800 text-zinc-100 hover:bg-zinc-700 border border-white/10",
      outline: "bg-transparent text-zinc-100 hover:bg-white/10 border border-white/15",
      ghost: "bg-transparent text-zinc-300 hover:text-white hover:bg-white/5",
      accent:
        "bg-[var(--accent)] text-white hover:brightness-110",
      danger: "bg-rose-600 text-white hover:bg-rose-700",
    };

    const sizes = {
      sm: "h-8 px-3 text-xs gap-1.5",
      md: "h-10 px-4 text-sm gap-2",
      lg: "h-12 px-6 text-base gap-2.5 font-semibold",
      icon: "h-10 w-10 p-0 text-sm",
    };

    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={cn(baseStyles, variants[variant], sizes[size], className)}
        {...props}
      >
        {isLoading ? (
          <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
        ) : null}
        {children}
      </button>
    );
  }
);
Button.displayName = "Button";
