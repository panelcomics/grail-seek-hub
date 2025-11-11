import { Star } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface FeaturedSellerBadgeProps {
  className?: string;
  showLabel?: boolean;
}

export function FeaturedSellerBadge({ 
  className = "",
  showLabel = true 
}: FeaturedSellerBadgeProps) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge 
            variant="secondary" 
            className={`gap-1.5 bg-gradient-to-r from-purple-500/20 to-blue-500/20 border-purple-500/30 text-purple-700 dark:text-purple-300 ${className}`}
          >
            <Star className="h-3.5 w-3.5 fill-current" />
            {showLabel && <span>Top Dealer</span>}
          </Badge>
        </TooltipTrigger>
        <TooltipContent>
          <p>Featured top dealer on GrailSeeker</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
