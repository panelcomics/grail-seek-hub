/**
 * BULK SCAN REVIEW MODAL
 * ==========================================================================
 * Review and confirm a single bulk scan item.
 * User MUST select a candidate before confirming.
 * ==========================================================================
 */

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Check, Search, AlertCircle } from "lucide-react";
import { ComicVinePick } from "@/types/comicvine";
import { BulkScanItem } from "@/hooks/useBulkScan";
import { getConfidenceLabel } from "@/lib/comicVineMatchingStrategy";

interface BulkScanReviewModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: BulkScanItem | null;
  onConfirm: (pick: ComicVinePick) => void;
  onSkip: () => void;
  onManualSearch: () => void;
}

export function BulkScanReviewModal({
  open,
  onOpenChange,
  item,
  onConfirm,
  onSkip,
  onManualSearch,
}: BulkScanReviewModalProps) {
  const [selectedId, setSelectedId] = useState<number | null>(null);

  const handleConfirm = () => {
    if (item && selectedId !== null) {
      const selected = item.candidates.find((c) => c.id === selectedId);
      if (selected) {
        onConfirm(selected);
        setSelectedId(null);
      }
    }
  };

  const handleClose = () => {
    setSelectedId(null);
    onOpenChange(false);
  };

  if (!item) return null;

  const hasMatches = item.candidates.length > 0;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>Review & Confirm</DialogTitle>
          <DialogDescription>
            {hasMatches
              ? "Select the correct match for this comic."
              : "No confident matches found. Search manually or skip."}
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Original Image */}
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-muted-foreground">
              Your Photo
            </h4>
            <div className="aspect-[2/3] rounded-lg overflow-hidden border border-border bg-muted">
              <img
                src={item.imageData}
                alt="Uploaded comic"
                className="w-full h-full object-contain"
              />
            </div>
          </div>

          {/* Candidates */}
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-muted-foreground">
              {hasMatches ? "Possible Matches" : "No Matches Found"}
            </h4>
            
            {hasMatches ? (
              <ScrollArea className="h-[300px] md:h-[400px]">
                <div className="space-y-2 pr-4">
                  {item.candidates.slice(0, 5).map((pick) => {
                    const isSelected = selectedId === pick.id;
                    const confidencePercent = Math.round(pick.score * 100);
                    const confidenceLabel = getConfidenceLabel(pick.score);

                    return (
                      <button
                        key={pick.id}
                        onClick={() => setSelectedId(pick.id)}
                        className={`
                          relative flex items-start gap-3 p-3 rounded-lg border-2 transition-all text-left w-full
                          ${isSelected
                            ? "border-primary bg-primary/10 shadow-md"
                            : "border-border hover:border-primary/50 hover:bg-accent/50"
                          }
                        `}
                      >
                        {/* Cover Image */}
                        <div className="flex-shrink-0 w-12 h-18 bg-muted rounded overflow-hidden border border-border">
                          <img
                            src={pick.thumbUrl || pick.coverUrl}
                            alt={`${pick.title} #${pick.issue || ""}`}
                            className="w-full h-full object-cover"
                          />
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0 space-y-1">
                          <h4 className="font-semibold text-sm leading-tight">
                            {pick.volumeName || pick.title}
                            {pick.issue && (
                              <span className="ml-1 text-primary">
                                #{pick.issue}
                              </span>
                            )}
                          </h4>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            {pick.publisher && (
                              <span className="font-medium">
                                {pick.publisher}
                              </span>
                            )}
                            {pick.year && (
                              <>
                                <span>•</span>
                                <span>{pick.year}</span>
                              </>
                            )}
                          </div>
                          <Badge
                            variant={
                              confidencePercent >= 80
                                ? "default"
                                : confidencePercent >= 50
                                ? "secondary"
                                : "outline"
                            }
                            className="text-xs"
                          >
                            {confidenceLabel} ({confidencePercent}%)
                          </Badge>
                        </div>

                        {/* Selection Indicator */}
                        {isSelected && (
                          <div className="flex-shrink-0">
                            <div className="rounded-full bg-primary p-1">
                              <Check className="w-4 h-4 text-primary-foreground" />
                            </div>
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </ScrollArea>
            ) : (
              <div className="flex flex-col items-center justify-center h-[300px] text-center space-y-4">
                <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
                  <AlertCircle className="w-6 h-6 text-muted-foreground" />
                </div>
                <div>
                  <p className="font-medium">No confident matches</p>
                  <p className="text-sm text-muted-foreground">
                    Try searching ComicVine manually
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-2 pt-4 border-t">
          {hasMatches && (
            <Button
              onClick={handleConfirm}
              disabled={selectedId === null}
              className="flex-1"
              size="lg"
            >
              <Check className="w-4 h-4 mr-2" />
              Confirm Selection
            </Button>
          )}
          <Button
            onClick={onManualSearch}
            variant={hasMatches ? "outline" : "default"}
            className="flex-1"
          >
            <Search className="w-4 h-4 mr-2" />
            Search Manually
          </Button>
          <Button onClick={onSkip} variant="ghost" className="flex-1">
            Skip This Comic
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
