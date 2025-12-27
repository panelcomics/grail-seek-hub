// Founding Seller identity layer — presentation only
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Shield } from "lucide-react";
import { cn } from "@/lib/utils";

interface FoundingSellerBadgeProps {
  className?: string;
  size?: "sm" | "md" | "lg";
  showTooltip?: boolean;
}

/**
 * Visual badge for Founding Sellers
 * - Subtle gold/accent styling
 * - Shield icon for trust
 * - Calm, professional appearance
 */
export function FoundingSellerBadge({ 
  className, 
  size = "md",
  showTooltip = true 
}: FoundingSellerBadgeProps) {
  const sizeClasses = {
    sm: "text-[10px] px-1.5 py-0.5 gap-0.5",
    md: "text-xs px-2 py-0.5 gap-1",
    lg: "text-sm px-2.5 py-1 gap-1.5",
  };

  const iconSizes = {
    sm: "h-2.5 w-2.5",
    md: "h-3 w-3",
    lg: "h-3.5 w-3.5",
  };

  const badge = (
    <Badge
      variant="outline"
      className={cn(
        "bg-amber-50 dark:bg-amber-950/30 border-amber-300 dark:border-amber-700 text-amber-700 dark:text-amber-400",
        "font-medium inline-flex items-center",
        sizeClasses[size],
        className
      )}
    >
      <Shield className={cn(iconSizes[size], "shrink-0")} />
      <span>Founding Seller</span>
    </Badge>
  );

  if (!showTooltip) {
    return badge;
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          {badge}
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-[200px] text-center">
          <p className="text-xs">
            Founding Sellers helped shape GrailSeeker from day one.
          </p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
