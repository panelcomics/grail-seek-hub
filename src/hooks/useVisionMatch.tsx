/**
 * VISION MATCH HOOK
 * ==========================================================================
 * Vision-First Scanner with Auto-Learning
 * 
 * STRATEGY:
 * 1. CACHE CHECK: First check scan_corrections for user-verified matches
 * 2. VISION-FIRST: If no cache hit, ALWAYS use vision matching
 * 3. AUTO-LEARN: Save vision results to scan_corrections for future cache hits
 * 
 * This creates a learning loop:
 * - Vision identifies comic → saved to cache
 * - Next scan of same OCR text → cache hit → no vision call needed
 * - Over time, popular comics are cached and vision costs decrease
 * ==========================================================================
 */

import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ComicVinePick } from "@/types/comicvine";
import { useAuth } from "@/contexts/AuthContext";

// Vision matching thresholds
export const VISION_CONFIDENCE_THRESHOLD = 0.80; // Cache hit threshold
export const VISION_CANDIDATE_GAP_THRESHOLD = 0.10; // Trigger if gap between top 2 candidates < this
export const VISION_OVERRIDE_THRESHOLD = 0.85; // Override OCR result if vision score >= this
export const VISION_IDENTIFICATION_THRESHOLD = 0.50; // Candidates below this score trigger identification mode

// VISION-FIRST MODE: Always trigger vision unless we have a cache hit
export const VISION_FIRST_MODE = true;

// Known publishers - trigger vision if title is ONLY a publisher name
const PUBLISHER_NAMES = new Set([
  'marvel', 'dc', 'image', 'dark horse', 'idw', 'boom', 'valiant',
  'dynamite', 'archie', 'vertigo', 'wildstorm', 'top cow', 'oni',
  'aftershock', 'scout', 'titan', 'vault', 'mad cave', 'ablaze'
]);

type VisionTriggerReason = "auto_low_confidence" | "multiple_candidates" | "user_correction" | "sanity_check" | "vision_first";

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
  saveVisionResultToCache: (
    ocrText: string,
    pick: ComicVinePick,
    visionConfidence: number
  ) => Promise<void>;
  isLoading: boolean;
  lastResult: VisionMatchResult | null;
  shouldTriggerVision: (
    ocrConfidence: number,
    candidates: ComicVinePick[],
    userTriggered?: boolean,
    ocrExtractedTitle?: string,
    ocrExtractedIssue?: string | null,
    hasCacheHit?: boolean
  ) => { should: boolean; reason: VisionTriggerReason | null };
}

