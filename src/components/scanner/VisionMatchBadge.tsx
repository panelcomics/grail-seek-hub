/**
 * VISION MATCH BADGE
 * ==========================================================================
 * Small badge displayed when a scan result was matched using cover image
 * similarity (vision AI) instead of OCR text matching.
 * ==========================================================================
 */

import { Eye } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface VisionMatchBadgeProps {
  score?: number;
  className?: string;
}

export function VisionMatchBadge({ score, className }: VisionMatchBadgeProps) {
  const scorePercent = score ? Math.round(score * 100) : null;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge
            variant="outline"
            className={`bg-purple-500/10 text-purple-600 border-purple-300 text-xs gap-1 ${className || ""}`}
          >
            <Eye className="w-3 h-3" />
            Matched by cover
            {scorePercent !== null && (
              <span className="opacity-70">({scorePercent}%)</span>
            )}
          </Badge>
        </TooltipTrigger>
        <TooltipContent>
          <p>This comic was identified using AI cover image matching</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
