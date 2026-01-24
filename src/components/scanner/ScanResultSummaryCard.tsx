/**
 * SCAN RESULT SUMMARY CARD
 * ==========================================================================
 * Additive Summary Card layer — do not refactor scanner pipeline
 * 
 * This is the unified "hero" card that appears at the top after EVERY scan.
 * It provides consistent forward-progress messaging and actions.
 * ==========================================================================
 */

import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Pencil, RotateCcw, Search, ListChecks, RefreshCw } from "lucide-react";
import { ComicVinePick } from "@/types/comicvine";
import { ScannerState } from "@/types/scannerState";
import { ValueHintModule } from "./ValueHintModule";
import { VariantBadge, VariantInfo } from "./VariantBadge";
import { ScanFeedbackSelector } from "./ScanFeedbackSelector";
import { cn } from "@/lib/utils";

interface ScanResultSummaryCardProps {
  match: ComicVinePick | null;
  previewImage?: string | null;
  confidence: number | null;
  scannerState: ScannerState;
  onConfirm: () => void;
  onEdit: () => void;
  onScanAgain: () => void;
  onManualSearch?: () => void;
  isManualEntry?: boolean;
  variantInfo?: VariantInfo | null;
}

type StatusType = 'ready' | 'review' | 'manual' | 'choose' | 'retry';

const getStatusConfig = (
  scannerState: ScannerState,
  confidence: number | null,
  isManualEntry: boolean
): { 
  type: StatusType; 
  label: string; 
  className: string;
} => {
  // Error states
  if (scannerState.startsWith('error_')) {
    return {
      type: 'retry',
      label: 'Try Again',
      className: 'bg-muted text-muted-foreground border-muted'
    };
  }
  
  // Manual entry
  if (isManualEntry) {
    return {
      type: 'manual',
      label: 'Manual Details Added',
      className: 'bg-blue-500/10 text-blue-600 border-blue-500/20'
    };
  }
  
  // Multi-match
  if (scannerState === 'multi_match') {
    return {
      type: 'choose',
      label: 'Choose Best Match',
      className: 'bg-blue-500/10 text-blue-600 border-blue-500/20'
    };
  }
  
  // Low confidence / no good match
  if (scannerState === 'match_low' || (confidence !== null && confidence < 0.45)) {
    return {
      type: 'manual',
      label: 'Manual Details Added',
      className: 'bg-blue-500/10 text-blue-600 border-blue-500/20'
    };
  }
  
  // High confidence
  if (confidence !== null && confidence >= 0.80) {
    return {
      type: 'ready',
      label: 'Ready to List',
      className: 'bg-success/10 text-success border-success/20'
    };
  }
  
  // Medium confidence or needs review
  return {
    type: 'review',
    label: 'Needs Quick Review',
    className: 'bg-warning/10 text-warning border-warning/20'
  };
};

const getButtonConfig = (scannerState: ScannerState) => {
  switch (scannerState) {
    case 'confirm':
      return { primary: 'Save & Continue', primaryIcon: CheckCircle2 };
    case 'success':
      return { primary: 'Set Price & Condition', primaryIcon: ListChecks };
    case 'error_camera':
    case 'error_image':
    case 'error_network':
      return { primary: 'Retry Scan', primaryIcon: RefreshCw };
    case 'multi_match':
      return { primary: 'Confirm & Continue', primaryIcon: CheckCircle2 };
    default:
      return { primary: 'Confirm & Continue', primaryIcon: CheckCircle2 };
  }
};

