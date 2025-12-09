import { Crown } from "lucide-react";
import { cn } from "@/lib/utils";

interface EliteBadgeProps {
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function EliteBadge({ size = "md", className }: EliteBadgeProps) {
  const sizeClasses = {
    sm: "text-[10px] px-1.5 py-0.5 gap-0.5",
    md: "text-xs px-2 py-0.5 gap-1",
    lg: "text-sm px-2.5 py-1 gap-1.5",
  };

  const iconSizes = {
    sm: "h-2.5 w-2.5",
    md: "h-3 w-3",
    lg: "h-4 w-4",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center font-semibold rounded-full",
        "bg-gradient-to-r from-amber-500 to-yellow-500 text-white",
        "shadow-sm",
        sizeClasses[size],
        className
      )}
    >
      <Crown className={iconSizes[size]} />
      ELITE
    </span>
  );
}
