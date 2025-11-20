import { Badge } from "@/components/ui/badge";
import { ShieldCheck } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface VerifiedSellerBadgeProps {
  salesCount?: number;
  className?: string;
  size?: "sm" | "md" | "lg";
  showLabel?: boolean;
}

export function VerifiedSellerBadge({ salesCount = 0, className = "", size = "md", showLabel = true }: VerifiedSellerBadgeProps) {
  // Only show badge if seller has 10+ completed sales
  if (salesCount < 10) {
    return null;
  }

  const iconSize = size === "sm" ? "h-3 w-3" : size === "lg" ? "h-5 w-5" : "h-4 w-4";
  const textSize = size === "sm" ? "text-[10px]" : size === "lg" ? "text-sm" : "text-xs";

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge
            variant="secondary"
            className={`gap-1 bg-blue-500/10 border border-blue-500/30 text-blue-600 dark:text-blue-400 hover:bg-blue-500/20 ${textSize} ${className}`}
          >
            <ShieldCheck className={iconSize} />
            {showLabel && "Verified Seller"}
          </Badge>
        </TooltipTrigger>
        <TooltipContent>
          <p className="text-xs">Verified seller with {salesCount}+ completed sales</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
