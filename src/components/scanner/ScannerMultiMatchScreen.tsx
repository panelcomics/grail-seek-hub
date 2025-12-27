/**
 * SCANNER MULTI-MATCH SCREEN
 * ==========================================================================
 * Select the Best Match - multiple possible matches
 * ==========================================================================
 */

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Check } from "lucide-react";
import { SCANNER_COPY } from "@/types/scannerState";
import { ComicVinePick } from "@/types/comicvine";
import { cn } from "@/lib/utils";

interface ScannerMultiMatchScreenProps {
  matches: ComicVinePick[];
  onSelectMatch: (match: ComicVinePick) => void;
  onEnterManually: () => void;
}

export function ScannerMultiMatchScreen({
  matches,
  onSelectMatch,
  onEnterManually,
}: ScannerMultiMatchScreenProps) {
  const [selectedId, setSelectedId] = useState<number | string | null>(null);
  const copy = SCANNER_COPY.multi_match;

  const handleSelect = () => {
    const selected = matches.find((m) => m.id === selectedId);
    if (selected) {
      onSelectMatch(selected);
    }
  };

  return (
    <Card>
      <CardHeader className="text-center pb-3">
        <CardTitle className="text-xl">{copy.header}</CardTitle>
        <CardDescription>{copy.subtext}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Match options */}
        <div className="space-y-2 max-h-[400px] overflow-y-auto">
          {matches.slice(0, 5).map((match) => (
            <button
              key={match.id}
              onClick={() => setSelectedId(match.id)}
              className={cn(
                "w-full flex gap-3 p-3 rounded-lg border transition-all text-left",
                selectedId === match.id
                  ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                  : "border-border hover:border-primary/50 hover:bg-muted/50"
              )}
            >
              {/* Cover thumbnail */}
              <div className="w-14 h-20 flex-shrink-0 rounded overflow-hidden bg-muted">
                {(match.coverUrl || match.thumbUrl) ? (
                  <img
                    src={match.coverUrl || match.thumbUrl}
                    alt={match.title}
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
                <h4 className="font-medium text-sm line-clamp-2">
                  {match.volumeName || match.title}
                </h4>
                <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                  {match.issue && <span>#{match.issue}</span>}
                  {match.year && <span>• {match.year}</span>}
                </div>
                {match.publisher && (
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {match.publisher}
                  </p>
                )}
              </div>

              {/* Selection indicator */}
              <div className="flex-shrink-0 self-center">
                <div
                  className={cn(
                    "w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors",
                    selectedId === match.id
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-muted-foreground/30"
                  )}
                >
                  {selectedId === match.id && <Check className="w-3 h-3" />}
                </div>
              </div>
            </button>
          ))}
        </div>

        {/* Action buttons */}
        <div className="space-y-2 pt-2">
          <Button
            onClick={handleSelect}
            disabled={!selectedId}
            className="w-full"
            size="lg"
          >
            {copy.primaryButton}
          </Button>
          <button
            onClick={onEnterManually}
            className="w-full text-sm text-muted-foreground hover:text-foreground transition-colors py-2"
          >
            {copy.tertiaryButton}
          </button>
        </div>
      </CardContent>
    </Card>
  );
}
