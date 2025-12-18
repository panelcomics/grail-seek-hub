/**
 * BULK SCAN QUEUE
 * ==========================================================================
 * Queue view for Bulk Scan v3 showing all images with their processing status.
 * Each item requires explicit user confirmation before inventory creation.
 * 
 * v3 Features:
 * - Confidence badges (High/Medium/Low)
 * - Fast Confirm for High confidence items
 * ==========================================================================
 */

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Check,
  Clock,
  Loader2,
  Search,
  AlertCircle,
  SkipForward,
  Eye,
  Zap,
  Sparkles,
} from "lucide-react";
import { BulkScanItem, BulkScanItemStatus, ConfidenceLevel } from "@/hooks/useBulkScan";
import { useState } from "react";

interface BulkScanQueueProps {
  items: BulkScanItem[];
  completedCount: number;
  totalCount: number;
  currentItemId: string | null;
  onReviewItem: (item: BulkScanItem) => void;
  onSkipItem: (id: string) => void;
  onManualSearch: (item: BulkScanItem) => void;
  onFastConfirm: (item: BulkScanItem) => void;
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

const confidenceConfig: Record<
  NonNullable<ConfidenceLevel>,
  { label: string; color: string; icon: React.ReactNode }
> = {
  high: {
    label: "High",
    color: "text-green-600 bg-green-500/10 border-green-500/30",
    icon: <Sparkles className="w-3 h-3" />,
  },
  medium: {
    label: "Medium",
    color: "text-amber-600 bg-amber-500/10 border-amber-500/30",
    icon: <Eye className="w-3 h-3" />,
  },
  low: {
    label: "Low",
    color: "text-muted-foreground bg-muted border-border",
    icon: <AlertCircle className="w-3 h-3" />,
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
  onFastConfirm,
}: BulkScanQueueProps) {
  const progressPercent = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;
  const [fastConfirmOpen, setFastConfirmOpen] = useState<string | null>(null);

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
              const isHighConfidence = item.confidence === "high";
              const confidenceInfo = item.confidence ? confidenceConfig[item.confidence] : null;
              const topCandidate = item.candidates[0];

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
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-sm">
                        Comic #{index + 1}
                      </span>
                      <Badge variant={status.variant} className="text-xs gap-1">
                        {status.icon}
                        {status.label}
                      </Badge>
                      {/* Confidence Badge */}
                      {confidenceInfo && canReview && (
                        <Badge 
                          variant="outline" 
                          className={`text-xs gap-1 ${confidenceInfo.color}`}
                        >
                          {confidenceInfo.icon}
                          {confidenceInfo.label} confidence
                        </Badge>
                      )}
                    </div>
                    {/* Show top candidate info for items with matches */}
                    {topCandidate && canReview && (
                      <p className="text-xs text-muted-foreground truncate mt-1">
                        {topCandidate.volumeName || topCandidate.title}
                        {topCandidate.issue && ` #${topCandidate.issue}`}
                        {topCandidate.publisher && ` • ${topCandidate.publisher}`}
                      </p>
                    )}
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
                    {/* Fast Confirm for High Confidence */}
                    {isHighConfidence && canReview && topCandidate && (
                      <Popover 
                        open={fastConfirmOpen === item.id} 
                        onOpenChange={(open) => setFastConfirmOpen(open ? item.id : null)}
                      >
                        <PopoverTrigger asChild>
                          <Button
                            size="sm"
                            variant="default"
                            className="gap-1 bg-green-600 hover:bg-green-700"
                          >
                            <Zap className="w-3 h-3" />
                            Fast Confirm
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-72 p-3" align="end">
                          <div className="space-y-3">
                            <div className="flex gap-2">
                              <img
                                src={topCandidate.thumbUrl || topCandidate.coverUrl}
                                alt="Cover"
                                className="w-12 h-16 object-cover rounded border"
                              />
                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-sm truncate">
                                  {topCandidate.volumeName || topCandidate.title}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  #{topCandidate.issue} • {topCandidate.publisher}
                                </p>
                                <Badge className="text-xs mt-1 bg-green-500/20 text-green-600 border-green-500/30">
                                  <Sparkles className="w-3 h-3 mr-1" />
                                  High confidence match
                                </Badge>
                              </div>
                            </div>
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                className="flex-1"
                                onClick={() => {
                                  setFastConfirmOpen(null);
                                  onFastConfirm(item);
                                }}
                              >
                                <Check className="w-3 h-3 mr-1" />
                                Confirm
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setFastConfirmOpen(null);
                                  onReviewItem(item);
                                }}
                              >
                                Review
                              </Button>
                            </div>
                          </div>
                        </PopoverContent>
                      </Popover>
                    )}
                    {/* Regular Review for Medium/Low confidence */}
                    {canReview && !isHighConfidence && (
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
