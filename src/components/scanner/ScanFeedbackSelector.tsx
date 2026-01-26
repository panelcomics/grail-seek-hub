/**
 * SCAN FEEDBACK SELECTOR
 * ======================
 * Allows users to confirm if the scanner got the match right.
 * Saves corrections locally for future accuracy improvements.
 * 
 * ENHANCED: Positive feedback now also saves to scan_corrections table
 * for the self-learning correction cache to use.
 */

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ThumbsUp, ThumbsDown, Check, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { markScanCorrect, markScanIncorrect } from "@/lib/scanFeedback";
import { ComicVinePick } from "@/types/comicvine";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface ScanFeedbackSelectorProps {
  match: ComicVinePick | null;
  confidence: number | null;
  className?: string;
  /** Normalized input text used for matching (for correction cache) */
  normalizedInput?: string | null;
}

type FeedbackState = 'idle' | 'correct' | 'incorrect';

export function ScanFeedbackSelector({
  match,
  confidence,
  className,
  normalizedInput
}: ScanFeedbackSelectorProps) {
  const [feedbackState, setFeedbackState] = useState<FeedbackState>('idle');
  const [isAnimating, setIsAnimating] = useState(false);

  const handleCorrect = async () => {
    if (feedbackState !== 'idle') return;
    
    setIsAnimating(true);
    
    // Save to local storage (existing behavior)
    markScanCorrect(
      match?.volumeName || match?.title || null,
      match?.issue || null,
      match?.publisher || null,
      match?.year?.toString() || null,
      match?.id || null,
      confidence
    );
    
    // ENHANCED: Also save confirmed matches to scan_corrections table
    // This feeds the self-learning correction cache
    if (match?.id && normalizedInput) {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        
        const correctionPayload = {
          user_id: user?.id || null,
          input_text: normalizedInput,
          normalized_input: normalizedInput.toLowerCase().trim(),
          selected_comicvine_id: match.id,
          selected_volume_id: match.volumeId || null,
          selected_title: match.volumeName || match.title,
          selected_issue: match.issue || null,
          selected_year: match.year || null,
          selected_publisher: match.publisher || null,
          selected_cover_url: match.coverUrl || match.thumbUrl || null,
          original_confidence: confidence ? Math.round(confidence * 100) : null,
        };
        
        await supabase.from('scan_corrections').insert(correctionPayload as any);
        console.log('[FEEDBACK] Saved confirmed match to correction cache:', normalizedInput);
      } catch (err) {
        console.warn('[FEEDBACK] Failed to save to correction cache:', err);
        // Don't block user feedback on DB errors
      }
    }
    
    setTimeout(() => {
      setFeedbackState('correct');
      setIsAnimating(false);
      toast.success("Thanks! Your feedback helps improve our scanner.", {
        duration: 2000,
      });
    }, 300);
  };

  const handleIncorrect = () => {
    if (feedbackState !== 'idle') return;
    
    setIsAnimating(true);
    
    // For now, save as incorrect without detailed correction
    // The user will provide corrections via the "Edit Details" flow
    markScanIncorrect(
      {
        title: match?.volumeName || match?.title || null,
        issue: match?.issue || null,
        publisher: match?.publisher || null,
        year: match?.year?.toString() || null,
        comicVineId: match?.id || null,
      },
      {
        title: null, // Will be filled when user edits
        issue: null,
        publisher: null,
        year: null,
        comicVineId: null,
      },
      confidence
    );
    
    setTimeout(() => {
      setFeedbackState('incorrect');
      setIsAnimating(false);
      toast("Got it! Use 'Edit Details' to correct the match.", {
        duration: 3000,
      });
    }, 300);
  };

  // Already submitted feedback
  if (feedbackState !== 'idle') {
    return (
      <div 
        className={cn(
          "flex items-center gap-2 px-3 py-2 rounded-lg text-sm",
          feedbackState === 'correct' 
            ? "bg-success/10 text-success" 
            : "bg-muted text-muted-foreground",
          className
        )}
      >
        {feedbackState === 'correct' ? (
          <>
            <Check className="w-4 h-4" />
            <span>Thanks for confirming!</span>
          </>
        ) : (
          <>
            <X className="w-4 h-4" />
            <span>We'll learn from this</span>
          </>
        )}
      </div>
    );
  }

  return (
    <div className={cn("space-y-2", className)}>
      <p className="text-xs text-muted-foreground font-medium">
        Did we get this right?
      </p>
      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={handleCorrect}
          disabled={isAnimating}
          className={cn(
            "flex-1 gap-2 transition-all",
            isAnimating && "scale-95 opacity-70"
          )}
        >
          <ThumbsUp className="w-4 h-4" />
          Yes
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={handleIncorrect}
          disabled={isAnimating}
          className={cn(
            "flex-1 gap-2 transition-all",
            isAnimating && "scale-95 opacity-70"
          )}
        >
          <ThumbsDown className="w-4 h-4" />
          No
        </Button>
      </div>
    </div>
  );
}
