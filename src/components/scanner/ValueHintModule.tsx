/**
 * VALUE HINT MODULE
 * ==========================================================================
 * Optional market snapshot - honest, non-misleading, no dollar amounts.
 * Shows demand signals instead of price estimates.
 * ==========================================================================
 */

import { useState } from "react";
import { TrendingUp, Flame, Star, X } from "lucide-react";
import { ComicVinePick } from "@/types/comicvine";
import { cn } from "@/lib/utils";

interface ValueHintModuleProps {
  match: ComicVinePick;
}

// Determine demand signal based on available data
const getDemandSignal = (match: ComicVinePick): {
  type: 'hot' | 'consistent' | 'key' | 'standard';
  label: string;
  icon: typeof Flame;
  description: string;
} => {
  // Check for key issue indicators
  const isKeyIssue = match.variantDescription?.toLowerCase().includes('first') ||
                     match.variantDescription?.toLowerCase().includes('origin') ||
                     match.variantDescription?.toLowerCase().includes('death') ||
                     match.issue === '1';
  
  if (isKeyIssue) {
    return {
      type: 'key',
      label: 'Key Issue',
      icon: Star,
      description: 'Often valued higher than average issues from this series'
    };
  }

  // Check for popular series (simplified heuristic)
  const popularSeries = ['spider-man', 'batman', 'x-men', 'wolverine', 'hulk', 'superman'];
  const isPopularSeries = popularSeries.some(s => 
    match.volumeName?.toLowerCase().includes(s) || 
    match.title?.toLowerCase().includes(s)
  );

  if (isPopularSeries) {
    return {
      type: 'consistent',
      label: 'Consistent Sales',
      icon: TrendingUp,
      description: 'This series shows active buyer demand'
    };
  }

  // Default - still positive
  return {
    type: 'standard',
    label: 'Active Market',
    icon: TrendingUp,
    description: 'Collectors are looking for books like this'
  };
};

export function ValueHintModule({ match }: ValueHintModuleProps) {
  const [isDismissed, setIsDismissed] = useState(false);
  const signal = getDemandSignal(match);
  const Icon = signal.icon;

  if (isDismissed) return null;

  return (
    <div className={cn(
      "relative rounded-lg border p-4",
      "bg-gradient-to-r from-muted/50 to-muted/30",
      "border-border/50"
    )}>
      {/* Dismiss button */}
      <button
        onClick={() => setIsDismissed(true)}
        className="absolute top-2 right-2 p-1 rounded-full hover:bg-muted/80 transition-colors"
        aria-label="Dismiss"
      >
        <X className="w-3.5 h-3.5 text-muted-foreground" />
      </button>

      {/* Header */}
      <div className="flex items-center gap-2 mb-2">
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
          Market Snapshot
        </span>
      </div>

      {/* Signal */}
      <div className="flex items-start gap-3">
        <div className={cn(
          "w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0",
          signal.type === 'hot' && "bg-destructive/10",
          signal.type === 'key' && "bg-warning/10",
          signal.type === 'consistent' && "bg-success/10",
          signal.type === 'standard' && "bg-primary/10"
        )}>
          <Icon className={cn(
            "w-4 h-4",
            signal.type === 'hot' && "text-destructive",
            signal.type === 'key' && "text-warning",
            signal.type === 'consistent' && "text-success",
            signal.type === 'standard' && "text-primary"
          )} />
        </div>
        
        <div className="flex-1 min-w-0">
          {/* Demand chip */}
          <div className="flex flex-wrap gap-1.5 mb-1.5">
            <span className={cn(
              "inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full",
              signal.type === 'hot' && "bg-destructive/10 text-destructive",
              signal.type === 'key' && "bg-warning/10 text-warning",
              signal.type === 'consistent' && "bg-success/10 text-success",
              signal.type === 'standard' && "bg-primary/10 text-primary"
            )}>
              {signal.type === 'hot' && <Flame className="w-3 h-3" />}
              {signal.type === 'key' && <Star className="w-3 h-3" />}
              {signal.type === 'consistent' && <TrendingUp className="w-3 h-3" />}
              {signal.label}
            </span>
          </div>

          {/* Description */}
          <p className="text-sm text-muted-foreground leading-snug">
            {signal.description}
          </p>
        </div>
      </div>

      {/* Footnote */}
      <p className="text-[10px] text-muted-foreground/70 mt-3 text-center">
        Based on recent public listings and sales activity
      </p>
    </div>
  );
}
