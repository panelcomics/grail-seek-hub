/**
 * HeatScoreBadge Component
 * 
 * Displays a heat score (0-100) with contextual labels and tooltip.
 * Presentation only - does not affect how scores are calculated.
 * 
 * Labels based on score ranges:
 * - 70+: "Heating Up" (red)
 * - 40-69: "Sustained Interest" (amber)
 * - 0-39: "Cooling Off" (blue/gray)
 */

import { Flame, Info } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface HeatScoreBadgeProps {
  score: number;
  showTooltip?: boolean;
  showLabel?: boolean;
  size?: "sm" | "md";
}

function getHeatLabel(score: number): { label: string; color: string; bgClass: string } {
  if (score >= 70) {
    return { 
      label: "Heating Up", 
      color: "text-red-500",
      bgClass: "bg-red-500/10 border-red-500/30 text-red-600 dark:text-red-400"
    };
  }
  if (score >= 40) {
    return { 
      label: "Sustained Interest", 
      color: "text-amber-500",
      bgClass: "bg-amber-500/10 border-amber-500/30 text-amber-600 dark:text-amber-400"
    };
  }
  return { 
    label: "Cooling Off", 
    color: "text-blue-400",
    bgClass: "bg-blue-500/10 border-blue-500/30 text-blue-600 dark:text-blue-400"
  };
}

export function HeatScoreBadge({ 
  score, 
  showTooltip = true, 
  showLabel = true,
  size = "md" 
}: HeatScoreBadgeProps) {
  const { label, color, bgClass } = getHeatLabel(score);
  
  const isSmall = size === "sm";
  const iconSize = isSmall ? "h-2.5 w-2.5" : "h-3 w-3";
  const textSize = isSmall ? "text-[9px]" : "text-[10px]";
  const padding = isSmall ? "px-1 py-0" : "px-1.5 py-0.5";

  const badgeContent = (
    <Badge 
      variant="outline" 
      className={`${bgClass} ${textSize} font-bold ${padding} gap-0.5 border`}
    >
      <Flame className={`${iconSize} ${color}`} />
      <span>Heat: {score}</span>
      {showLabel && <span className="opacity-75">· {label}</span>}
    </Badge>
  );

  if (!showTooltip) {
    return badgeContent;
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="inline-flex items-center gap-0.5 cursor-help">
            {badgeContent}
            <Info className={`${isSmall ? 'h-2.5 w-2.5' : 'h-3 w-3'} text-muted-foreground opacity-50`} />
          </div>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-[220px] text-xs">
          <p className="font-medium mb-1">Heat Score reflects collector activity</p>
          <p className="text-muted-foreground">
            Based on searches and wantlists. It does not predict prices or guarantee value.
          </p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export { getHeatLabel };
