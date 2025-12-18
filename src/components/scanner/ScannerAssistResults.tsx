/**
 * SCANNER ASSIST RESULTS
 * ==========================================================================
 * Displays 3-5 ComicVine candidate matches for user selection.
 * User MUST explicitly select a comic - no auto-selection.
 * ==========================================================================
 */

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, Sparkles, AlertCircle, Search } from "lucide-react";
import { ComicVinePick } from "@/types/comicvine";
import { getConfidenceLabel } from "@/lib/comicVineMatchingStrategy";
import { toast } from "sonner";

interface ScannerAssistResultsProps {
  candidates: ComicVinePick[];
  onSelect: (pick: ComicVinePick) => void;
  onSkip: () => void;
  onManualSearch: () => void;
}

export function ScannerAssistResults({
  candidates,
  onSelect,
  onSkip,
  onManualSearch,
}: ScannerAssistResultsProps) {
  const [selectedId, setSelectedId] = useState<number | null>(null);

  // Limit to 5 candidates max
  const displayCandidates = candidates.slice(0, 5);

  const handleConfirm = () => {
    const selected = displayCandidates.find((c) => c.id === selectedId);
    if (selected) {
      onSelect(selected);
      toast.success("Comic identified — review & edit");
    }
  };

  if (displayCandidates.length === 0) {
    return (
      <Card className="w-full">
        <CardHeader className="text-center">
          <div className="mx-auto w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-3">
            <AlertCircle className="w-6 h-6 text-muted-foreground" />
          </div>
          <CardTitle className="text-lg">No Confident Matches Found</CardTitle>
          <CardDescription>
            We couldn't confidently identify this comic — please search manually.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Button onClick={onManualSearch} className="w-full" variant="default">
            <Search className="w-4 h-4 mr-2" />
            Search ComicVine Manually
          </Button>
          <Button onClick={onSkip} variant="outline" className="w-full">
            Skip & Enter Details Manually
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-primary" />
          Scanner Assist Found Matches
        </CardTitle>
        <CardDescription>
          Select the correct comic to auto-fill your listing details.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3">
          {displayCandidates.map((pick) => {
            const isSelected = selectedId === pick.id;
            const confidencePercent = Math.round(pick.score * 100);
            const confidenceLabel = getConfidenceLabel(pick.score);

            return (
              <button
                key={pick.id}
                onClick={() => setSelectedId(pick.id)}
                className={`
                  relative flex items-start gap-3 p-3 rounded-lg border-2 transition-all text-left
                  ${isSelected
                    ? "border-primary bg-primary/10 shadow-md"
                    : "border-border hover:border-primary/50 hover:bg-accent/50"
                  }
                `}
              >
                {/* Cover Image */}
                <div className="flex-shrink-0 w-16 h-24 bg-muted rounded overflow-hidden border border-border shadow-sm">
                  <img
                    src={pick.thumbUrl || pick.coverUrl}
                    alt={`${pick.title} #${pick.issue || ""}`}
                    className="w-full h-full object-cover"
                  />
                </div>

                {/* Comic Info */}
                <div className="flex-1 min-w-0 space-y-1.5">
                  <h4 className="font-semibold text-sm leading-tight">
                    {pick.volumeName || pick.title}
                    {pick.issue && (
                      <span className="ml-1 text-primary">#{pick.issue}</span>
                    )}
                  </h4>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    {pick.publisher && (
                      <span className="font-medium">{pick.publisher}</span>
                    )}
                    {pick.year && (
                      <>
                        <span>•</span>
                        <span>{pick.year}</span>
                      </>
                    )}
                  </div>
                  <div className="flex items-center gap-2 flex-wrap pt-1">
                    <Badge
                      variant={confidencePercent >= 80 ? "default" : confidencePercent >= 50 ? "secondary" : "outline"}
                      className="text-xs"
                    >
                      {confidenceLabel} ({confidencePercent}%)
                    </Badge>
                  </div>
                </div>

                {/* Selection Indicator */}
                {isSelected && (
                  <div className="flex-shrink-0 flex items-center">
                    <div className="rounded-full bg-primary p-1">
                      <Check className="w-4 h-4 text-primary-foreground" />
                    </div>
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {/* Action Buttons */}
        <div className="space-y-2 pt-2">
          <Button
            onClick={handleConfirm}
            disabled={selectedId === null}
            className="w-full"
            size="lg"
          >
            <Check className="w-4 h-4 mr-2" />
            Select This Comic
          </Button>
          <div className="flex gap-2">
            <Button onClick={onManualSearch} variant="outline" className="flex-1">
              <Search className="w-4 h-4 mr-2" />
              Search Manually
            </Button>
            <Button onClick={onSkip} variant="ghost" className="flex-1">
              Skip
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
