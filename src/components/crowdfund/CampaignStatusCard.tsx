// Crowdfunding creator dashboard — campaign status card
import { Calendar, Clock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface CampaignStatusCardProps {
  title: string;
  status: "draft" | "live" | "upcoming" | "completed" | "cancelled";
  endsAt: string;
  className?: string;
}

const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "outline" }> = {
  draft: { label: "Draft", variant: "secondary" },
  live: { label: "Live", variant: "default" },
  upcoming: { label: "Upcoming", variant: "outline" },
  completed: { label: "Completed", variant: "secondary" },
  cancelled: { label: "Cancelled", variant: "secondary" },
};

export function CampaignStatusCard({ title, status, endsAt, className }: CampaignStatusCardProps) {
  const config = statusConfig[status] || statusConfig.draft;
  
  const daysRemaining = Math.max(
    0,
    Math.ceil((new Date(endsAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
  );

  // Neutral time remaining phrasing
  const getTimeRemainingText = () => {
    if (status === "completed" || status === "cancelled") {
      return "Campaign ended";
    }
    if (daysRemaining === 0) {
      return "Final day";
    }
    if (daysRemaining === 1) {
      return "1 day remaining";
    }
    return `${daysRemaining} days remaining`;
  };

  return (
    <Card className={cn("border-border/50", className)}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <CardTitle className="text-base font-semibold leading-tight flex-1">
            {title}
          </CardTitle>
          <Badge variant={config.variant} className="shrink-0">
            {config.label}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Clock className="h-4 w-4" />
          <span>{getTimeRemainingText()}</span>
        </div>
      </CardContent>
    </Card>
  );
}
