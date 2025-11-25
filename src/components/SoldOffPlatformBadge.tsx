import { Badge } from "@/components/ui/badge";

interface SoldOffPlatformBadgeProps {
  className?: string;
}

export function SoldOffPlatformBadge({ className }: SoldOffPlatformBadgeProps) {
  return (
    <Badge 
      variant="outline" 
      className={`border-orange-500 text-orange-600 bg-orange-500/10 ${className || ''}`}
    >
      Sold (Off-Platform)
    </Badge>
  );
}
