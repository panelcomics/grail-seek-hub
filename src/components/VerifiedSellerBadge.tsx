import { ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface VerifiedSellerBadgeProps {
  size?: "sm" | "md" | "lg";
  showText?: boolean;
  showLabel?: boolean; // Backward compatibility
  salesCount?: number; // Backward compatibility
  className?: string;
}

export function VerifiedSellerBadge({ 
  size = "md", 
  showText = true, 
  showLabel = true, 
  salesCount = 0, 
  className = "" 
}: VerifiedSellerBadgeProps) {
  // Only show badge if seller has 10+ completed sales (for backward compatibility)
  if (salesCount > 0 && salesCount < 10) {
    return null;
  }
  
  const iconSizes = {
    sm: "h-3 w-3",
    md: "h-4 w-4",
    lg: "h-5 w-5"
  };
  
  const badgeSizes = {
    sm: "text-[10px] px-1.5 py-0.5",
    md: "text-xs px-2 py-1",
    lg: "text-sm px-3 py-1.5"
  };
  
  const displayText = showText || showLabel;
  
  const badge = (
    <Badge 
      variant="secondary" 
      className={`${badgeSizes[size]} bg-primary/10 text-primary border-primary/20 flex items-center gap-1 ${className}`}
    >
      <ShieldCheck className={iconSizes[size]} />
      {displayText && "Verified"}
    </Badge>
  );
  
  // If salesCount is provided, wrap in tooltip
  if (salesCount > 0) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            {badge}
          </TooltipTrigger>
          <TooltipContent>
            <p className="text-xs">Verified seller with {salesCount}+ completed sales</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return badge;
}
