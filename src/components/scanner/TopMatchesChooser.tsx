/**
 * TOP MATCHES CHOOSER
 * ==========================================================================
 * Shown when confidence is below threshold - lets user pick from top matches
 * or enter details manually.
 * ==========================================================================
 */

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, AlertCircle, Search } from "lucide-react";
import { cn } from "@/lib/utils";

export interface TopMatch {
  comicvine_issue_id: number;
  comicvine_volume_id: number;
  series: string;
  issue: string;
  year: number | null;
  publisher: string | null;
  coverUrl: string | null;
  confidence: number;
  fallbackPath?: string;
}

interface TopMatchesChooserProps {
  matches: TopMatch[];
  previewImage?: string | null;
  onSelectMatch: (match: TopMatch) => void;
  onManualSearch: () => void;
  onScanAgain: () => void;
}

function getConfidenceLabel(confidence: number): { label: string; variant: "default" | "secondary" | "destructive" | "outline" } {
  if (confidence >= 70) return { label: "High Match", variant: "default" };
  if (confidence >= 45) return { label: "Possible Match", variant: "secondary" };
  return { label: "Low Match", variant: "outline" };
}

export function TopMatchesChooser({
  matches,
  previewImage,
  onSelectMatch,
  onManualSearch,
  onScanAgain,
}: TopMatchesChooserProps) {
  const [selectedId, setSelectedId] = useState<number | null>(null);

  const handleConfirm = () => {
    const selected = matches.find((m) => m.comicvine_issue_id === selectedId);
    if (selected) {
      onSelectMatch(selected);
    }
  };

  if (!matches || matches.length === 0) {
    return (
      <Card>
        <CardHeader className="text-center pb-3">
          <div className="mx-auto w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-2">
            <AlertCircle className="w-6 h-6 text-muted-foreground" />
          </div>
          <CardTitle className="text-xl">We're Still Learning This One</CardTitle>
          <CardDescription>
            We couldn't find a confident match. Try searching manually or scan another photo.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Button onClick={onManualSearch} className="w-full" size="lg">
            <Search className="w-4 h-4 mr-2" />
            Search Manually
          </Button>
          <Button onClick={onScanAgain} variant="outline" className="w-full">
            Try Another Photo
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="text-center pb-3">
        <div className="mx-auto w-12 h-12 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center mb-2">
          <AlertCircle className="w-6 h-6 text-amber-600 dark:text-amber-400" />
        </div>
        <CardTitle className="text-xl">Did We Get This Right?</CardTitle>
        <CardDescription>
          We found {matches.length} possible match{matches.length > 1 ? "es" : ""}. 
          Select the correct one or search manually.
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Preview image if available */}
        {previewImage && (
          <div className="mx-auto w-24 h-32 rounded-lg overflow-hidden border bg-muted mb-4">
            <img
              src={previewImage}
              alt="Scanned cover"
              className="w-full h-full object-cover"
            />
          </div>
        )}
        
        {/* Match options */}
        <div className="space-y-2 max-h-[350px] overflow-y-auto">
          {matches.map((match, index) => {
            const { label, variant } = getConfidenceLabel(match.confidence);
            
            return (
              <button
                key={match.comicvine_issue_id}
                onClick={() => setSelectedId(match.comicvine_issue_id)}
                className={cn(
                  "w-full flex gap-3 p-3 rounded-lg border transition-all text-left",
                  selectedId === match.comicvine_issue_id
                    ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                    : "border-border hover:border-primary/50 hover:bg-muted/50"
                )}
              >
                {/* Cover thumbnail */}
                <div className="w-14 h-20 flex-shrink-0 rounded overflow-hidden bg-muted">
                  {match.coverUrl ? (
                    <img
                      src={match.coverUrl}
                      alt={match.series}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-muted-foreground text-xs">
                      No cover
                    </div>
                  )}
                </div>

                {/* Match details */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <h4 className="font-medium text-sm line-clamp-2">
                      {match.series}
                    </h4>
                    {index === 0 && (
                      <Badge variant={variant} className="flex-shrink-0 text-xs">
                        {label}
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                    {match.issue && <span>#{match.issue}</span>}
                    {match.year && <span>• {match.year}</span>}
                  </div>
                  {match.publisher && (
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {match.publisher}
                    </p>
                  )}
                  {match.fallbackPath && (
                    <p className="text-[10px] text-muted-foreground/60 mt-1">
                      via {match.fallbackPath}
                    </p>
                  )}
                </div>

                {/* Selection indicator */}
                <div className="flex-shrink-0 self-center">
                  <div
                    className={cn(
                      "w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors",
                      selectedId === match.comicvine_issue_id
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-muted-foreground/30"
                    )}
                  >
                    {selectedId === match.comicvine_issue_id && <Check className="w-3 h-3" />}
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Action buttons */}
        <div className="space-y-2 pt-2">
          <Button
            onClick={handleConfirm}
            disabled={!selectedId}
            className="w-full"
            size="lg"
          >
            Confirm Selection
          </Button>
          <div className="flex gap-2">
            <Button onClick={onManualSearch} variant="outline" className="flex-1">
              <Search className="w-4 h-4 mr-2" />
              Search Instead
            </Button>
            <Button onClick={onScanAgain} variant="ghost" className="flex-1">
              Scan Again
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
