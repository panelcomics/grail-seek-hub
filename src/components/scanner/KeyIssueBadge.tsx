/**
 * KEY ISSUE BADGE
 * ================
 * Displays key issue indicators like "1st Appearance", "Origin Story", etc.
 * Used in scanner results and listing cards to highlight significant issues.
 */

import { Badge } from "@/components/ui/badge";
import { Flame, Star, Sparkles, Skull, Heart } from "lucide-react";
import { cn } from "@/lib/utils";

interface KeyIssueBadgeProps {
  indicator: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

// Map indicators to icons and colors
const INDICATOR_CONFIG: Record<string, { 
  icon: React.ElementType; 
  bgClass: string; 
  textClass: string;
  label?: string;
}> = {
  '1st Appearance': { 
    icon: Flame, 
    bgClass: 'bg-orange-500/15 border-orange-500/30', 
    textClass: 'text-orange-600 dark:text-orange-400',
    label: '1st Appearance'
  },
  'Origin Story': { 
    icon: Sparkles, 
    bgClass: 'bg-purple-500/15 border-purple-500/30', 
    textClass: 'text-purple-600 dark:text-purple-400',
    label: 'Origin Story'
  },
  'Death Issue': { 
    icon: Skull, 
    bgClass: 'bg-red-500/15 border-red-500/30', 
    textClass: 'text-red-600 dark:text-red-400',
    label: 'Death Issue'
  },
  'Wedding Issue': { 
    icon: Heart, 
    bgClass: 'bg-pink-500/15 border-pink-500/30', 
    textClass: 'text-pink-600 dark:text-pink-400',
    label: 'Wedding Issue'
  },
  '1st Print': { 
    icon: Star, 
    bgClass: 'bg-yellow-500/15 border-yellow-500/30', 
    textClass: 'text-yellow-600 dark:text-yellow-400',
    label: '1st Print'
  },
  'Key Issue': { 
    icon: Star, 
    bgClass: 'bg-amber-500/15 border-amber-500/30', 
    textClass: 'text-amber-600 dark:text-amber-400',
    label: 'Key Issue'
  },
  'Newsstand Edition': { 
    icon: Star, 
    bgClass: 'bg-blue-500/15 border-blue-500/30', 
    textClass: 'text-blue-600 dark:text-blue-400',
    label: 'Newsstand'
  },
};

export function KeyIssueBadge({ indicator, size = 'md', className }: KeyIssueBadgeProps) {
  const config = INDICATOR_CONFIG[indicator] || {
    icon: Star,
    bgClass: 'bg-amber-500/15 border-amber-500/30',
    textClass: 'text-amber-600 dark:text-amber-400',
    label: indicator
  };

  const Icon = config.icon;
  
  const sizeClasses = {
    sm: 'text-[10px] px-1.5 py-0.5',
    md: 'text-xs px-2 py-1',
    lg: 'text-sm px-3 py-1.5'
  };
  
  const iconSizes = {
    sm: 'w-3 h-3',
    md: 'w-3.5 h-3.5',
    lg: 'w-4 h-4'
  };

  return (
    <Badge 
      variant="outline"
      className={cn(
        "font-semibold border gap-1 inline-flex items-center",
        config.bgClass,
        config.textClass,
        sizeClasses[size],
        className
      )}
    >
      <Icon className={iconSizes[size]} />
      <span>{config.label || indicator}</span>
    </Badge>
  );
}

/**
 * Parse key notes string and extract key issue indicators
 */
export function parseKeyNotes(keyNotes: string | null | undefined): string[] {
  if (!keyNotes) return [];
  
  const indicators: string[] = [];
  const lower = keyNotes.toLowerCase();
  
  if (/first\s*appearance|1st\s*app/i.test(lower)) {
    indicators.push('1st Appearance');
  }
  if (/origin/i.test(lower)) {
    indicators.push('Origin Story');
  }
  if (/death\s*of/i.test(lower)) {
    indicators.push('Death Issue');
  }
  if (/wedding/i.test(lower)) {
    indicators.push('Wedding Issue');
  }
  
  return indicators;
}
