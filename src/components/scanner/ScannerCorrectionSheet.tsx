/**
 * SCANNER CORRECTION SHEET
 * ==========================================================================
 * Full-screen mobile-first correction flow for wrong scans.
 * Opens as bottom sheet on mobile, modal on desktop.
 * 
 * Features:
 * - Manual entry fields at top (Title, Issue #, Publisher, Year)
 * - Large tappable candidate cards
 * - One-tap selection with visual feedback
 * - Keyboard auto-opens on mobile
 * ==========================================================================
 */

import { useState, useRef, useEffect, useCallback } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Search, Check, X, Edit3, Loader2, Flag } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useIsMobile } from "@/hooks/use-mobile";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export interface CorrectionCandidate {
  comicvine_issue_id: number;
  comicvine_volume_id: number;
  series: string;
  issue: string;
  year: number | null;
  publisher: string | null;
  coverUrl: string | null;
  confidence: number;
}

interface ScannerCorrectionSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  candidates: CorrectionCandidate[];
  ocrText?: string;
  ocrConfidence?: number;
  inputText?: string;
  requestId?: string;
  onSelect: (candidate: CorrectionCandidate) => void;
  onEnterManually: () => void;
  onSearch: (query: string, issue?: string, publisher?: string, year?: string) => Promise<CorrectionCandidate[]>;
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

