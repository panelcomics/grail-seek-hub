/**
 * Restoration Badge Component
 * 
 * Displays a prominent warning badge when a comic has restoration markers
 * (color touch, tape, trimmed, etc.) - similar to CGC "Purple Label" indicators.
 * 
 * This badge is designed to be HIGHLY VISIBLE to prevent buyer confusion.
 */

import { Badge } from "@/components/ui/badge";
import { AlertTriangle } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

// Map of restoration marker keys to human-readable labels
const RESTORATION_LABELS: Record<string, string> = {
  color_touch: "Color Touch",
  trimmed: "Trimmed",
  tape: "Tape",
  cleaned: "Cleaned",
  piece_added: "Piece Added",
  tear_sealed: "Tear Sealed",
  staple_replaced: "Staple Replaced",
  spine_roll_fix: "Spine Roll Fix",
};

interface RestorationBadgeProps {
  markers: string[] | null | undefined;
  size?: "sm" | "md" | "lg";
  showDetails?: boolean;
}

export function RestorationBadge({ 
  markers, 
  size = "md",
  showDetails = true 
}: RestorationBadgeProps) {
  // Handle various input types
  const markerArray = parseMarkers(markers);
  
  if (!markerArray || markerArray.length === 0) {
    return null;
  }

  const sizeClasses = {
    sm: "text-[9px] px-1.5 py-0.5",
    md: "text-xs px-2 py-1",
    lg: "text-sm px-3 py-1.5",
  };

  const iconSizes = {
    sm: "h-2.5 w-2.5",
    md: "h-3 w-3",
    lg: "h-4 w-4",
  };

  const badgeContent = (
    <Badge 
      className={`${sizeClasses[size]} font-bold bg-purple-600 hover:bg-purple-700 text-white border-0 flex items-center gap-1`}
    >
      <AlertTriangle className={iconSizes[size]} />
      <span>Restored</span>
    </Badge>
  );

  if (!showDetails) {
    return badgeContent;
  }

  // Format marker labels for tooltip
  const markerLabels = markerArray
    .map(m => RESTORATION_LABELS[m] || m.replace(/_/g, ' '))
    .join(", ");

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          {badgeContent}
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-xs">
          <p className="text-xs font-semibold mb-1">Restoration Detected:</p>
          <p className="text-xs">{markerLabels}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

/**
 * Parse restoration markers from various input types
 * (JSONB can come as array, string, or object)
 */
function parseMarkers(markers: any): string[] | null {
  if (!markers) return null;
  
  // Already an array
  if (Array.isArray(markers)) {
    return markers.filter(m => typeof m === 'string' && m.length > 0);
  }
  
  // JSON string
  if (typeof markers === 'string') {
    try {
      const parsed = JSON.parse(markers);
      if (Array.isArray(parsed)) {
        return parsed.filter(m => typeof m === 'string' && m.length > 0);
      }
    } catch {
      return null;
    }
  }
  
  return null;
}

/**
 * Check if listing has restoration markers
 */
export function hasRestoration(markers: any): boolean {
  const parsed = parseMarkers(markers);
  return parsed !== null && parsed.length > 0;
}

/**
 * Get formatted restoration summary for display
 */
export function getRestorationSummary(markers: any): string | null {
  const parsed = parseMarkers(markers);
  if (!parsed || parsed.length === 0) return null;
  
  return parsed
    .map(m => RESTORATION_LABELS[m] || m.replace(/_/g, ' '))
    .join(", ");
}

export default RestorationBadge;
