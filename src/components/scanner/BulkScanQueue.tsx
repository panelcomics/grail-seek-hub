/**
 * BULK SCAN QUEUE
 * ==========================================================================
 * Queue view for Bulk Scan v2 showing all images with their processing status.
 * Each item requires explicit user confirmation before inventory creation.
 * ==========================================================================
 */

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Check,
  Clock,
  Loader2,
  Search,
  AlertCircle,
  SkipForward,
  Eye,
} from "lucide-react";
import { BulkScanItem, BulkScanItemStatus } from "@/hooks/useBulkScan";

interface BulkScanQueueProps {
  items: BulkScanItem[];
  completedCount: number;
  totalCount: number;
  currentItemId: string | null;
  onReviewItem: (item: BulkScanItem) => void;
  onSkipItem: (id: string) => void;
  onManualSearch: (item: BulkScanItem) => void;
}

const statusConfig: Record<
  BulkScanItemStatus,
  { label: string; variant: "default" | "secondary" | "outline" | "destructive"; icon: React.ReactNode }
> = {
  queued: {
    label: "Queued",
    variant: "outline",
    icon: <Clock className="w-3 h-3" />,
  },
  processing: {
    label: "Processing",
    variant: "secondary",
    icon: <Loader2 className="w-3 h-3 animate-spin" />,
  },
  match_found: {
    label: "Match found",
    variant: "default",
    icon: <Check className="w-3 h-3" />,
  },
  needs_review: {
    label: "Needs review",
    variant: "secondary",
    icon: <Eye className="w-3 h-3" />,
  },
  no_match: {
    label: "No match",
    variant: "outline",
    icon: <AlertCircle className="w-3 h-3" />,
  },
  completed: {
    label: "Completed",
    variant: "default",
    icon: <Check className="w-3 h-3" />,
  },
  skipped: {
    label: "Skipped",
    variant: "outline",
    icon: <SkipForward className="w-3 h-3" />,
  },
};

export function BulkScanQueue({
  items,
  completedCount,
  totalCount,
  currentItemId,
  onReviewItem,
  onSkipItem,
  onManualSearch,
}: BulkScanQueueProps) {
  const progressPercent = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Scan Queue</CardTitle>
          <span className="text-sm text-muted-foreground">
            {completedCount} of {totalCount} confirmed
          </span>
        </div>
        <Progress value={progressPercent} className="h-2" />
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="h-[400px]">
          <div className="space-y-1 p-4 pt-0">
            {items.map((item, index) => {
              const status = statusConfig[item.status];
              const isActive = item.id === currentItemId;
              const canReview =
                item.status === "match_found" ||
                item.status === "needs_review";
              const canManualSearch =
                item.status === "no_match" || item.status === "needs_review";
              const isActionable =
                canReview || canManualSearch || item.status === "queued";
              const isDone =
                item.status === "completed" || item.status === "skipped";

              return (
                <div
                  key={item.id}
                  className={`
                    flex items-center gap-3 p-2 rounded-lg transition-colors
                    ${isActive ? "bg-primary/10 border border-primary/30" : "hover:bg-accent/50"}
                    ${isDone ? "opacity-60" : ""}
                  `}
                >
                  {/* Thumbnail */}
                  <div className="flex-shrink-0 w-12 h-16 rounded overflow-hidden border border-border bg-muted">
                    <img
                      src={item.imageData}
                      alt={`Comic ${index + 1}`}
                      className="w-full h-full object-cover"
                    />
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">
                        Comic #{index + 1}
                      </span>
                      <Badge variant={status.variant} className="text-xs gap-1">
                        {status.icon}
                        {status.label}
                      </Badge>
                    </div>
                    {item.selectedPick && (
                      <p className="text-xs text-muted-foreground truncate mt-1">
                        {item.selectedPick.volumeName || item.selectedPick.title}
                        {item.selectedPick.issue && ` #${item.selectedPick.issue}`}
                      </p>
                    )}
                    {item.error && (
                      <p className="text-xs text-destructive mt-1">{item.error}</p>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex-shrink-0 flex gap-1">
                    {canReview && (
                      <Button
                        size="sm"
                        variant="default"
                        onClick={() => onReviewItem(item)}
                      >
                        Review & confirm
                      </Button>
                    )}
                    {canManualSearch && !canReview && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => onManualSearch(item)}
                      >
                        <Search className="w-3 h-3 mr-1" />
                        Search
                      </Button>
                    )}
                    {isActionable && item.status !== "processing" && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => onSkipItem(item.id)}
                      >
                        Skip
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
