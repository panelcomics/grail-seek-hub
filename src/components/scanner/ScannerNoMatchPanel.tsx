/**
 * SCANNER NO-MATCH PANEL
 * ==========================================================================
 * Displayed when Scanner Assist fails to find a confident match.
 * Provides helpful tips and fallback options: Search Instead, Show Possible Matches.
 * ==========================================================================
 */

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertCircle, Search, Camera, Sun, Lightbulb, Eye, RotateCcw, Square } from "lucide-react";
import { ComicVinePick } from "@/types/comicvine";

interface ScannerNoMatchPanelProps {
  lowConfidenceCandidates: ComicVinePick[];
  ocrExtractedText: string | null;
  onSearchInstead: () => void;
  onShowPossibleMatches: () => void;
  onStartOver: () => void;
  hasAnyCandidates: boolean;
}

export function ScannerNoMatchPanel({
  lowConfidenceCandidates,
  ocrExtractedText,
  onSearchInstead,
  onShowPossibleMatches,
  onStartOver,
  hasAnyCandidates,
}: ScannerNoMatchPanelProps) {
  return (
    <Card className="w-full">
      <CardHeader className="text-center pb-3">
        <div className="mx-auto w-12 h-12 rounded-full bg-amber-500/10 flex items-center justify-center mb-3">
          <AlertCircle className="w-6 h-6 text-amber-500" />
        </div>
        <CardTitle className="text-lg">We Couldn't Confidently Match This Cover</CardTitle>
        <CardDescription className="text-sm">
          Don't worry — you can still search or view possible matches below.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Helpful tips */}
        <div className="bg-muted/50 rounded-lg p-3 space-y-2">
          <h4 className="text-sm font-medium flex items-center gap-2">
            <Lightbulb className="w-4 h-4 text-amber-500" />
            Try Again Tips
          </h4>
          <ul className="text-xs text-muted-foreground space-y-1.5 ml-6">
            <li className="flex items-start gap-2">
              <Square className="w-3 h-3 mt-0.5 shrink-0" />
              <span>Fill the frame with the cover</span>
            </li>
            <li className="flex items-start gap-2">
              <Sun className="w-3 h-3 mt-0.5 shrink-0" />
              <span>Reduce glare (remove from bag if possible)</span>
            </li>
            <li className="flex items-start gap-2">
              <Camera className="w-3 h-3 mt-0.5 shrink-0" />
              <span>Keep the camera straight-on</span>
            </li>
          </ul>
        </div>

        {/* OCR extracted text hint */}
        {ocrExtractedText && (
          <div className="bg-primary/5 rounded-lg p-3 border border-primary/10">
            <p className="text-xs text-muted-foreground">
              <span className="font-medium">Detected text:</span>{" "}
              <span className="italic">"{ocrExtractedText.slice(0, 80)}..."</span>
            </p>
          </div>
        )}

        {/* Action buttons */}
        <div className="space-y-2">
          <Button onClick={onSearchInstead} className="w-full" variant="default">
            <Search className="w-4 h-4 mr-2" />
            Search Instead
          </Button>
          
          {hasAnyCandidates && (
            <Button onClick={onShowPossibleMatches} variant="outline" className="w-full">
              <Eye className="w-4 h-4 mr-2" />
              Show Possible Matches ({lowConfidenceCandidates.length})
            </Button>
          )}
          
          <Button onClick={onStartOver} variant="ghost" className="w-full text-muted-foreground">
            <RotateCcw className="w-4 h-4 mr-2" />
            Start Over
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
