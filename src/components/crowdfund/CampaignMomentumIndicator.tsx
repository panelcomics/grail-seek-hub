// Crowdfunding confidence + momentum layers (additive, safe-mode)
import { TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";

interface CampaignMomentumIndicatorProps {
  backersCount: number;
  currentPledgedCents: number;
  createdAt: string;
  className?: string;
  variant?: "inline" | "card";
}

/**
 * Campaign Momentum Indicator - shows positive activity signals
 * Rules:
 * - Never show negative language
 * - Never show countdown pressure
 * - Hides gracefully if no activity data
 */
export function CampaignMomentumIndicator({
  backersCount,
  currentPledgedCents,
  createdAt,
  className,
  variant = "inline",
}: CampaignMomentumIndicatorProps) {
  // Calculate days since launch
  const daysSinceLaunch = Math.floor(
    (Date.now() - new Date(createdAt).getTime()) / (1000 * 60 * 60 * 24)
  );

  // Determine momentum message based on activity
  const getMomentumMessage = () => {
    // New campaign (launched within last 3 days)
    if (daysSinceLaunch <= 3) {
      if (backersCount > 0) {
        return "Early backing underway";
      }
      return "Campaign just launched";
    }

    // Active campaign with backers
    if (backersCount >= 10) {
      return "Backers joining regularly";
    }

    if (backersCount >= 5) {
      return "Momentum building";
    }

    if (backersCount > 0) {
      return "Funding activity happening";
    }

    // No backers yet - show encouraging message
    if (currentPledgedCents === 0) {
      return "Be among the first backers";
    }

    return "Funding in progress";
  };

  const message = getMomentumMessage();

  if (variant === "card") {
    return (
      <div
        className={cn(
          "flex items-center gap-2 px-3 py-2 rounded-lg",
          "bg-primary/5 border border-primary/10",
          className
        )}
      >
        <TrendingUp className="h-4 w-4 text-primary shrink-0" />
        <span className="text-sm text-foreground/80">{message}</span>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "inline-flex items-center gap-1.5 text-sm text-muted-foreground",
        className
      )}
    >
      <TrendingUp className="h-3.5 w-3.5 text-primary" />
      <span>{message}</span>
    </div>
  );
}