export function ScannerCorrectionSheet({
  open,
  onOpenChange,
  candidates: initialCandidates,
  ocrText,
  ocrConfidence = 0,
  inputText,
  requestId,
  onSelect,
  onEnterManually,
  onSearch
}: ScannerCorrectionSheetProps) {
  const { user } = useAuth();
  const isMobile = useIsMobile();
  const titleInputRef = useRef<HTMLInputElement>(null);
  
  // Log when sheet opens for debugging
  useEffect(() => {
    if (open) {
      console.log('[SCANNER_CORRECTION] Sheet opened', {
        candidates_count: initialCandidates.length,
        ocrConfidence,
        inputText
      });
    }
  }, [open, initialCandidates.length, ocrConfidence, inputText]);
  
  // Form state - pre-fill from OCR if confidence > 50%
  const [title, setTitle] = useState("");
  const [issueNumber, setIssueNumber] = useState("");
  const [publisher, setPublisher] = useState("");
  const [year, setYear] = useState("");
  
  // Candidate state
  const [candidates, setCandidates] = useState<CorrectionCandidate[]>(initialCandidates);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [searching, setSearching] = useState(false);
  const [saving, setSaving] = useState(false);

  // Pre-fill fields from OCR when sheet opens
  useEffect(() => {
    if (open && ocrConfidence > 50 && ocrText) {
      // Try to parse OCR text for title and issue
      const issueMatch = ocrText.match(/#?\s*(\d{1,4})\b/);
      if (issueMatch) {
        setIssueNumber(issueMatch[1]);
        // Remove issue number from title
        const titleWithoutIssue = ocrText.replace(issueMatch[0], '').trim();
        setTitle(titleWithoutIssue);
      } else {
        setTitle(ocrText);
      }
    }
  }, [open, ocrText, ocrConfidence]);

  // Update candidates when initialCandidates changes
  useEffect(() => {
    setCandidates(initialCandidates);
  }, [initialCandidates]);

  // Focus title input on open (for keyboard)
  useEffect(() => {
    if (open) {
      setTimeout(() => {
        titleInputRef.current?.focus();
      }, 300); // Delay for sheet animation
    }
  }, [open]);

  const handleSearch = useCallback(async () => {
    if (!title.trim() && !issueNumber.trim()) {
      toast.error("Enter at least a title or issue number");
      return;
    }

    console.log('[SCANNER_CORRECTION] Search executed', {
      query: title.trim(),
      issue: issueNumber.trim(),
      publisher: publisher.trim(),
      year: year.trim()
    });

    setSearching(true);
    try {
      const results = await onSearch(title.trim(), issueNumber.trim(), publisher.trim(), year.trim());
      console.log('[SCANNER_CORRECTION] Search results', { count: results.length });
      setCandidates(results);
      setSelectedId(null);
    } catch (error) {
      console.error("Search error:", error);
      toast.error("Search failed. Try again.");
    } finally {
      setSearching(false);
    }
  }, [title, issueNumber, publisher, year, onSearch]);

  const handleSelectCandidate = useCallback(async (candidate: CorrectionCandidate) => {
    console.log('[SCANNER_CORRECTION] Card tapped', {
      id: candidate.comicvine_issue_id,
      title: candidate.series,
      issue: candidate.issue
    });
    
    setSelectedId(candidate.comicvine_issue_id);
  }, []);

  const handleConfirmSelection = useCallback(async () => {
    const candidate = candidates.find(c => c.comicvine_issue_id === selectedId);
    if (!candidate) return;
    
    console.log('[SCANNER_CORRECTION] Use this comic clicked', {
      id: candidate.comicvine_issue_id,
      title: candidate.series,
      issue: candidate.issue
    });
    
    if (!user) {
      onSelect(candidate);
      return;
    }

    setSaving(true);
    try {
      // Store correction for future lookups
      const correctionPayload: Record<string, unknown> = {
        user_id: user.id,
        input_text: inputText || title,
        normalized_input: normalizeInputText(inputText || title),
        selected_comicvine_id: candidate.comicvine_issue_id,
        selected_volume_id: candidate.comicvine_volume_id,
        selected_title: candidate.series,
        selected_issue: candidate.issue,
        selected_year: candidate.year,
        selected_publisher: candidate.publisher,
        selected_cover_url: candidate.coverUrl,
        ocr_text: ocrText || null,
        original_confidence: ocrConfidence,
        request_id: requestId || null,
      };

      const { error } = await supabase
        .from('scan_corrections')
        .insert(correctionPayload as any);

      if (error) {
        console.error('Failed to save correction:', error);
      } else {
        console.log('[CORRECTION] Saved user selection for:', inputText || title);
      }
    } catch (err) {
      console.error('Error saving correction:', err);
    } finally {
      setSaving(false);
      onSelect(candidate);
    }
  }, [candidates, selectedId, user, inputText, title, ocrText, ocrConfidence, requestId, onSelect]);

  // Removed handleUseSelected - now using handleConfirmSelection

  // Sort candidates by confidence
  const sortedCandidates = [...candidates].sort((a, b) => b.confidence - a.confidence);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent 
        side="bottom" 
        hideCloseButton
        className={cn(
          "flex flex-col p-0 rounded-t-2xl z-[100]",
          isMobile ? "h-[95vh]" : "h-[85vh]"
        )}
      >
        {/* Header */}
        <SheetHeader className="px-4 pt-4 pb-3 border-b bg-background sticky top-0 z-10">
          <div className="flex items-center justify-between">
            <SheetTitle className="text-lg font-semibold">
              Find the Correct Comic
            </SheetTitle>
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => onOpenChange(false)}
              className="h-10 w-10 touch-manipulation"
              type="button"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
        </SheetHeader>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto">
          {/* Manual Entry Section - Always visible at top */}
          <div className="p-4 bg-muted/30 border-b space-y-3">
            <p className="text-sm text-muted-foreground">
              Enter what you know — we'll find it
            </p>
            
            <div className="grid grid-cols-2 gap-3">
              {/* Title - Full width */}
              <div className="col-span-2 space-y-1.5">
                <Label htmlFor="title" className="text-xs font-medium">
                  Title <span className="text-muted-foreground">(required)</span>
                </Label>
                <Input
                  ref={titleInputRef}
                  id="title"
                  placeholder="e.g., Jonny Quest"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                  className="h-11 text-base"
                  autoComplete="off"
                />
              </div>

              {/* Issue # */}
              <div className="space-y-1.5">
                <Label htmlFor="issue" className="text-xs font-medium">
                  Issue #
                </Label>
                <Input
                  id="issue"
                  type="text"
                  inputMode="numeric"
                  placeholder="5"
                  value={issueNumber}
                  onChange={(e) => setIssueNumber(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                  className="h-11 text-base"
                  autoComplete="off"
                />
              </div>

              {/* Year */}
              <div className="space-y-1.5">
                <Label htmlFor="year" className="text-xs font-medium">
                  Year <span className="text-muted-foreground">(optional)</span>
                </Label>
                <Input
                  id="year"
                  type="text"
                  inputMode="numeric"
                  placeholder="1986"
                  value={year}
                  onChange={(e) => setYear(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                  className="h-11 text-base"
                  autoComplete="off"
                />
              </div>

              {/* Publisher - Full width */}
              <div className="col-span-2 space-y-1.5">
                <Label htmlFor="publisher" className="text-xs font-medium">
                  Publisher <span className="text-muted-foreground">(optional)</span>
                </Label>
                <Input
                  id="publisher"
                  placeholder="e.g., Comico, Marvel, DC"
                  value={publisher}
                  onChange={(e) => setPublisher(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                  className="h-11 text-base"
                  autoComplete="off"
                />
              </div>
            </div>

            {/* Search Button */}
            <Button 
              onClick={handleSearch} 
              disabled={searching || (!title.trim() && !issueNumber.trim())}
              className="w-full h-11"
            >
              {searching ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Search className="h-4 w-4 mr-2" />
              )}
              Search
            </Button>
          </div>

          {/* Candidate Results */}
          <div className="p-4 space-y-3">
            {sortedCandidates.length > 0 ? (
              <>
                <p className="text-sm font-medium text-muted-foreground">
                  Tap to select ({sortedCandidates.length} result{sortedCandidates.length !== 1 ? 's' : ''})
                </p>
                
                <div className="grid grid-cols-2 gap-3">
                  {sortedCandidates.map((candidate) => (
                    <button
                      key={candidate.comicvine_issue_id}
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handleSelectCandidate(candidate);
                      }}
                      onTouchEnd={(e) => {
                        // Explicit touch handling for iOS Safari
                        e.preventDefault();
                        handleSelectCandidate(candidate);
                      }}
                      disabled={saving}
                      type="button"
                      className={cn(
                        "relative flex flex-col rounded-xl border-2 overflow-hidden transition-all",
                        "hover:border-primary hover:shadow-md active:scale-[0.98]",
                        "touch-manipulation min-h-[180px] cursor-pointer",
                        "focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2",
                        selectedId === candidate.comicvine_issue_id 
                          ? 'border-primary ring-2 ring-primary/30 bg-primary/5' 
                          : 'border-border bg-background',
                        saving && selectedId === candidate.comicvine_issue_id && 'opacity-70'
                      )}
                      style={{ WebkitTapHighlightColor: 'transparent' }}
                    >
                      {/* Cover Image */}
                      <div className="aspect-[2/3] bg-muted flex-shrink-0 pointer-events-none">
                        {candidate.coverUrl ? (
                          <img
                            src={candidate.coverUrl}
                            alt={`${candidate.series} #${candidate.issue}`}
                            className="w-full h-full object-cover pointer-events-none"
                            loading="lazy"
                            draggable={false}
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-xs text-muted-foreground pointer-events-none">
                            <div className="text-center p-2">
                              <div className="w-8 h-12 mx-auto mb-1 border-2 border-dashed border-muted-foreground/30 rounded" />
                              No Cover
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Info */}
                      <div className="p-2 bg-background flex-1 pointer-events-none">
                        <div className="text-sm font-medium truncate leading-tight">
                          {candidate.series}
                        </div>
                        <div className="text-xs text-muted-foreground flex items-center justify-between mt-0.5">
                          <span className="font-medium">#{candidate.issue}</span>
                          <span>{candidate.year || ''}</span>
                        </div>
                        {candidate.publisher && (
                          <div className="text-xs text-muted-foreground truncate mt-0.5">
                            {candidate.publisher}
                          </div>
                        )}
                      </div>

                      {/* Selection Checkmark */}
                      {selectedId === candidate.comicvine_issue_id && (
                        <div className="absolute top-2 right-2 w-7 h-7 bg-primary rounded-full flex items-center justify-center shadow-md pointer-events-none">
                          <Check className="h-4 w-4 text-primary-foreground" />
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              </>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Search className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">Enter title and issue to search</p>
              </div>
            )}
          </div>
        </div>

        {/* Fixed Bottom Actions */}
        <div className="sticky bottom-0 p-4 border-t bg-background space-y-2 safe-area-inset-bottom">
          {selectedId && (
            <Button 
              onClick={handleConfirmSelection} 
              className="w-full h-12 text-base font-semibold touch-manipulation"
              disabled={saving}
              type="button"
            >
              {saving ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Check className="h-4 w-4 mr-2" />
              )}
              Use this comic
            </Button>
          )}
          
          <Button 
            variant="outline"
            onClick={onEnterManually}
            className="w-full h-11 touch-manipulation"
            type="button"
          >
            <Edit3 className="h-4 w-4 mr-2" />
            Enter Details Manually
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
