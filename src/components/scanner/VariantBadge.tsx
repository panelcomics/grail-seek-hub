/**
 * VARIANT BADGE
 * ==========================================================================
 * Displays detected variant cover information with appropriate styling
 * ==========================================================================
 */

import { Badge } from "@/components/ui/badge";
import { Sparkles, Palette, Star, Zap, Printer, Newspaper } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export interface VariantInfo {
  isVariant: boolean;
  variantType: string | null;
  variantDetails: string | null;
  ratioVariant: string | null;
  variantArtist: string | null;
}

interface VariantBadgeProps {
  variant: VariantInfo;
  size?: 'sm' | 'md' | 'lg';
  showTooltip?: boolean;
  className?: string;
}

const variantConfig: Record<string, { 
  icon: typeof Sparkles; 
  color: string; 
  label: string;
  bgColor: string;
}> = {
  ratio: { 
    icon: Star, 
    color: 'text-amber-600', 
    label: 'Ratio Variant',
    bgColor: 'bg-amber-500/10 border-amber-500/30'
  },
  virgin: { 
    icon: Sparkles, 
    color: 'text-purple-600', 
    label: 'Virgin Cover',
    bgColor: 'bg-purple-500/10 border-purple-500/30'
  },
  variant: { 
    icon: Palette, 
    color: 'text-blue-600', 
    label: 'Variant Cover',
    bgColor: 'bg-blue-500/10 border-blue-500/30'
  },
  homage: { 
    icon: Palette, 
    color: 'text-indigo-600', 
    label: 'Homage Cover',
    bgColor: 'bg-indigo-500/10 border-indigo-500/30'
  },
  sketch: { 
    icon: Palette, 
    color: 'text-gray-600', 
    label: 'Sketch Variant',
    bgColor: 'bg-gray-500/10 border-gray-500/30'
  },
  foil: { 
    icon: Zap, 
    color: 'text-yellow-600', 
    label: 'Foil Cover',
    bgColor: 'bg-yellow-500/10 border-yellow-500/30'
  },
  exclusive: { 
    icon: Star, 
    color: 'text-red-600', 
    label: 'Exclusive',
    bgColor: 'bg-red-500/10 border-red-500/30'
  },
  printing: { 
    icon: Printer, 
    color: 'text-orange-600', 
    label: 'Later Printing',
    bgColor: 'bg-orange-500/10 border-orange-500/30'
  },
  newsstand: { 
    icon: Newspaper, 
    color: 'text-emerald-600', 
    label: 'Newsstand',
    bgColor: 'bg-emerald-500/10 border-emerald-500/30'
  },
};

export function VariantBadge({ 
  variant, 
  size = 'md', 
  showTooltip = true,
  className 
}: VariantBadgeProps) {
  if (!variant.isVariant) return null;

  const config = variantConfig[variant.variantType || 'variant'] || variantConfig.variant;
  const Icon = config.icon;

  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-sm px-3 py-1',
    lg: 'text-base px-4 py-1.5'
  };

  const iconSizes = {
    sm: 'h-3 w-3',
    md: 'h-4 w-4',
    lg: 'h-5 w-5'
  };

  const displayText = variant.ratioVariant || config.label;
  const tooltipContent = variant.variantDetails || config.label;

  const badge = (
    <Badge
      variant="outline"
      className={cn(
        "font-medium gap-1.5 border",
        config.color,
        config.bgColor,
        sizeClasses[size],
        className
      )}
    >
      <Icon className={iconSizes[size]} />
      <span>{displayText}</span>
      {variant.variantArtist && size !== 'sm' && (
        <span className="text-muted-foreground font-normal">
          by {variant.variantArtist}
        </span>
      )}
    </Badge>
  );

  if (!showTooltip || !variant.variantDetails) {
    return badge;
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          {badge}
        </TooltipTrigger>
        <TooltipContent>
          <p className="font-medium">{tooltipContent}</p>
          {variant.variantArtist && (
            <p className="text-xs text-muted-foreground">Artist: {variant.variantArtist}</p>
          )}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

/**
 * Compact variant indicator for listing cards
 */
export function VariantIndicator({ variant }: { variant: VariantInfo }) {
  if (!variant.isVariant) return null;

  const config = variantConfig[variant.variantType || 'variant'] || variantConfig.variant;
  const Icon = config.icon;

  return (
    <div 
      className={cn(
        "absolute top-2 right-2 h-6 w-6 rounded-full flex items-center justify-center",
        "bg-background/90 backdrop-blur-sm border shadow-sm",
        config.color
      )}
      title={variant.variantDetails || 'Variant Cover'}
    >
      <Icon className="h-3.5 w-3.5" />
    </div>
  );
}
