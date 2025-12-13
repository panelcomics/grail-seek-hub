import { Palette, PenTool, CheckCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface CreatorBadgeProps {
  isArtist?: boolean;
  isWriter?: boolean;
  showLabel?: boolean;
  size?: "sm" | "md";
}

/**
 * Badge component for approved creators
 * Displays role icons (Artist/Writer) with optional label
 */
export function CreatorBadge({ 
  isArtist = false, 
  isWriter = false,
  showLabel = true,
  size = "md"
}: CreatorBadgeProps) {
  if (!isArtist && !isWriter) return null;

  const sizeClasses = size === "sm" 
    ? "text-[10px] px-1.5 py-0.5 gap-1" 
    : "text-xs px-2 py-1 gap-1.5";

  const iconSize = size === "sm" ? "h-3 w-3" : "h-3.5 w-3.5";

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge 
            variant="secondary" 
            className={`${sizeClasses} bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20`}
          >
            <CheckCircle className={iconSize} />
            {showLabel && "Approved Creator"}
            {isArtist && <Palette className={iconSize} />}
            {isWriter && <PenTool className={iconSize} />}
          </Badge>
        </TooltipTrigger>
        <TooltipContent side="top">
          <p className="text-sm">Verified creator on GrailSeeker</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
