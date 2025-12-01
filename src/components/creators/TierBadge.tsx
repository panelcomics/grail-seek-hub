import { Badge } from "@/components/ui/badge";
import { Award } from "lucide-react";

interface TierBadgeProps {
  tier: "bronze" | "silver" | "gold" | null;
  className?: string;
}

export function TierBadge({ tier, className }: TierBadgeProps) {
  if (!tier) return null;

  const tierConfig = {
    gold: {
      color: "border-yellow-500 text-yellow-500",
      label: "Gold Creator"
    },
    silver: {
      color: "border-gray-400 text-gray-400",
      label: "Silver Creator"
    },
    bronze: {
      color: "border-orange-700 text-orange-700",
      label: "Bronze Creator"
    }
  };

  const config = tierConfig[tier];

  return (
    <Badge variant="outline" className={`gap-1 ${config.color} ${className}`}>
      <Award className="w-3 h-3" />
      {config.label}
    </Badge>
  );
}
