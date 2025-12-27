/**
 * SCANNER SUCCESS SCREEN
 * ==========================================================================
 * Book Ready to List - success state
 * ==========================================================================
 */

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2, DollarSign, ScanLine, List } from "lucide-react";
import { SCANNER_COPY } from "@/types/scannerState";
import { ComicVinePick } from "@/types/comicvine";

interface ScannerSuccessScreenProps {
  match: ComicVinePick | null;
  previewImage?: string | null;
  onSetPrice: () => void;
  onScanAnother: () => void;
  onGoToListings: () => void;
}

export function ScannerSuccessScreen({
  match,
  previewImage,
  onSetPrice,
  onScanAnother,
  onGoToListings,
}: ScannerSuccessScreenProps) {
  const copy = SCANNER_COPY.success;

  return (
    <Card>
      <CardHeader className="text-center pb-3">
        <div className="mx-auto w-12 h-12 rounded-full bg-green-500/10 flex items-center justify-center mb-3">
          <CheckCircle2 className="w-6 h-6 text-green-500" />
        </div>
        <CardTitle className="text-xl">{copy.header}</CardTitle>
        <CardDescription>{copy.subtext}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Match Preview */}
        {match && (
          <div className="flex gap-4 p-4 bg-muted/50 rounded-lg">
            {/* Cover thumbnail */}
            <div className="w-16 h-22 flex-shrink-0 rounded-md overflow-hidden bg-muted border">
              {(match.coverUrl || match.thumbUrl || previewImage) ? (
                <img
                  src={match.coverUrl || match.thumbUrl || previewImage || ""}
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
            <div className="flex-1 space-y-1">
              <h3 className="font-semibold line-clamp-2">
                {match.volumeName || match.title}
              </h3>
              {match.issue && (
                <p className="text-sm text-muted-foreground">
                  Issue #{match.issue}
                </p>
              )}
              {match.year && (
                <p className="text-sm text-muted-foreground">{match.year}</p>
              )}
            </div>
          </div>
        )}

        {/* Action buttons */}
        <div className="space-y-2">
          <Button onClick={onSetPrice} className="w-full" size="lg">
            <DollarSign className="w-4 h-4 mr-2" />
            {copy.primaryButton}
          </Button>
          <Button onClick={onScanAnother} variant="outline" className="w-full">
            <ScanLine className="w-4 h-4 mr-2" />
            {copy.secondaryButton}
          </Button>
          <button
            onClick={onGoToListings}
            className="w-full text-sm text-muted-foreground hover:text-foreground transition-colors py-2 flex items-center justify-center gap-2"
          >
            <List className="w-4 h-4" />
            {copy.tertiaryButton}
          </button>
        </div>
      </CardContent>
    </Card>
  );
}
