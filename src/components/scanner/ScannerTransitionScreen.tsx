/**
 * SCANNER TRANSITION SCREEN
 * ==========================================================================
 * Brief "Identifying match..." state for perceived intelligence.
 * Shows for 0.5-1s before revealing results.
 * ==========================================================================
 */

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle2, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface ScannerTransitionScreenProps {
  onComplete: () => void;
  previewImage?: string | null;
}

export function ScannerTransitionScreen({ 
  onComplete,
  previewImage 
}: ScannerTransitionScreenProps) {
  const [phase, setPhase] = useState<'scanning' | 'complete'>('scanning');

  useEffect(() => {
    // Brief "scan complete" flash for perceived intelligence
    const completeTimer = setTimeout(() => {
      setPhase('complete');
    }, 400);

    // Then transition to results
    const transitionTimer = setTimeout(() => {
      onComplete();
    }, 900);

    return () => {
      clearTimeout(completeTimer);
      clearTimeout(transitionTimer);
    };
  }, [onComplete]);

  return (
    <Card className="overflow-hidden">
      <CardContent className="py-12">
        <div className="flex flex-col items-center gap-6">
          {/* Cover preview with lock-in animation */}
          {previewImage && (
            <div className={cn(
              "w-24 h-32 rounded-lg overflow-hidden bg-muted border-2 shadow-lg transition-all duration-300",
              phase === 'complete' 
                ? "border-success scale-105 shadow-success/20" 
                : "border-border"
            )}>
              <img
                src={previewImage}
                alt="Scanned cover"
                className="w-full h-full object-cover"
              />
            </div>
          )}

          {/* Status indicator */}
          <div className="flex flex-col items-center gap-2">
            {phase === 'scanning' ? (
              <>
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="text-lg font-semibold text-foreground">Scan Complete</p>
                <p className="text-sm text-muted-foreground animate-pulse">
                  Identifying match…
                </p>
              </>
            ) : (
              <>
                <div className={cn(
                  "w-12 h-12 rounded-full flex items-center justify-center",
                  "bg-success/20 animate-scale-in"
                )}>
                  <CheckCircle2 className="h-6 w-6 text-success" />
                </div>
                <p className="text-lg font-semibold text-foreground">Match Found</p>
                <p className="text-sm text-muted-foreground">
                  Loading details…
                </p>
              </>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
