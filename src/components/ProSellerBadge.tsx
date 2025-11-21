import { Star } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface ProSellerBadgeProps {
  size?: "sm" | "md" | "lg";
  showText?: boolean;
}

export function ProSellerBadge({ size = "md", showText = true }: ProSellerBadgeProps) {
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

  return (
    <Badge 
      variant="secondary" 
      className={`${badgeSizes[size]} bg-amber-500/10 text-amber-600 border-amber-500/20 flex items-center gap-1`}
    >
      <Star className={`${iconSizes[size]} fill-current`} />
      {showText && "Pro Seller"}
    </Badge>
  );
}