export function ScanResultSummaryCard({
  match,
  previewImage,
  confidence,
  scannerState,
  onConfirm,
  onEdit,
  onScanAgain,
  onManualSearch,
  isManualEntry = false,
  variantInfo = null
}: ScanResultSummaryCardProps) {
  const [showContent, setShowContent] = useState(false);
  const [showValueHint, setShowValueHint] = useState(false);

  const status = getStatusConfig(scannerState, confidence, isManualEntry);
  const buttonConfig = getButtonConfig(scannerState);
  const PrimaryIcon = buttonConfig.primaryIcon;

  // Staggered animation for "magic" feel
  useEffect(() => {
    const contentTimer = setTimeout(() => setShowContent(true), 100);
    const valueTimer = setTimeout(() => setShowValueHint(true), 1100);
    
    return () => {
      clearTimeout(contentTimer);
      clearTimeout(valueTimer);
    };
  }, []);

  // Derive display values with graceful degradation
  const displayTitle = match?.volumeName || match?.title || '';
  const displayIssue = match?.issue ? `#${match.issue}` : '';
  const displayYear = match?.year || '';
  const displayPublisher = match?.publisher || '';
  
  // Build secondary line, omitting missing values cleanly
  const secondaryParts = [displayPublisher, displayYear, 'Comic Book'].filter(Boolean);
  const secondaryLine = secondaryParts.join(' · ');

  // Determine best cover image
  const coverImage = match?.coverUrl || match?.thumbUrl || previewImage || null;

  // Show different secondary button for multi_match
  const isMultiMatch = scannerState === 'multi_match';

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
                {coverImage ? (
                  <img
                    src={coverImage}
                    alt="Scanned cover"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                    <div className="text-center text-xs p-2">
                      <div className="w-12 h-16 mx-auto mb-2 border-2 border-dashed border-muted-foreground/30 rounded" />
                      Cover
                    </div>
                  </div>
                )}
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
                {displayTitle ? (
                  <>
                    {displayTitle} {displayIssue}
                  </>
                ) : (
                  <span className="text-muted-foreground italic">Add details to continue</span>
                )}
              </h3>
              
              {/* Publisher · Year · Format */}
              {secondaryLine && (
                <p className="text-sm text-muted-foreground">
                  {secondaryLine}
                </p>
              )}

              {/* Variant Badge - show prominently if variant detected */}
              {variantInfo && variantInfo.isVariant && (
                <div className="pt-1">
                  <VariantBadge variant={variantInfo} size="md" />
                </div>
              )}

              {/* Status Chip */}
              <Badge 
                variant="outline" 
                className={cn("text-xs font-medium px-3 py-1", status.className)}
              >
                {status.type === 'ready' && <span className="mr-1.5">🟢</span>}
                {status.type === 'review' && <span className="mr-1.5">🟡</span>}
                {status.type === 'manual' && <span className="mr-1.5">🔵</span>}
                {status.type === 'choose' && <span className="mr-1.5">🔵</span>}
                {status.type === 'retry' && <span className="mr-1.5">⚪</span>}
                {status.label}
              </Badge>
            </div>
          </div>

          {/* Value Hint - Fades in after delay (only show if we have a match with data) */}
          {showValueHint && match && match.id && (
            <div 
              className={cn(
                "mb-6 transition-all duration-500 ease-out",
                showValueHint ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2"
              )}
            >
              <ValueHintModule match={match} />
            </div>
          )}

          {/* Feedback Selector - Help improve accuracy */}
          {match && scannerState !== 'confirm' && scannerState !== 'success' && (
            <div className="mb-6 p-3 bg-muted/30 rounded-lg border border-border/50">
              <ScanFeedbackSelector 
                match={match} 
                confidence={confidence}
              />
            </div>
          )}

          {/* CTA Buttons - Always same order */}
          <div className="space-y-2">
            <Button 
              onClick={onConfirm} 
              size="lg" 
              className="w-full font-semibold"
            >
              <PrimaryIcon className="w-4 h-4 mr-2" />
              {buttonConfig.primary}
            </Button>
            
            <div className="flex gap-2">
              {isMultiMatch && onManualSearch ? (
                <Button 
                  onClick={onManualSearch} 
                  variant="outline" 
                  className="flex-1"
                >
                  <Search className="w-4 h-4 mr-2" />
                  Search Manually
                </Button>
              ) : (
                <Button 
                  onClick={onEdit} 
                  variant="outline" 
                  className="flex-1"
                >
                  <Pencil className="w-4 h-4 mr-2" />
                  Edit Details
                </Button>
              )}
              
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
