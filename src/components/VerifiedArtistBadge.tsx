import { Paintbrush } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface VerifiedArtistBadgeProps {
  className?: string;
  showText?: boolean;
}

export const VerifiedArtistBadge = ({ className = "", showText = true }: VerifiedArtistBadgeProps) => {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge variant="default" className={`bg-purple-600 hover:bg-purple-700 text-white ${className}`}>
            <Paintbrush className="h-3 w-3 mr-1" />
            {showText && "Verified Artist"}
          </Badge>
        </TooltipTrigger>
        <TooltipContent>
          <p>Verified Artist — confirmed creator selling their own original work.</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};
