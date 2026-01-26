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
 * 
 * NEW: Identification Mode - When all candidates have very low scores,
 * the AI will identify the comic directly and search for it.
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
export const VISION_IDENTIFICATION_THRESHOLD = 0.50; // Candidates below this score trigger identification mode

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
  // Identification mode results
  identificationMode?: boolean;
  identifiedTitle?: string | null;
  identifiedIssue?: string | null;
  identifiedPublisher?: string | null;
  identifiedCharacter?: string | null;
  identificationConfidence?: number;
}

interface IdentificationSearchResult {
  picks: ComicVinePick[];
  identifiedTitle: string | null;
  identifiedCharacter: string | null;
}

interface UseVisionMatchReturn {
  runVisionMatch: (
    scanImageBase64: string,
    candidates: ComicVinePick[],
    triggeredBy: VisionTriggerReason,
    scanEventId?: string
  ) => Promise<VisionMatchResult | null>;
  runVisionIdentification: (
    scanImageBase64: string,
    scanEventId?: string
  ) => Promise<IdentificationSearchResult | null>;
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

      // No candidates = trigger identification mode
      if (candidates.length === 0) {
        console.log("[VISION-MATCH] No candidates - will trigger identification mode");
        return { should: true, reason: "auto_low_confidence" };
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
   * Search ComicVine using identified title/character
   */
  const searchFromIdentification = async (
    identifiedTitle: string | null,
    identifiedIssue: string | null,
    identifiedPublisher: string | null,
    identifiedCharacter: string | null
  ): Promise<ComicVinePick[]> => {
    // Build search query from identification results
    const searchTerms: string[] = [];
    
    // Prefer title, fallback to character name
    if (identifiedTitle) {
      searchTerms.push(identifiedTitle);
    } else if (identifiedCharacter) {
      searchTerms.push(identifiedCharacter);
    }
    
    if (searchTerms.length === 0) {
      console.log("[VISION-MATCH] No search terms from identification");
      return [];
    }
    
    const searchText = searchTerms.join(" ");
    console.log(`[VISION-MATCH] Searching ComicVine for identified: "${searchText}"`);
    
    try {
      const { data, error } = await supabase.functions.invoke("manual-comicvine-search", {
        body: {
          searchText,
          publisher: identifiedPublisher,
          issue: identifiedIssue,
        },
      });
      
      if (error) {
        console.error("[VISION-MATCH] Identification search error:", error);
        return [];
      }
      
      if (data?.ok && data.results?.length > 0) {
        console.log(`[VISION-MATCH] Identification search found ${data.results.length} results`);
        
        // Convert to ComicVinePick format
        return data.results.slice(0, 20).map((result: any) => ({
          id: result.id,
          resource: "issue" as const,
          title: result.volumeName || result.title,
          volumeName: result.volumeName || result.title,
          volumeId: result.volumeId || result.id,
          issue: result.issue || identifiedIssue || "",
          year: result.year || null,
          publisher: result.publisher || identifiedPublisher || null,
          coverUrl: result.coverUrl || null,
          thumbUrl: result.thumbUrl || null,
          source: "vision_identification" as const,
          score: result.score || 0.8,
          isReprint: false,
        }));
      }
      
      return [];
    } catch (err) {
      console.error("[VISION-MATCH] Identification search error:", err);
      return [];
    }
  };

  /**
   * Run vision identification directly (bypasses comparison mode)
   */
  const runVisionIdentification = useCallback(
    async (
      scanImageBase64: string,
      scanEventId?: string
    ): Promise<IdentificationSearchResult | null> => {
      setIsLoading(true);
      
      console.log("[VISION-MATCH] Running IDENTIFICATION mode directly");
      
      try {
        const { data, error } = await supabase.functions.invoke("vision-match", {
          body: {
            scanImageBase64,
            candidates: [],
            triggeredBy: "auto_low_confidence",
            scanEventId,
            userId: user?.id || null,
            forceIdentification: true,
          },
        });
        
        if (error) {
          console.error("[VISION-MATCH] Identification error:", error);
          return null;
        }
        
        const result = data as VisionMatchResult;
        setLastResult(result);
        
        if (result.identificationMode && (result.identifiedTitle || result.identifiedCharacter)) {
          console.log(`[VISION-MATCH] Identified: "${result.identifiedTitle}" character: "${result.identifiedCharacter}" confidence: ${result.identificationConfidence}`);
          
          // Search using identified information
          const picks = await searchFromIdentification(
            result.identifiedTitle || null,
            result.identifiedIssue || null,
            result.identifiedPublisher || null,
            result.identifiedCharacter || null
          );
          
          return {
            picks,
            identifiedTitle: result.identifiedTitle || null,
            identifiedCharacter: result.identifiedCharacter || null,
          };
        }
        
        return null;
      } catch (err) {
        console.error("[VISION-MATCH] Identification error:", err);
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    [user?.id]
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
      // If no candidates or all have very low scores, use identification mode
      const maxScore = Math.max(...candidates.map(c => c.score || 0), 0);
      if (candidates.length === 0 || maxScore < VISION_IDENTIFICATION_THRESHOLD) {
        console.log(`[VISION-MATCH] Low scores (max: ${maxScore.toFixed(2)}) - triggering identification mode`);
        const identResult = await runVisionIdentification(scanImageBase64, scanEventId);
        
        if (identResult && identResult.picks.length > 0) {
          // Return a result that indicates identification was used
          const topPick = identResult.picks[0];
          return {
            bestMatchComicId: topPick.id,
            bestMatchTitle: topPick.title || null,
            bestMatchIssue: topPick.issue || null,
            bestMatchPublisher: topPick.publisher || null,
            bestMatchYear: topPick.year || null,
            bestMatchCoverUrl: topPick.coverUrl || null,
            similarityScore: 0.85, // High confidence since AI identified it
            visionOverrideApplied: true,
            limitReached: false,
            candidatesCompared: 0,
            identificationMode: true,
            identifiedTitle: identResult.identifiedTitle,
            identifiedCharacter: identResult.identifiedCharacter,
          };
        }
        
        // Identification failed, continue with comparison mode
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

        // Check if identification mode was triggered (all candidates had low scores)
        if (result.identificationMode && (result.identifiedTitle || result.identifiedCharacter)) {
          console.log(`[VISION-MATCH] Backend triggered identification mode: "${result.identifiedTitle}"`);
          
          // Search using identified information
          const picks = await searchFromIdentification(
            result.identifiedTitle || null,
            result.identifiedIssue || null,
            result.identifiedPublisher || null,
            result.identifiedCharacter || null
          );
          
          if (picks.length > 0) {
            const topPick = picks[0];
            return {
              ...result,
              bestMatchComicId: topPick.id,
              bestMatchTitle: topPick.title || null,
              bestMatchIssue: topPick.issue || null,
              bestMatchPublisher: topPick.publisher || null,
              bestMatchYear: topPick.year || null,
              bestMatchCoverUrl: topPick.coverUrl || null,
              visionOverrideApplied: true,
              similarityScore: result.identificationConfidence || 0.8,
            };
          }
        }

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
    [user?.id, runVisionIdentification]
  );

  return {
    runVisionMatch,
    runVisionIdentification,
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

  // For identification mode, create a new pick from the result
  if (visionResult.identificationMode) {
    return {
      id: visionResult.bestMatchComicId,
      resource: "issue" as const,
      title: visionResult.bestMatchTitle || "",
      volumeName: visionResult.bestMatchTitle || "",
      volumeId: visionResult.bestMatchComicId,
      issue: visionResult.bestMatchIssue || "",
      year: visionResult.bestMatchYear || null,
      publisher: visionResult.bestMatchPublisher || null,
      coverUrl: visionResult.bestMatchCoverUrl || null,
      thumbUrl: visionResult.bestMatchCoverUrl || null,
      source: "vision" as const,
      score: visionResult.similarityScore,
      isReprint: false,
    };
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
