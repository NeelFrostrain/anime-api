import React from "react";
import { cn } from "@/lib/utils";

export const Skeleton: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  className,
  ...props
}) => {
  return (
    <div
      className={cn("skeleton-shimmer rounded-md bg-white/[0.04]", className)}
      {...props}
    />
  );
};
