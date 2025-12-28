// Seller momentum indicator — positive-only, additive
import { Flame } from "lucide-react";
import { cn } from "@/lib/utils";

interface SellerMomentumIndicatorProps {
  /** Number of consecutive days with activity */
  streakDays: number;
  /** Whether data is still loading */
  isLoading?: boolean;
  /** Size variant */
  size?: "sm" | "md";
  className?: string;
}

/**
 * Positive-only momentum indicator for sellers.
 * - Shows encouraging streak messages
 * - Never shows loss framing or warnings
 * - Hides cleanly when no streak
 */
export function SellerMomentumIndicator({
  streakDays,
  isLoading = false,
  size = "sm",
  className,
}: SellerMomentumIndicatorProps) {
  // Don't show anything while loading
  if (isLoading) return null;

  // Don't show if no streak (positive-only, no loss messaging)
  if (streakDays <= 0) return null;

  // Choose encouraging message based on streak length
  const getMessage = () => {
    if (streakDays === 1) {
      return "Momentum building — keep going";
    }
    if (streakDays <= 3) {
      return `${streakDays}-day listing streak`;
    }
    if (streakDays <= 7) {
      return `You've listed books ${streakDays} days in a row`;
    }
    return `${streakDays}-day streak — amazing consistency`;
  };

  const sizeClasses = {
    sm: "text-xs gap-1.5 px-2.5 py-1",
    md: "text-sm gap-2 px-3 py-1.5",
  };

  const iconSizes = {
    sm: "h-3.5 w-3.5",
    md: "h-4 w-4",
  };

  return (
    <div
      className={cn(
        "inline-flex items-center rounded-full",
        "bg-orange-100 dark:bg-orange-950/40 text-orange-700 dark:text-orange-400",
        "border border-orange-200 dark:border-orange-800/50",
        sizeClasses[size],
        className
      )}
    >
      <Flame className={cn(iconSizes[size], "shrink-0")} />
      <span className="font-medium">{getMessage()}</span>
    </div>
  );
}

/**
 * Empty/early state component for sellers with no streak yet
 */
export function SellerMomentumEmpty({
  onScan,
  className,
}: {
  onScan?: () => void;
  className?: string;
}) {
  return (
    <p className={cn("text-xs text-muted-foreground", className)}>
      Your first listing starts your momentum.
    </p>
  );
}
