import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Award, Shield, Star } from "lucide-react";

interface SellerBadgeProps {
  tier: string | null;
  className?: string;
}

const tierConfig = {
  pro: {
    icon: Award,
    label: "Pro Seller",
    tooltip: "Elite seller with 100+ completed sales and 4.8+ rating",
    className: "bg-purple-500 hover:bg-purple-600 text-white",
  },
  verified: {
    icon: Shield,
    label: "Verified",
    tooltip: "Verified seller with proven track record",
    className: "bg-blue-500 hover:bg-blue-600 text-white",
  },
  top: {
    icon: Star,
    label: "Top Seller",
    tooltip: "Top monthly performer",
    className: "bg-yellow-500 hover:bg-yellow-600 text-yellow-950",
  },
};

export const SellerBadge = ({ tier, className }: SellerBadgeProps) => {
  if (!tier || !tierConfig[tier as keyof typeof tierConfig]) {
    return null;
  }

  const config = tierConfig[tier as keyof typeof tierConfig];
  const Icon = config.icon;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge className={`flex items-center gap-1 ${config.className} ${className || ""}`}>
            <Icon className="h-3 w-3" />
            <span className="text-xs font-medium">{config.label}</span>
          </Badge>
        </TooltipTrigger>
        <TooltipContent>
          <p className="text-xs">{config.tooltip}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};
