// Crowdfunding confidence + momentum layers (additive, safe-mode)
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Users } from "lucide-react";
import { cn } from "@/lib/utils";

interface RecentBackersStripProps {
  backersCount: number;
  className?: string;
}

/**
 * Recent Backers Strip - visual activity reinforcement
 * Shows anonymous backer avatars to signal activity
 * Rules:
 * - No social feed
 * - No engagement metrics
 * - Visual only, secondary to campaign content
 */
export function RecentBackersStrip({
  backersCount,
  className,
}: RecentBackersStripProps) {
  // Don't show if no backers
  if (backersCount === 0) {
    return null;
  }

  // Show up to 5 anonymous avatars
  const avatarsToShow = Math.min(backersCount, 5);
  const avatarColors = [
    "bg-primary/20",
    "bg-blue-500/20",
    "bg-green-500/20",
    "bg-purple-500/20",
    "bg-orange-500/20",
  ];

  return (
    <div className={cn("flex items-center gap-3", className)}>
      {/* Stacked avatars */}
      <div className="flex -space-x-2">
        {Array.from({ length: avatarsToShow }).map((_, index) => (
          <Avatar
            key={index}
            className={cn(
              "h-7 w-7 border-2 border-background",
              avatarColors[index % avatarColors.length]
            )}
          >
            <AvatarFallback className="text-[10px] text-muted-foreground">
              <Users className="h-3 w-3" />
            </AvatarFallback>
          </Avatar>
        ))}
        {backersCount > 5 && (
          <div className="h-7 w-7 rounded-full bg-muted border-2 border-background flex items-center justify-center">
            <span className="text-[10px] font-medium text-muted-foreground">
              +{backersCount - 5}
            </span>
          </div>
        )}
      </div>

      {/* Text */}
      <span className="text-sm text-muted-foreground">
        {backersCount === 1
          ? "1 backer supporting"
          : `${backersCount} backers supporting`}
      </span>
    </div>
  );
}
