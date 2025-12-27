/**
 * SCANNER RESULT SUMMARY CARD
 * ==========================================================================
 * Unified result card that appears after every scan.
 * Confidence-first approach - every scan feels successful.
 * ==========================================================================
 */

import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Pencil, RotateCcw } from "lucide-react";
import { ComicVinePick } from "@/types/comicvine";
import { ValueHintModule } from "./ValueHintModule";
import { cn } from "@/lib/utils";

interface ScannerResultCardProps {
  match: ComicVinePick | null;
  previewImage?: string | null;
  confidence: number | null;
  onConfirm: () => void;
  onEdit: () => void;
  onScanAgain: () => void;
  isManualEntry?: boolean;
}

type StatusType = 'ready' | 'review' | 'manual';

const getStatusConfig = (confidence: number | null, isManualEntry: boolean): { 
  type: StatusType; 
  label: string; 
  className: string;
} => {
  if (isManualEntry) {
    return {
      type: 'manual',
      label: 'Manual Details Added',
      className: 'bg-blue-500/10 text-blue-600 border-blue-500/20'
    };
  }
  
  if (confidence !== null && confidence >= 0.80) {
    return {
      type: 'ready',
      label: 'Ready to List',
      className: 'bg-success/10 text-success border-success/20'
    };
  }
  
  return {
    type: 'review',
    label: 'Needs Quick Review',
    className: 'bg-warning/10 text-warning border-warning/20'
  };
};

export function ScannerResultCard({
  match,
  previewImage,
  confidence,
  onConfirm,
  onEdit,
  onScanAgain,
  isManualEntry = false
}: ScannerResultCardProps) {
  const [showContent, setShowContent] = useState(false);
  const [showValueHint, setShowValueHint] = useState(false);

  const status = getStatusConfig(confidence, isManualEntry);

  // Staggered animation for "magic" feel
  useEffect(() => {
    // Content fades in after brief delay
    const contentTimer = setTimeout(() => setShowContent(true), 100);
    // Value hint fades in 1 second after content
    const valueTimer = setTimeout(() => setShowValueHint(true), 1100);
    
    return () => {
      clearTimeout(contentTimer);
      clearTimeout(valueTimer);
    };
  }, []);

  const displayTitle = match?.volumeName || match?.title || 'Unknown Title';
  const displayIssue = match?.issue ? `#${match.issue}` : '';
  const displayYear = match?.year || '';
  const displayPublisher = match?.publisher || '';

  return (
    <Card className="overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-success/10 to-success/5 px-6 py-4 border-b border-success/20">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-success/20 flex items-center justify-center">
            <CheckCircle2 className="w-5 h-5 text-success" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-foreground">Scan Complete</h2>
            <p className="text-sm text-muted-foreground">
              We found the closest match — quick review before listing.
            </p>
          </div>
        </div>
      </div>

      <CardContent className="p-6">
        <div 
          className={cn(
            "transition-all duration-500 ease-out",
            showContent ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2"
          )}
        >
          {/* Main content: Cover + Info */}
          <div className="flex gap-6 mb-6">
            {/* Cover Image - Visually dominant */}
            <div className="flex-shrink-0">
              <div className="w-28 h-40 md:w-36 md:h-52 rounded-lg overflow-hidden bg-muted border-2 border-border shadow-lg">
                <img
                  src={previewImage || match?.coverUrl || match?.thumbUrl || '/placeholder.svg'}
                  alt="Scanned cover"
                  className="w-full h-full object-cover"
                />
              </div>
            </div>

            {/* Info */}
            <div className="flex-1 space-y-3">
              {/* Closest Match Label */}
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Closest Match
              </p>
              
              {/* Title */}
              <h3 className="text-xl md:text-2xl font-bold text-foreground leading-tight">
                {displayTitle} {displayIssue}
              </h3>
              
              {/* Publisher · Year · Format */}
              <p className="text-sm text-muted-foreground">
                {[displayPublisher, displayYear, 'Comic Book'].filter(Boolean).join(' · ')}
              </p>

              {/* Status Chip */}
              <Badge 
                variant="outline" 
                className={cn("text-xs font-medium px-3 py-1", status.className)}
              >
                {status.type === 'ready' && <span className="mr-1.5">🟢</span>}
                {status.type === 'review' && <span className="mr-1.5">🟡</span>}
                {status.type === 'manual' && <span className="mr-1.5">🔵</span>}
                {status.label}
              </Badge>
            </div>
          </div>

          {/* Value Hint - Fades in after delay */}
          {showValueHint && match && (
            <div 
              className={cn(
                "mb-6 transition-all duration-500 ease-out",
                showValueHint ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2"
              )}
            >
              <ValueHintModule match={match} />
            </div>
          )}

          {/* CTA Buttons - Always same order */}
          <div className="space-y-2">
            <Button 
              onClick={onConfirm} 
              size="lg" 
              className="w-full font-semibold"
            >
              <CheckCircle2 className="w-4 h-4 mr-2" />
              Confirm & Continue
            </Button>
            
            <div className="flex gap-2">
              <Button 
                onClick={onEdit} 
                variant="outline" 
                className="flex-1"
              >
                <Pencil className="w-4 h-4 mr-2" />
                Edit Details
              </Button>
              
              <Button 
                onClick={onScanAgain} 
                variant="ghost" 
                className="flex-1 text-muted-foreground"
              >
                <RotateCcw className="w-4 h-4 mr-2" />
                Scan Again
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
