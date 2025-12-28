// Crowdfunding creator dashboard — recent updates preview
import { FileText, Edit2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

interface Update {
  id: string;
  title: string;
  created_at: string;
}

interface RecentUpdatesPreviewProps {
  updates: Update[];
  onEditUpdate?: (updateId: string) => void;
  className?: string;
}

export function RecentUpdatesPreview({ updates, onEditUpdate, className }: RecentUpdatesPreviewProps) {
  // Show only last 2 updates
  const recentUpdates = updates.slice(0, 2);

  if (recentUpdates.length === 0) {
    return (
      <Card className={cn("border-border/50", className)}>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold">Recent Updates</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="text-center py-6 text-muted-foreground">
            <FileText className="h-8 w-8 mx-auto mb-2 text-muted-foreground/50" />
            <p className="text-sm">Your updates will appear here.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn("border-border/50", className)}>
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold">Recent Updates</CardTitle>
      </CardHeader>
      <CardContent className="pt-0 space-y-3">
        {recentUpdates.map((update) => (
          <div
            key={update.id}
            className="flex items-center justify-between gap-3 p-3 rounded-lg bg-muted/30"
          >
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{update.title}</p>
              <p className="text-xs text-muted-foreground">
                {format(new Date(update.created_at), "MMM d, yyyy")}
              </p>
            </div>
            {onEditUpdate && (
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 shrink-0"
                onClick={() => onEditUpdate(update.id)}
              >
                <Edit2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
