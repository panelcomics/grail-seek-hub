/**
 * SCANNER MATCH MEDIUM CONFIDENCE SCREEN
 * ==========================================================================
 * Possible Match Found - confidence >= 0.45 && < 0.80
 * ==========================================================================
 */

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { HelpCircle, Search } from "lucide-react";
import { SCANNER_COPY } from "@/types/scannerState";
import { ComicVinePick } from "@/types/comicvine";

interface ScannerMatchMediumScreenProps {
  match: ComicVinePick;
  previewImage?: string | null;
  onReview: () => void;
  onSearchManually: () => void;
}

export function ScannerMatchMediumScreen({
  match,
  previewImage,
  onReview,
  onSearchManually,
}: ScannerMatchMediumScreenProps) {
  const copy = SCANNER_COPY.match_medium;

  return (
    <Card>
      <CardHeader className="text-center pb-3">
        <div className="mx-auto w-12 h-12 rounded-full bg-amber-500/10 flex items-center justify-center mb-3">
          <HelpCircle className="w-6 h-6 text-amber-500" />
        </div>
        <CardTitle className="text-xl">{copy.header}</CardTitle>
        <CardDescription>{copy.subtext}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Match Preview */}
        <div className="flex gap-4 p-4 bg-muted/50 rounded-lg">
          {/* Cover thumbnail */}
          <div className="w-20 h-28 flex-shrink-0 rounded-md overflow-hidden bg-muted border">
            {(match.coverUrl || match.thumbUrl) ? (
              <img
                src={match.coverUrl || match.thumbUrl}
                alt={match.title}
                className="w-full h-full object-cover"
              />
            ) : previewImage ? (
              <img
                src={previewImage}
                alt="Scanned cover"
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
            {match.publisher && (
              <p className="text-xs text-muted-foreground">{match.publisher}</p>
            )}
          </div>
        </div>

        {/* Action buttons */}
        <div className="space-y-2">
          <Button onClick={onReview} className="w-full" size="lg">
            {copy.primaryButton}
          </Button>
          <Button onClick={onSearchManually} variant="outline" className="w-full">
            <Search className="w-4 h-4 mr-2" />
            {copy.secondaryButton}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
