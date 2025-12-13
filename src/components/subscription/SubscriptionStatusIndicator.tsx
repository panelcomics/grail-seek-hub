import { Crown } from "lucide-react";
import { useSubscriptionTier } from "@/hooks/useSubscriptionTier";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

/**
 * Subscription status indicator for the user menu
 * Shows Elite (gold crown) or Free (gray badge) based on subscription_tier
 */
export function SubscriptionStatusIndicator() {
  const { isElite, loading } = useSubscriptionTier();

  if (loading) return null;

  if (isElite) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-gradient-to-r from-amber-500/20 to-yellow-500/20 border border-amber-500/30">
              <Crown className="h-3.5 w-3.5 text-amber-500" />
              <span className="text-xs font-semibold text-amber-600 dark:text-amber-400">
                Elite Member
              </span>
            </div>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="max-w-xs">
            <p className="text-sm">
              Elite unlocks Deal Finder, higher limits, advanced AI tools, and early features.
            </p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge variant="secondary" className="text-xs font-medium">
            Free Plan
          </Badge>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="max-w-xs">
          <p className="text-sm">
            Upgrade to Elite for Deal Finder, higher limits, advanced AI tools, and early features.
          </p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
