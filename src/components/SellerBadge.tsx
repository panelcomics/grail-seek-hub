import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Award, Shield, Star } from "lucide-react";

interface SellerBadgeProps {
  tier: string | null;
  className?: string;
}

const tierConfig = {
  premium: {
    icon: Star,
    label: "Premium Dealer",
    tooltip: "Exclusive premium dealer with 0% marketplace fees",
    className: "min-h-[28px]",
    style: { backgroundColor: '#F4C542', color: '#111827', borderColor: 'transparent' },
  },
  pro: {
    icon: Award,
    label: "Pro Seller",
    tooltip: "Elite seller with 100+ completed sales and 4.8+ rating",
    className: "bg-purple-500 hover:bg-purple-600 text-white min-h-[28px]",
    style: undefined,
  },
  verified: {
    icon: Shield,
    label: "Verified",
    tooltip: "Verified seller with proven track record",
    className: "min-h-[28px]",
    style: { backgroundColor: '#1D4ED8', color: '#FFFFFF', borderColor: 'transparent' },
  },
  top: {
    icon: Star,
    label: "Top Seller",
    tooltip: "Top monthly performer",
    className: "min-h-[28px]",
    style: { backgroundColor: '#F4C542', color: '#111827', borderColor: 'transparent' },
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
          <Badge 
            className={`flex items-center gap-1 ${config.className} ${className || ""}`}
            style={config.style}
          >
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
