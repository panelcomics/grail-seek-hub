import { Badge } from "@/components/ui/badge";
import { Shield } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface VerifiedSellerBadgeProps {
  className?: string;
  size?: "sm" | "md" | "lg";
  showLabel?: boolean;
}

export function VerifiedSellerBadge({ className = "", size = "md", showLabel = true }: VerifiedSellerBadgeProps) {
  const iconSize = size === "sm" ? "h-3 w-3" : size === "lg" ? "h-5 w-5" : "h-4 w-4";
  const textSize = size === "sm" ? "text-xs" : size === "lg" ? "text-base" : "text-sm";

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger>
          <Badge
            variant="secondary"
            className={`gap-1.5 bg-gradient-to-r from-primary/20 to-accent/20 border-primary/30 ${textSize} ${className}`}
          >
            <Shield className={iconSize} />
            {showLabel && "Verified Seller"}
          </Badge>
        </TooltipTrigger>
        <TooltipContent>
          <p>Verified by GrailSeeker as a trusted seller</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