export function useVisionMatch(): UseVisionMatchReturn {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [lastResult, setLastResult] = useState<VisionMatchResult | null>(null);

  /**
   * Determine if vision matching should be triggered
   * VISION-FIRST MODE: Always trigger unless we have a cache hit
   */
  const shouldTriggerVision = useCallback(
    (
      ocrConfidence: number,
      candidates: ComicVinePick[],
      userTriggered = false,
      ocrExtractedTitle?: string,
      ocrExtractedIssue?: string | null,
      hasCacheHit = false // NEW: Skip vision if we already have a cached result
    ): { should: boolean; reason: VisionTriggerReason | null } => {
      // User explicitly triggered (Wrong comic? Fix it)
      if (userTriggered) {
        console.log("[VISION-MATCH] User triggered correction");
        return { should: true, reason: "user_correction" };
      }

      // CACHE HIT: Skip vision if we have a verified cached result
      if (hasCacheHit) {
        console.log("[VISION-MATCH] Cache hit - skipping vision (learned match)");
        return { should: false, reason: null };
      }

      // VISION-FIRST MODE: Always trigger vision for new scans
      if (VISION_FIRST_MODE) {
        console.log("[VISION-MATCH] VISION-FIRST mode - triggering vision matching");
        return { should: true, reason: "vision_first" };
      }

      // ===== LEGACY FALLBACK LOGIC (only used if VISION_FIRST_MODE is false) =====
      
      // No candidates = trigger identification mode
      if (candidates.length === 0) {
        console.log("[VISION-MATCH] No candidates - will trigger identification mode");
        return { should: true, reason: "auto_low_confidence" };
      }

      // ===== SANITY CHECKS =====
      // These catch cases where OCR is "confidently wrong"
      
      if (ocrExtractedTitle) {
        const titleLower = ocrExtractedTitle.toLowerCase().trim();
        const titleWords = titleLower.split(/\s+/).filter(w => w.length > 0);
        
        // Check 1: Title is ONLY a publisher name (e.g., "MARVEL" instead of "Hulk")
        if (PUBLISHER_NAMES.has(titleLower) || 
            (titleWords.length === 1 && PUBLISHER_NAMES.has(titleWords[0]))) {
          console.log(`[VISION-MATCH] SANITY CHECK: Title is publisher-only: "${ocrExtractedTitle}"`);
          return { should: true, reason: "sanity_check" };
        }
        
        // Check 2: Title is suspiciously short (1-2 chars) - likely misread
        if (titleLower.length <= 2) {
          console.log(`[VISION-MATCH] SANITY CHECK: Title too short: "${ocrExtractedTitle}"`);
          return { should: true, reason: "sanity_check" };
        }
        
        // Check 3: Title is all uppercase AND single word AND no issue number
        // (Stylized titles like "HULK" often get misread)
        if (titleWords.length === 1 && 
            ocrExtractedTitle === ocrExtractedTitle.toUpperCase() && 
            !ocrExtractedIssue) {
          console.log(`[VISION-MATCH] SANITY CHECK: Single uppercase word with no issue: "${ocrExtractedTitle}"`);
          return { should: true, reason: "sanity_check" };
        }
      }
      
      // Check 4: No issue number extracted at all
      if (!ocrExtractedIssue && candidates.length > 0) {
        const topCandidate = candidates[0];
        // If top candidate has an issue but OCR didn't find one, be suspicious
        if (topCandidate.issue && topCandidate.issue.trim() !== '') {
          console.log(`[VISION-MATCH] SANITY CHECK: No issue extracted but candidate has issue #${topCandidate.issue}`);
          return { should: true, reason: "sanity_check" };
        }
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
   * Fetch specific issue from a volume to get cover URL
   */
  const fetchIssueFromVolume = async (
    volumeId: number,
    issueNumber: string | null
  ): Promise<{ coverUrl: string; issueId: number } | null> => {
    try {
      const { data, error } = await supabase.functions.invoke("fetch-comicvine-issue", {
        body: {
          volume_id: volumeId,
          issue_number: issueNumber || "1", // Default to #1 if no issue specified
        },
      });
      
      if (error || !data) return null;
      
      return {
        coverUrl: data.cover_url || "",
        issueId: data.id || volumeId,
      };
    } catch {
      return null;
    }
  };

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
    console.log(`[VISION-MATCH] Searching ComicVine for identified: "${searchText}" issue: "${identifiedIssue}"`);
    
    // Try full title first, then base title (without subtitle) if needed
    // e.g., "Venom: The Mace" → fallback to "Venom"
    const searchQueries = [searchText];
    if (identifiedTitle && identifiedTitle.includes(':')) {
      const baseTitle = identifiedTitle.split(':')[0].trim();
      if (baseTitle.length >= 3) {
        searchQueries.push(baseTitle);
        console.log(`[VISION-MATCH] Will try base title fallback: "${baseTitle}"`);
      }
    }
    
    for (const query of searchQueries) {
      try {
      const { data, error } = await supabase.functions.invoke("manual-comicvine-search", {
          body: {
            searchText: query,
            publisher: identifiedPublisher,
            issueNumber: identifiedIssue,
          },
        });
        
        if (error) {
          console.error("[VISION-MATCH] Identification search error:", error);
          continue;
        }
        
        if (data?.ok && data.results?.length > 0) {
          console.log(`[VISION-MATCH] Identification search for "${query}" found ${data.results.length} results`);
          
          // Convert to ComicVinePick format
          let picks: ComicVinePick[] = data.results.slice(0, 20).map((result: any) => ({
            id: result.id,
            resource: result.resource || "issue",
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
          
          // Known foreign reprint publishers to deprioritize
          const REPRINT_PUBLISHERS = new Set([
            'panini comics', 'panini', 'panini uk', 'panini books',
            'editorial vid', 'editorial televisa', 'planeta deagostini',
            'semic', 'egmont', 'marvel italia', 'marvel france',
            'hachette', 'planeta comic', 'ediciones zinco',
            'comics usa', 'juniorpress', 'atlantic forlag',
            'condor verlag', 'williams verlag', 'bsv williams',
          ]);
          
          // CRITICAL: Re-rank to prioritize EXACT title matches AND original publishers
          const targetTitle = identifiedTitle || query;
          const titleLower = targetTitle.toLowerCase().trim();
          const fullTitleLower = (identifiedTitle || "").toLowerCase().trim();
          
          picks = picks.map(pick => {
            const pickTitleLower = (pick.volumeName || pick.title || "").toLowerCase().trim();
            const pickPublisherLower = (pick.publisher || "").toLowerCase().trim();
            let scoreAdj = pick.score || 0;
            
            // === PUBLISHER PENALTIES ===
            // Heavy penalty for foreign reprint publishers (Panini, etc.)
            if (REPRINT_PUBLISHERS.has(pickPublisherLower)) {
              console.log(`[VISION-MATCH] Reprint publisher penalty: "${pick.publisher}" for "${pick.volumeName}"`);
              scoreAdj -= 1.0;
            }
            
            // === TITLE MATCHING ===
            // Exact full title match (e.g., "Venom: The Mace" === "Venom: The Mace")
            if (fullTitleLower && pickTitleLower === fullTitleLower) {
              console.log(`[VISION-MATCH] Exact full title match boost: "${pick.volumeName}"`);
              scoreAdj += 0.7;
            }
            // Exact base title match (e.g., "Venom" === "Venom")
            else if (pickTitleLower === titleLower) {
              console.log(`[VISION-MATCH] Exact title match boost: "${pick.volumeName}"`);
              scoreAdj += 0.5;
            }
            // Penalty for title that CONTAINS our title but isn't exact
            else if (pickTitleLower.includes(titleLower) && pickTitleLower !== titleLower) {
              console.log(`[VISION-MATCH] Partial match penalty: "${pick.volumeName}" (wanted "${targetTitle}")`);
              scoreAdj -= 0.3;
            }
            
            return { ...pick, score: scoreAdj };
          });
          
          // Re-sort by adjusted score
          picks.sort((a, b) => (b.score || 0) - (a.score || 0));
          
          // Filter out picks with score <= 0
          picks = picks.filter(p => (p.score || 0) > 0);
          
          if (picks.length === 0) {
            console.log(`[VISION-MATCH] All picks filtered out for "${query}", trying next query`);
            continue;
          }
          
          console.log(`[VISION-MATCH] Re-ranked top result: "${picks[0]?.volumeName}" #${picks[0]?.issue}`);
          
          // FIX: If top result has no cover URL (volume-level result), fetch the specific issue
          const topPick = picks[0];
          if (topPick && (!topPick.coverUrl || topPick.coverUrl === "")) {
            console.log(`[VISION-MATCH] Top pick has no cover URL, fetching issue from volume ${topPick.volumeId}`);
            
            const issueData = await fetchIssueFromVolume(
              topPick.volumeId || topPick.id,
              identifiedIssue || topPick.issue || "1"
            );
            
            if (issueData) {
              console.log(`[VISION-MATCH] Fetched issue cover: ${issueData.coverUrl?.substring(0, 50)}...`);
              picks[0] = {
                ...topPick,
                id: issueData.issueId,
                coverUrl: issueData.coverUrl,
                thumbUrl: issueData.coverUrl,
                resource: "issue",
              };
            }
          }
          
          return picks;
        }
      } catch (err) {
        console.error("[VISION-MATCH] Identification search error:", err);
      }
    }
    
    return [];
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
          
          // ComicVine search failed but vision DID identify the comic
          // Return identification data so Scanner can use it for prefill/manual search
          if (result.identificationConfidence && result.identificationConfidence >= 0.7) {
            console.log(`[VISION-MATCH] ComicVine search failed but vision identified: "${result.identifiedTitle}" #${result.identifiedIssue}`);
            return {
              ...result,
              bestMatchComicId: null,
              bestMatchTitle: result.identifiedTitle || null,
              bestMatchIssue: result.identifiedIssue || null,
              bestMatchPublisher: result.identifiedPublisher || null,
              bestMatchYear: null,
              bestMatchCoverUrl: null,
              visionOverrideApplied: false,
              similarityScore: result.identificationConfidence,
              identificationMode: true,
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

  /**
   * AUTO-LEARNING: Save vision result to scan_corrections cache
   * This allows future scans with the same OCR text to skip vision matching
   */
  const saveVisionResultToCache = useCallback(
    async (
      ocrText: string,
      pick: ComicVinePick,
      visionConfidence: number
    ) => {
      if (!ocrText || !pick.id) {
        console.log("[VISION-MATCH] Cannot save to cache - missing ocrText or pick.id");
        return;
      }

      // Normalize the OCR text for consistent cache lookups
      const normalizedInput = ocrText.toLowerCase().trim();
      
      // Only cache if vision was confident enough
      if (visionConfidence < 0.70) {
        console.log(`[VISION-MATCH] Not caching - vision confidence too low (${visionConfidence.toFixed(2)})`);
        return;
      }

      try {
        // Check if we already have a cached result for this input
        const { data: existing } = await supabase
          .from('scan_corrections')
          .select('id')
          .eq('normalized_input', normalizedInput)
          .limit(1);

        if (existing && existing.length > 0) {
          console.log(`[VISION-MATCH] Cache already exists for: "${normalizedInput}"`);
          return;
        }

        // Save to cache
        const correctionPayload = {
          user_id: user?.id || null,
          input_text: ocrText,
          normalized_input: normalizedInput,
          selected_comicvine_id: pick.id,
          selected_volume_id: pick.volumeId || null,
          selected_title: pick.volumeName || pick.title,
          selected_issue: pick.issue || null,
          selected_year: pick.year || null,
          selected_publisher: pick.publisher || null,
          selected_cover_url: pick.coverUrl || pick.thumbUrl || null,
          original_confidence: Math.round(visionConfidence * 100),
        };

        const { error } = await supabase
          .from('scan_corrections')
          .insert(correctionPayload as any);

        if (error) {
          console.error('[VISION-MATCH] Failed to save to cache:', error);
        } else {
          console.log(`[VISION-MATCH] AUTO-LEARNED: Saved "${pick.volumeName} #${pick.issue}" to cache for OCR: "${normalizedInput.substring(0, 50)}..."`);
        }
      } catch (err) {
        console.error('[VISION-MATCH] Cache save error:', err);
      }
    },
    [user?.id]
  );

  return {
    runVisionMatch,
    runVisionIdentification,
    saveVisionResultToCache,
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
