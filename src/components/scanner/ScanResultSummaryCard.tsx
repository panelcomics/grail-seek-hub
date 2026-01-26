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
import { CheckCircle2, Pencil, RotateCcw, Search, ListChecks, RefreshCw, Flag, Sparkles, Copy } from "lucide-react";
import { ComicVinePick } from "@/types/comicvine";
import { ScannerState } from "@/types/scannerState";
import { ValueHintModule } from "./ValueHintModule";
import { VariantBadge, VariantInfo } from "./VariantBadge";
import { ScanFeedbackSelector } from "./ScanFeedbackSelector";
import { ConfidenceTierBadge } from "./ConfidenceTierBadge";
import { cn } from "@/lib/utils";
import { useAdminCheck } from "@/hooks/useAdminCheck";
import { toast } from "sonner";

export interface TopMatchSummary {
  id: number;
  comicvine_issue_id?: number;
  comicvine_volume_id?: number;
  title: string;
  issue: string;
  year?: number | null;
  publisher?: string | null;
  coverUrl?: string | null;
  confidence: number;
}

interface ScanResultSummaryCardProps {
  match: ComicVinePick | null;
  previewImage?: string | null;
  confidence: number | null;
  scannerState: ScannerState;
  onConfirm: () => void;
  onEdit: () => void;
  onScanAgain: () => void;
  onManualSearch?: () => void;
  onReportWrongMatch?: () => void;
  isManualEntry?: boolean;
  variantInfo?: VariantInfo | null;
  /** If source="correction_override", show special banner */
  source?: string;
  /** Strategy used for matching (for debug) */
  strategy?: string;
  /** Normalized input text (for debug) */
  normalizedInput?: string;
  /** Top matches summary for quick selection */
  topMatches?: TopMatchSummary[];
  /** Callback when user selects a different match from candidates */
  onSelectMatch?: (match: TopMatchSummary) => void;
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
  onReportWrongMatch,
  isManualEntry = false,
  variantInfo = null,
  source,
  strategy,
  normalizedInput,
  topMatches = [],
  onSelectMatch
}: ScanResultSummaryCardProps) {
  const { isAdmin } = useAdminCheck();
  const [showContent, setShowContent] = useState(false);
  const [showValueHint, setShowValueHint] = useState(false);

  const status = getStatusConfig(scannerState, confidence, isManualEntry);
  const buttonConfig = getButtonConfig(scannerState);
  const PrimaryIcon = buttonConfig.primaryIcon;
  
  // Check if this is a correction override
  const isCorrectionOverride = source === 'correction_override';

  // Copy debug JSON to clipboard (admin only)
  const handleCopyDebug = () => {
    const debugPayload = {
      normalized_input: normalizedInput || null,
      confidence,
      strategy: strategy || null,
      source: source || "normal",
      topMatches: topMatches || [],
      selectedMatch: match ? {
        id: match.id,
        title: match.volumeName || match.title,
        issue: match.issue,
        year: match.year,
        publisher: match.publisher
      } : null
    };
    navigator.clipboard.writeText(JSON.stringify(debugPayload, null, 2));
    toast.success("Debug JSON copied to clipboard");
  };

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
          <div className="flex-1">
            <h2 className="text-xl font-bold text-foreground">Scan Complete</h2>
            <p className="text-sm text-muted-foreground">
              We found the closest match — quick review before listing.
            </p>
          </div>
          {/* Admin-only Copy Debug button */}
          {isAdmin && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleCopyDebug}
              className="text-muted-foreground hover:text-foreground"
              title="Copy debug JSON"
            >
              <Copy className="h-4 w-4 mr-1" />
              Debug
            </Button>
          )}
        </div>
      </div>

      <CardContent className="p-6">
        {/* Correction Override Banner */}
        {isCorrectionOverride && (
          <div className="mb-4 p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm">
              <Sparkles className="w-4 h-4 text-blue-500" />
              <span className="text-blue-600 dark:text-blue-400 font-medium">
                Using your saved correction
              </span>
            </div>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={onReportWrongMatch}
              className="text-blue-600 dark:text-blue-400 hover:text-blue-700 hover:bg-blue-500/10"
            >
              <Pencil className="w-3 h-3 mr-1" />
              Edit
            </Button>
          </div>
        )}
        
        <div 
          className={cn(
            "transition-all duration-500 ease-out",
            showContent ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2"
          )}
        >
          {/* Main content: Your Photo + Match Cover + Info */}
          <div className="flex gap-4 mb-6">
            {/* YOUR SCANNED PHOTO - Always show if available */}
            {previewImage && (
              <div className="flex-shrink-0">
                <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-1 text-center">Your Photo</p>
                <div className="w-20 h-28 md:w-24 md:h-36 rounded-lg overflow-hidden bg-muted border-2 border-primary/30 shadow-md">
                  <img
                    src={previewImage}
                    alt="Your scanned photo"
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>
            )}
            
            {/* Match Cover Image */}
            <div className="flex-shrink-0">
              <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-1 text-center">Match</p>
              <div className="w-20 h-28 md:w-24 md:h-36 rounded-lg overflow-hidden bg-muted border-2 border-border shadow-lg">
                {coverImage ? (
                  <img
                    src={coverImage}
                    alt="Matched cover"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                    <div className="text-center text-xs p-2">
                      <div className="w-10 h-14 mx-auto mb-1 border-2 border-dashed border-muted-foreground/30 rounded" />
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

              {/* Confidence Tier Badge + Status */}
              <div className="flex items-center gap-2 flex-wrap">
                <ConfidenceTierBadge confidence={confidence} size="sm" />
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

          {/* INLINE CANDIDATES - Show other matches for quick one-tap fix */}
          {topMatches && topMatches.length > 1 && scannerState !== 'confirm' && scannerState !== 'success' && onSelectMatch && (
            <div className="mb-6">
              <p className="text-sm font-medium text-muted-foreground mb-3 flex items-center justify-between">
                <span>Other possible matches</span>
                <span className="text-xs text-primary">(tap to select)</span>
              </p>
              <div className="grid grid-cols-3 gap-2">
                {topMatches.slice(0, 6).map((candidate, idx) => {
                  const isCurrentMatch = match?.id === candidate.id || 
                    (candidate.comicvine_issue_id && match?.id === candidate.comicvine_issue_id);
                  
                  return (
                    <button
                      key={candidate.id || idx}
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        console.log('[SCANNER_CORRECTION] inline_candidate_selected:', {
                          id: candidate.id,
                          title: candidate.title,
                          issue: candidate.issue
                        });
                        onSelectMatch(candidate);
                      }}
                      type="button"
                      disabled={isCurrentMatch}
                      className={cn(
                        "relative flex flex-col rounded-lg border-2 overflow-hidden transition-all touch-manipulation",
                        "min-h-[100px] text-left",
                        isCurrentMatch 
                          ? "border-primary bg-primary/5 ring-1 ring-primary/30" 
                          : "border-border hover:border-primary/50 active:scale-[0.98]"
                      )}
                      style={{ WebkitTapHighlightColor: 'transparent' }}
                    >
                      {/* Cover thumbnail */}
                      <div className="aspect-[2/3] bg-muted">
                        {candidate.coverUrl ? (
                          <img
                            src={candidate.coverUrl}
                            alt={`${candidate.title} #${candidate.issue}`}
                            className="w-full h-full object-cover pointer-events-none"
                            loading="lazy"
                            draggable={false}
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-[10px] text-muted-foreground pointer-events-none">
                            No Cover
                          </div>
                        )}
                      </div>
                      
                      {/* Info */}
                      <div className="p-1.5 bg-background pointer-events-none">
                        <div className="text-xs font-medium truncate leading-tight">
                          {candidate.title}
                        </div>
                        <div className="text-[10px] text-muted-foreground flex items-center justify-between">
                          <span>#{candidate.issue}</span>
                          {candidate.year && <span>{candidate.year}</span>}
                        </div>
                        {candidate.publisher && (
                          <div className="text-[10px] text-muted-foreground/70 truncate">
                            {candidate.publisher}
                          </div>
                        )}
                      </div>
                      
                      {/* Current selection indicator */}
                      {isCurrentMatch && (
                        <div className="absolute top-1 right-1 w-5 h-5 bg-primary rounded-full flex items-center justify-center">
                          <CheckCircle2 className="h-3 w-3 text-primary-foreground" />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
              
              {topMatches.length > 6 && (
                <p className="text-xs text-muted-foreground text-center mt-2">
                  +{topMatches.length - 6} more options in "Wrong comic? Fix it"
                </p>
              )}
            </div>
          )}

          {/* CTA Buttons - Two large buttons for mobile */}
          <div className="space-y-3">
            {/* Primary: Confirm & Continue */}
            <Button 
              onClick={onConfirm} 
              size="lg" 
              className="w-full h-14 text-base font-semibold"
            >
              <PrimaryIcon className="w-5 h-5 mr-2" />
              {scannerState === 'success' ? 'Set Price & Condition' : 'Confirm & Continue'}
            </Button>
            
          {/* Secondary: Wrong comic? Fix it - ALWAYS VISIBLE and ALWAYS WORKS */}
            {scannerState !== 'confirm' && scannerState !== 'success' && (
              <Button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  console.log('[SCANNER_CORRECTION] correction_sheet_opened: true');
                  if (onReportWrongMatch) {
                    onReportWrongMatch();
                  }
                }}
                type="button"
                variant="outline"
                size="lg"
                className="w-full h-14 text-base font-medium border-2 border-orange-400 text-orange-600 hover:bg-orange-50 hover:text-orange-700 hover:border-orange-500 dark:border-orange-600 dark:text-orange-400 dark:hover:bg-orange-950/50 dark:hover:border-orange-500 touch-manipulation"
              >
                <Search className="w-5 h-5 mr-2" />
                Wrong comic? Fix it
              </Button>
            )}
            
            {/* Tertiary actions - smaller */}
            <div className="flex gap-2 pt-1">
              <Button 
                onClick={onEdit} 
                variant="ghost" 
                size="sm"
                className="flex-1 text-muted-foreground"
              >
                <Pencil className="w-4 h-4 mr-1.5" />
                Edit
              </Button>
              
              <Button 
                onClick={onScanAgain} 
                variant="ghost" 
                size="sm"
                className="flex-1 text-muted-foreground"
              >
                <RotateCcw className="w-4 h-4 mr-1.5" />
                Re-scan
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
