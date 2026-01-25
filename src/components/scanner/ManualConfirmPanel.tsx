/**
 * MANUAL CONFIRM PANEL
 * ==========================================================================
 * Displays when scanner confidence is low, allowing users to pick the correct
 * issue from top candidates. Stores corrections in scan_corrections table
 * for future lookup and training.
 * ==========================================================================
 */

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, Check, Search, Edit3 } from "lucide-react";
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
  onSelect: (candidate: TopCandidate) => void;
  onEnterManually: () => void;
  onSearchAgain: () => void;
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
  onSelect,
  onEnterManually,
  onSearchAgain
}: ManualConfirmPanelProps) {
  const { user } = useAuth();
  const [saving, setSaving] = useState(false);
  const [selectedId, setSelectedId] = useState<number | null>(null);

  const handleSelectCandidate = async (candidate: TopCandidate) => {
    if (!user) {
      onSelect(candidate);
      return;
    }

    setSelectedId(candidate.comicvine_issue_id);
    setSaving(true);

    try {
      // Store correction for future lookups
      const { error } = await supabase
        .from('scan_corrections')
        .insert({
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
          original_confidence: originalConfidence
        });

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

  // Show top 5 candidates
  const topCandidates = candidates.slice(0, 5);

  return (
    <Card className="border-amber-500/50 bg-amber-50/5 dark:bg-amber-950/10">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <AlertCircle className="h-5 w-5 text-amber-500" />
          <CardTitle className="text-lg">We couldn't confidently match this</CardTitle>
        </div>
        <CardDescription>
          Pick the correct issue from the options below, or search manually
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Candidate Grid */}
        <div className="grid gap-3">
          {topCandidates.map((candidate, index) => (
            <button
              key={candidate.comicvine_issue_id}
              onClick={() => handleSelectCandidate(candidate)}
              disabled={saving}
              className={`
                flex items-center gap-3 p-3 rounded-lg border text-left transition-all
                hover:border-primary hover:bg-primary/5
                ${selectedId === candidate.comicvine_issue_id 
                  ? 'border-primary bg-primary/10' 
                  : 'border-border'
                }
                ${saving && selectedId === candidate.comicvine_issue_id
                  ? 'opacity-70'
                  : ''
                }
              `}
            >
              {/* Cover Thumbnail */}
              <div className="w-12 h-16 rounded overflow-hidden bg-muted flex-shrink-0">
                {candidate.coverUrl ? (
                  <img
                    src={candidate.coverUrl}
                    alt={`${candidate.series} #${candidate.issue}`}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-xs text-muted-foreground">
                    No Cover
                  </div>
                )}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="font-medium truncate">
                  {candidate.series} #{candidate.issue}
                </div>
                <div className="text-sm text-muted-foreground flex items-center gap-2 flex-wrap">
                  {candidate.publisher && (
                    <span>{candidate.publisher}</span>
                  )}
                  {candidate.year && (
                    <span>({candidate.year})</span>
                  )}
                </div>
              </div>

              {/* Confidence Badge */}
              <Badge 
                variant={candidate.confidence >= 60 ? "default" : "secondary"}
                className="flex-shrink-0"
              >
                {candidate.confidence}%
              </Badge>

              {/* Selection indicator */}
              {selectedId === candidate.comicvine_issue_id && (
                <Check className="h-5 w-5 text-primary flex-shrink-0" />
              )}
            </button>
          ))}
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2 pt-2">
          <Button
            variant="outline"
            onClick={onSearchAgain}
            className="flex-1"
          >
            <Search className="h-4 w-4 mr-2" />
            Search Again
          </Button>
          <Button
            variant="outline"
            onClick={onEnterManually}
            className="flex-1"
          >
            <Edit3 className="h-4 w-4 mr-2" />
            Enter Manually
          </Button>
        </div>

        {/* Help text */}
        <p className="text-xs text-muted-foreground text-center">
          Your selection helps improve future scans for everyone
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
