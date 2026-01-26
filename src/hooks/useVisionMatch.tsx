/**
 * VISION MATCH HOOK
 * ==========================================================================
 * Hook for calling the vision-match edge function to compare scanned covers
 * against ComicVine candidates using Lovable AI vision models.
 * 
 * Cost-controlled: Only triggers when:
 * 1. OCR confidence < 0.75
 * 2. Multiple candidates with gap < 0.10
 * 3. User taps "Wrong comic? Fix it"
 * ==========================================================================
 */

import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ComicVinePick } from "@/types/comicvine";
import { useAuth } from "@/contexts/AuthContext";

// Vision matching thresholds
export const VISION_CONFIDENCE_THRESHOLD = 0.75; // Trigger if OCR confidence below this
export const VISION_CANDIDATE_GAP_THRESHOLD = 0.10; // Trigger if gap between top 2 candidates < this
export const VISION_OVERRIDE_THRESHOLD = 0.85; // Override OCR result if vision score >= this

type VisionTriggerReason = "auto_low_confidence" | "multiple_candidates" | "user_correction";

interface VisionMatchResult {
  bestMatchComicId: number | null;
  bestMatchTitle: string | null;
  bestMatchIssue: string | null;
  bestMatchPublisher: string | null;
  bestMatchYear: number | null;
  bestMatchCoverUrl: string | null;
  similarityScore: number;
  visionOverrideApplied: boolean;
  limitReached: boolean;
  candidatesCompared: number;
  error?: string;
}

interface UseVisionMatchReturn {
  runVisionMatch: (
    scanImageBase64: string,
    candidates: ComicVinePick[],
    triggeredBy: VisionTriggerReason,
    scanEventId?: string
  ) => Promise<VisionMatchResult | null>;
  isLoading: boolean;
  lastResult: VisionMatchResult | null;
  shouldTriggerVision: (
    ocrConfidence: number,
    candidates: ComicVinePick[],
    userTriggered?: boolean
  ) => { should: boolean; reason: VisionTriggerReason | null };
}

export function useVisionMatch(): UseVisionMatchReturn {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [lastResult, setLastResult] = useState<VisionMatchResult | null>(null);

  /**
   * Determine if vision matching should be triggered
   */
  const shouldTriggerVision = useCallback(
    (
      ocrConfidence: number,
      candidates: ComicVinePick[],
      userTriggered = false
    ): { should: boolean; reason: VisionTriggerReason | null } => {
      // User explicitly triggered (Wrong comic? Fix it)
      if (userTriggered) {
        console.log("[VISION-MATCH] User triggered correction");
        return { should: true, reason: "user_correction" };
      }

      // No candidates = nothing to compare
      if (candidates.length === 0) {
        return { should: false, reason: null };
      }

      // Check low confidence
      if (ocrConfidence < VISION_CONFIDENCE_THRESHOLD) {
        console.log(
          `[VISION-MATCH] Low OCR confidence (${ocrConfidence.toFixed(2)} < ${VISION_CONFIDENCE_THRESHOLD})`
        );
        return { should: true, reason: "auto_low_confidence" };
      }

      // Check for multiple close candidates
      if (candidates.length >= 2) {
        const topScore = candidates[0].score || 0;
        const secondScore = candidates[1].score || 0;
        const gap = topScore - secondScore;

        if (gap < VISION_CANDIDATE_GAP_THRESHOLD) {
          console.log(
            `[VISION-MATCH] Close candidates (gap: ${gap.toFixed(2)} < ${VISION_CANDIDATE_GAP_THRESHOLD})`
          );
          return { should: true, reason: "multiple_candidates" };
        }
      }

      return { should: false, reason: null };
    },
    []
  );

  /**
   * Run vision matching against candidates
   */
  const runVisionMatch = useCallback(
    async (
      scanImageBase64: string,
      candidates: ComicVinePick[],
      triggeredBy: VisionTriggerReason,
      scanEventId?: string
    ): Promise<VisionMatchResult | null> => {
      if (candidates.length === 0) {
        console.log("[VISION-MATCH] No candidates to compare");
        return null;
      }

      setIsLoading(true);

      console.log(`[VISION-MATCH] vision_match_triggered: true`);
      console.log(`[VISION-MATCH] reason: ${triggeredBy}`);
      console.log(`[VISION-MATCH] candidates: ${Math.min(candidates.length, 15)}`);

      try {
        // Prepare candidates for the edge function
        const candidatesForVision = candidates.slice(0, 15).map((c) => ({
          id: c.id,
          title: c.title || c.volumeName || "",
          issue: c.issue,
          publisher: c.publisher,
          year: c.year,
          coverUrl: c.coverUrl || c.thumbUrl || "",
          score: c.score,
        }));

        const { data, error } = await supabase.functions.invoke("vision-match", {
          body: {
            scanImageBase64,
            candidates: candidatesForVision,
            triggeredBy,
            scanEventId,
            userId: user?.id || null,
          },
        });

        if (error) {
          console.error("[VISION-MATCH] Edge function error:", error);
          return null;
        }

        const result = data as VisionMatchResult;
        setLastResult(result);

        // Log override if it occurred
        if (result.visionOverrideApplied) {
          console.log(
            `[VISION-MATCH] vision_match_override: ${result.bestMatchComicId}, score: ${result.similarityScore.toFixed(2)}`
          );
        } else if (result.limitReached) {
          console.log("[VISION-MATCH] vision_limit_reached");
        }

        return result;
      } catch (err) {
        console.error("[VISION-MATCH] Error:", err);
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    [user?.id]
  );

  return {
    runVisionMatch,
    isLoading,
    lastResult,
    shouldTriggerVision,
  };
}

/**
 * Apply vision match result to update the selected pick
 * Returns the updated pick if vision override was applied
 */
export function applyVisionOverride(
  currentPick: ComicVinePick | null,
  candidates: ComicVinePick[],
  visionResult: VisionMatchResult
): ComicVinePick | null {
  if (!visionResult.visionOverrideApplied || !visionResult.bestMatchComicId) {
    return currentPick;
  }

  // Find the matching candidate
  const matchedCandidate = candidates.find(
    (c) => c.id === visionResult.bestMatchComicId
  );

  if (matchedCandidate) {
    // Return updated pick with vision source marker
    return {
      ...matchedCandidate,
      source: "vision" as const,
      score: visionResult.similarityScore,
    };
  }

  return currentPick;
}
