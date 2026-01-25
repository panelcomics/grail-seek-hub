/**
 * CONFIDENCE TIER BADGE
 * ==========================================================================
 * Displays a visual confidence tier badge based on scanner confidence score:
 * - 90-100: "Locked in" (green)
 * - 70-89: "Pretty confident" (blue)
 * - <70: Automatically triggers ManualConfirmPanel (no badge needed)
 * ==========================================================================
 */

import { Badge } from "@/components/ui/badge";
import { Lock, ThumbsUp } from "lucide-react";
import { SCAN_AUTO_CONFIRM_THRESHOLD } from "@/types/scannerState";
import { cn } from "@/lib/utils";

interface ConfidenceTierBadgeProps {
  confidence: number | null;
  className?: string;
  showIcon?: boolean;
  size?: "sm" | "md";
}

type ConfidenceTier = "locked" | "confident" | "low";

interface TierConfig {
  tier: ConfidenceTier;
  label: string;
  icon: typeof Lock;
  className: string;
}

const getTierConfig = (confidence: number): TierConfig => {
  if (confidence >= 90) {
    return {
      tier: "locked",
      label: "Locked in",
      icon: Lock,
      className: "bg-success/10 text-success border-success/30 hover:bg-success/20"
    };
  }
  
  if (confidence >= SCAN_AUTO_CONFIRM_THRESHOLD) {
    return {
      tier: "confident",
      label: "Pretty confident",
      icon: ThumbsUp,
      className: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30 hover:bg-blue-500/20"
    };
  }
  
  // Below threshold - usually ManualConfirmPanel opens
  return {
    tier: "low",
    label: "Needs confirmation",
    icon: ThumbsUp,
    className: "bg-warning/10 text-warning border-warning/30"
  };
};

export function ConfidenceTierBadge({ 
  confidence, 
  className,
  showIcon = true,
  size = "sm"
}: ConfidenceTierBadgeProps) {
  // Don't render if no confidence
  if (confidence === null) {
    return null;
  }

  const config = getTierConfig(confidence);
  const Icon = config.icon;
  
  // Don't show badge for low confidence (ManualConfirm handles that)
  if (config.tier === "low") {
    return null;
  }

  return (
    <Badge
      variant="outline"
      className={cn(
        "font-medium transition-colors",
        config.className,
        size === "sm" ? "text-xs px-2 py-0.5" : "text-sm px-3 py-1",
        className
      )}
    >
      {showIcon && (
        <Icon className={cn("mr-1", size === "sm" ? "h-3 w-3" : "h-4 w-4")} />
      )}
      {config.label}
      <span className="ml-1 opacity-70">{confidence}%</span>
    </Badge>
  );
}

/**
 * Get just the tier info without rendering
 */
export function getConfidenceTier(confidence: number | null): ConfidenceTier | null {
  if (confidence === null) return null;
  if (confidence >= 90) return "locked";
  if (confidence >= SCAN_AUTO_CONFIRM_THRESHOLD) return "confident";
  return "low";
}
