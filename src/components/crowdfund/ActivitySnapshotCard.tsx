// Crowdfunding creator dashboard — activity snapshot (non-financial)
import { Users, TrendingUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface ActivitySnapshotCardProps {
  backersCount: number;
  recentActivityCount?: number;
  className?: string;
}

export function ActivitySnapshotCard({ 
  backersCount, 
  recentActivityCount = 0,
  className 
}: ActivitySnapshotCardProps) {
  // Determine activity message - always positive
  const getActivityMessage = () => {
    if (recentActivityCount >= 5) {
      return "Activity picking up";
    }
    if (recentActivityCount >= 2) {
      return "New backers recently";
    }
    if (backersCount > 0) {
      return "Early support coming in";
    }
    return "Awaiting first backers";
  };

  return (
    <Card className={cn("border-border/50", className)}>
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold">Activity Snapshot</CardTitle>
      </CardHeader>
      <CardContent className="pt-0 space-y-4">
        {/* Backers count */}
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
            <Users className="h-5 w-5 text-primary" />
          </div>
          <div>
            <p className="text-2xl font-bold">{backersCount}</p>
            <p className="text-xs text-muted-foreground">
              backer{backersCount !== 1 ? "s" : ""}
            </p>
          </div>
        </div>

        {/* Activity indicator */}
        <div className="flex items-center gap-2 text-sm">
          <TrendingUp className="h-4 w-4 text-primary" />
          <span className="text-muted-foreground">{getActivityMessage()}</span>
        </div>
      </CardContent>
    </Card>
  );
}
