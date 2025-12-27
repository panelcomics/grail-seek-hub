/**
 * SCANNER MATCH LOW CONFIDENCE SCREEN
 * ==========================================================================
 * "We're Still Learning This One" - confidence < 0.45
 * Positive, forward-looking messaging.
 * ==========================================================================
 */

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Lightbulb, Camera, PenLine } from "lucide-react";
import { SCANNER_COPY } from "@/types/scannerState";

interface ScannerMatchLowScreenProps {
  previewImage?: string | null;
  onAddDetails: () => void;
  onTryAnother: () => void;
}

export function ScannerMatchLowScreen({
  previewImage,
  onAddDetails,
  onTryAnother,
}: ScannerMatchLowScreenProps) {
  const copy = SCANNER_COPY.match_low;

  return (
    <Card>
      <CardHeader className="text-center pb-3">
        <div className="mx-auto w-12 h-12 rounded-full bg-blue-500/10 flex items-center justify-center mb-3">
          <Lightbulb className="w-6 h-6 text-blue-500" />
        </div>
        <CardTitle className="text-xl">{copy.header}</CardTitle>
        <CardDescription>{copy.subtext}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Preview Image if available */}
        {previewImage && (
          <div className="flex justify-center">
            <div className="w-24 h-32 rounded-md overflow-hidden bg-muted border">
              <img
                src={previewImage}
                alt="Scanned cover"
                className="w-full h-full object-cover"
              />
            </div>
          </div>
        )}

        {/* Action buttons */}
        <div className="space-y-2">
          <Button onClick={onAddDetails} className="w-full" size="lg">
            <PenLine className="w-4 h-4 mr-2" />
            {copy.primaryButton}
          </Button>
          <Button onClick={onTryAnother} variant="outline" className="w-full">
            <Camera className="w-4 h-4 mr-2" />
            {copy.secondaryButton}
          </Button>
        </div>

        {/* Helper text */}
        {copy.helperText && (
          <p className="text-xs text-center text-muted-foreground">
            {copy.helperText}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
