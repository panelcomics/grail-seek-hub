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
            className={`gap-1.5 min-h-[28px] ${className}`}
            style={{ 
              backgroundColor: '#F4C542',
              color: '#111827',
              borderColor: 'transparent'
            }}
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
