/**
 * SCANNER SCANNING SCREEN
 * ==========================================================================
 * Processing state with rotating messages. No time estimates.
 * ==========================================================================
 */

import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import { SCANNER_COPY, SCANNING_MESSAGES } from "@/types/scannerState";

export function ScannerScanningScreen() {
  const [messageIndex, setMessageIndex] = useState(0);
  const copy = SCANNER_COPY.scanning;

  // Rotate through scanning messages
  useEffect(() => {
    const interval = setInterval(() => {
      setMessageIndex((prev) => (prev + 1) % SCANNING_MESSAGES.length);
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  return (
    <Card>
      <CardContent className="py-12">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
          <p className="text-lg font-medium">{copy.header}</p>
          <p className="text-sm text-muted-foreground animate-fade-in">
            {SCANNING_MESSAGES[messageIndex]}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
