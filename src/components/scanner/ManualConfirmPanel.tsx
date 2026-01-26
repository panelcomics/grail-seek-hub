/**
 * MANUAL CONFIRM PANEL
 * ==========================================================================
 * Displays when scanner confidence is low, allowing users to pick the correct
 * issue from top candidates. Stores corrections in scan_corrections table
 * for future lookup and training.
 * 
 * UX improvements:
 * - Large cover thumbnails for quick visual recognition
 * - One-tap selection
 * - "None of these" reveals manual search input
 * ==========================================================================
 */

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { AlertCircle, Check, Search, Edit3, X, Flag, ChevronDown, ChevronUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

interface TopCandidate {
  comicvine_issue_id: number;
  comicvine_volume_id: number;
  series: string;
  issue: string;
  year: number | null;
  publisher: string | null;
  coverUrl: string | null;
  confidence: number;
}

interface ManualConfirmPanelProps {
  candidates: TopCandidate[];
  inputText: string;
  ocrText?: string;
  originalConfidence: number;
  /** The ComicVine ID of the match being corrected (for "Wrong match?" flow) */
  returnedComicVineId?: number;
  /** Request ID from scan-item for correlating events */
  requestId?: string;
  onSelect: (candidate: TopCandidate) => void;
  onEnterManually: () => void;
  onSearchAgain: (query?: string) => void;
  onCancel?: () => void;
  /** If true, shows as "Report Wrong Match" mode */
  isReportMode?: boolean;
  /** If true, shows as "Low Confidence" mode with softer messaging */
  isLowConfidenceMode?: boolean;
}

/**
 * Normalize input text for matching against stored corrections
 */
function normalizeInputText(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export function ManualConfirmPanel({
  candidates,
  inputText,
  ocrText,
  originalConfidence,
  returnedComicVineId,
  requestId,
  onSelect,
  onEnterManually,
  onSearchAgain,
  onCancel,
  isReportMode = false,
  isLowConfidenceMode = false
}: ManualConfirmPanelProps) {
  const { user } = useAuth();
  const [saving, setSaving] = useState(false);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [showNoneOfThese, setShowNoneOfThese] = useState(false);
  // Pre-fill manual search with OCR text if available
  const [manualSearchQuery, setManualSearchQuery] = useState(ocrText || "");

  const handleSelectCandidate = async (candidate: TopCandidate) => {
    // Don't allow selecting the same match they're reporting as wrong
    if (isReportMode && candidate.comicvine_issue_id === returnedComicVineId) {
      toast.error("That's the same match - select a different one");
      return;
    }
    
    if (!user) {
      onSelect(candidate);
      return;
    }

    setSelectedId(candidate.comicvine_issue_id);
    setSaving(true);

    try {
      // Store correction for future lookups
      const correctionPayload: Record<string, unknown> = {
        user_id: user.id,
        input_text: inputText,
        normalized_input: normalizeInputText(inputText),
        selected_comicvine_id: candidate.comicvine_issue_id,
        selected_volume_id: candidate.comicvine_volume_id,
        selected_title: candidate.series,
        selected_issue: candidate.issue,
        selected_year: candidate.year,
        selected_publisher: candidate.publisher,
        selected_cover_url: candidate.coverUrl,
        ocr_text: ocrText || null,
        original_confidence: originalConfidence,
        request_id: requestId || null,
      };

      const { error } = await supabase
        .from('scan_corrections')
        .insert(correctionPayload as any);

      if (error) {
        console.error('Failed to save correction:', error);
        // Don't block the user, just log it
      } else {
        console.log('[CORRECTION] Saved user selection for:', inputText);
      }
    } catch (err) {
      console.error('Error saving correction:', err);
    } finally {
      setSaving(false);
      onSelect(candidate);
    }
  };

  const handleManualSearch = () => {
    if (manualSearchQuery.trim()) {
      // Pass the search query to parent to trigger a new search
      onSearchAgain(manualSearchQuery.trim());
    }
  };

  // Show top 5 candidates with large covers
  const topCandidates = candidates.slice(0, 5);

  // Determine card style and messaging based on mode
  const getCardStyle = () => {
    if (isReportMode) return "border-orange-500/50 bg-orange-50/5 dark:bg-orange-950/10";
    if (isLowConfidenceMode) return "border-blue-500/50 bg-blue-50/5 dark:bg-blue-950/10";
    return "border-amber-500/50 bg-amber-50/5 dark:bg-amber-950/10";
  };

  const getTitle = () => {
    if (isReportMode) return "Report Wrong Match";
    if (isLowConfidenceMode) return "Quick confirm needed";
    return "We couldn't confidently match this";
  };

  const getDescription = () => {
    if (isReportMode) return "Tap the correct match. Your feedback improves future scans.";
    if (isLowConfidenceMode) return "Tap the correct issue below to continue.";
    return "Pick the correct issue from the options below";
  };

  const getIconColor = () => {
    if (isReportMode) return "text-orange-500";
    if (isLowConfidenceMode) return "text-blue-500";
    return "text-amber-500";
  };

  return (
    <Card className={getCardStyle()}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {isReportMode ? (
              <Flag className={`h-5 w-5 ${getIconColor()}`} />
            ) : (
              <AlertCircle className={`h-5 w-5 ${getIconColor()}`} />
            )}
            <CardTitle className="text-lg">
              {getTitle()}
            </CardTitle>
          </div>
          {onCancel && (
            <Button variant="ghost" size="icon" onClick={onCancel} className="h-8 w-8">
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
        <CardDescription>
          {getDescription()}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Quick Search - Always visible at top for easy correction */}
        <div className="bg-muted/50 rounded-lg p-3 space-y-2">
          <p className="text-sm font-medium">Quick search:</p>
          <div className="flex gap-2">
            <Input
              placeholder="e.g., Jonny Quest 5 1986"
              value={manualSearchQuery}
              onChange={(e) => setManualSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleManualSearch()}
              className="flex-1 bg-background"
            />
            <Button onClick={handleManualSearch} disabled={!manualSearchQuery.trim()}>
              <Search className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Divider with "or tap a match" */}
        <div className="flex items-center gap-3">
          <div className="flex-1 border-t border-border" />
          <span className="text-xs text-muted-foreground">or tap the correct match</span>
          <div className="flex-1 border-t border-border" />
        </div>

        {/* Large Cover Grid - Visual-first selection */}
        {!showNoneOfThese && topCandidates.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
            {topCandidates.map((candidate) => (
              <button
                key={candidate.comicvine_issue_id}
                onClick={() => handleSelectCandidate(candidate)}
                disabled={saving}
                className={`
                  relative group flex flex-col rounded-lg border-2 overflow-hidden transition-all
                  hover:border-primary hover:shadow-lg active:scale-[0.98]
                  touch-manipulation
                  ${selectedId === candidate.comicvine_issue_id 
                    ? 'border-primary ring-2 ring-primary/30' 
                    : 'border-border'
                  }
                  ${saving && selectedId === candidate.comicvine_issue_id
                    ? 'opacity-70'
                    : ''
                  }
                `}
              >
                {/* Large Cover */}
                <div className="aspect-[2/3] bg-muted">
                  {candidate.coverUrl ? (
                    <img
                      src={candidate.coverUrl}
                      alt={`${candidate.series} #${candidate.issue}`}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-xs text-muted-foreground p-2">
                      <div className="text-center">
                        <div className="w-8 h-12 mx-auto mb-1 border-2 border-dashed border-muted-foreground/30 rounded" />
                        No Cover
                      </div>
                    </div>
                  )}
                </div>

                {/* Info Overlay */}
                <div className="p-2 bg-background">
                  <div className="text-sm font-medium truncate">
                    {candidate.series}
                  </div>
                  <div className="text-xs text-muted-foreground flex items-center justify-between">
                    <span>#{candidate.issue}</span>
                    {candidate.year && <span>{candidate.year}</span>}
                  </div>
                </div>

                {/* Selection checkmark */}
                {selectedId === candidate.comicvine_issue_id && (
                  <div className="absolute top-2 left-2 w-6 h-6 bg-primary rounded-full flex items-center justify-center">
                    <Check className="h-4 w-4 text-primary-foreground" />
                  </div>
                )}
              </button>
            ))}
          </div>
        )}

        {/* No candidates message */}
        {topCandidates.length === 0 && (
          <div className="text-center py-4 text-muted-foreground">
            <p className="text-sm">Use the search above to find the correct comic</p>
          </div>
        )}

        {/* Bottom actions */}
        <div className="flex gap-2 pt-2">
          <Button
            variant="outline"
            onClick={() => onSearchAgain()}
            size="sm"
            className="flex-1"
          >
            <Search className="h-3 w-3 mr-1.5" />
            Re-scan
          </Button>
          <Button
            variant="outline"
            onClick={onEnterManually}
            size="sm"
            className="flex-1"
          >
            <Edit3 className="h-3 w-3 mr-1.5" />
            Enter Manually
          </Button>
        </div>

        {/* Help text */}
        <p className="text-xs text-muted-foreground text-center">
          Your selection helps improve future scans
        </p>
      </CardContent>
    </Card>
  );
}

/**
 * Check for a previously stored correction for this input
 */
export async function checkForStoredCorrection(
  inputText: string
): Promise<TopCandidate | null> {
  const normalized = normalizeInputText(inputText);
  
  try {
    const { data, error } = await supabase
      .from('scan_corrections')
      .select('*')
      .eq('normalized_input', normalized)
      .order('created_at', { ascending: false })
      .limit(1);

    if (error || !data || data.length === 0) {
      return null;
    }

    const correction = data[0];
    console.log('[CORRECTION] Found stored correction for:', inputText);

    return {
      comicvine_issue_id: correction.selected_comicvine_id,
      comicvine_volume_id: correction.selected_volume_id || 0,
      series: correction.selected_title,
      issue: correction.selected_issue || '',
      year: correction.selected_year,
      publisher: correction.selected_publisher,
      coverUrl: correction.selected_cover_url,
      confidence: 100 // User-verified
    };
  } catch (err) {
    console.error('Error checking for stored correction:', err);
    return null;
  }
}
