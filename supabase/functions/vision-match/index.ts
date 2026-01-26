/**
 * VISION MATCH EDGE FUNCTION
 * ==========================================================================
 * VISION-FIRST MODE: Uses Lovable AI vision models to identify comic covers.
 * 
 * This function now runs as the PRIMARY identification method, not just a fallback.
 * Combined with auto-learning, vision results are cached to reduce future API calls.
 * 
 * MODES:
 * 1. COMPARISON: Compare scanned cover against ComicVine candidates (when candidates exist)
 * 2. IDENTIFICATION: Directly identify the comic from the cover image (no candidates or low scores)
 * 
 * AUTO-LEARNING: Results are cached in scan_corrections table by the client
 * ==========================================================================
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface CandidateCover {
  id: number;
  title: string;
  issue: string | null;
  publisher: string | null;
  year: number | null;
  coverUrl: string;
  score?: number;
}

interface VisionMatchRequest {
  scanImageBase64: string; // Base64 encoded scan image
  candidates: CandidateCover[];
  triggeredBy: "auto_low_confidence" | "multiple_candidates" | "user_correction";
  scanEventId?: string;
  userId?: string;
  forceIdentification?: boolean; // Skip comparison, go straight to identification
}

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
  // NEW: Identification mode results
  identificationMode?: boolean;
  identifiedTitle?: string | null;
  identifiedIssue?: string | null;
  identifiedPublisher?: string | null;
  identifiedCharacter?: string | null;
  identificationConfidence?: number;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!LOVABLE_API_KEY) {
      console.error("[VISION-MATCH] LOVABLE_API_KEY not configured");
      return new Response(
        JSON.stringify({ error: "Vision matching not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

    // Check monthly limit before processing
    const { data: isAvailable, error: limitError } = await supabase.rpc("is_vision_available");
    
    if (limitError) {
      console.error("[VISION-MATCH] Error checking limit:", limitError);
    }

    if (!isAvailable) {
      console.log("[VISION-MATCH] Monthly limit reached, skipping vision matching");
      
      // Log the limit reached event
      await supabase.from("scan_vision_usage").insert({
        triggered_by: "auto_low_confidence",
        candidates_compared: 0,
        vision_override_applied: false,
      });

      return new Response(
        JSON.stringify({
          bestMatchComicId: null,
          bestMatchTitle: null,
          bestMatchIssue: null,
          bestMatchPublisher: null,
          bestMatchYear: null,
          bestMatchCoverUrl: null,
          similarityScore: 0,
          visionOverrideApplied: false,
          limitReached: true,
          candidatesCompared: 0,
        } as VisionMatchResult),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body: VisionMatchRequest = await req.json();
    const { scanImageBase64, candidates, triggeredBy, scanEventId, userId, forceIdentification } = body;

    if (!scanImageBase64) {
      return new Response(
        JSON.stringify({ error: "Missing scanImageBase64" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if we should use identification mode:
    // 1. Force identification requested
    // 2. No candidates provided
    // 3. All candidates have very low scores (< 0.5)
    const topCandidates = candidates?.slice(0, 15) || [];
    const candidatesCount = topCandidates.length;
    const maxCandidateScore = Math.max(...topCandidates.map(c => c.score || 0), 0);
    const shouldIdentify = forceIdentification || candidatesCount === 0 || maxCandidateScore < 0.5;

    console.log(`[VISION-MATCH] candidates: ${candidatesCount}, maxScore: ${maxCandidateScore.toFixed(2)}, shouldIdentify: ${shouldIdentify}`);
    console.log(`[VISION-MATCH] triggered_by: ${triggeredBy}`);

    // ========================================================================
    // IDENTIFICATION MODE: Ask AI to identify the comic directly
    // ========================================================================
    if (shouldIdentify) {
      console.log("[VISION-MATCH] Entering IDENTIFICATION MODE - asking AI to identify comic directly");

      const identificationPrompt = `You are an expert comic book collector and dealer. Look at this comic book cover image and identify it.

Analyze the image carefully and look for:
1. The main character(s) depicted (costume, powers, distinctive features)
2. Any visible title text (may be stylized or hard to read)
3. Issue number (often in corners or near title)
4. Publisher logo (Marvel, DC, Image, etc.)
5. Artist style and era

Based on what you see, provide your best identification in this JSON format:
{
  "identified_title": "The comic series title (e.g., 'Power Girl', 'Batman', 'X-Men')",
  "identified_issue": "Issue number if visible, or null",
  "identified_publisher": "Publisher (DC, Marvel, Image, etc.)",
  "identified_character": "Main character name if recognizable",
  "confidence": 0.0 to 1.0 score of how confident you are,
  "reasoning": "Brief explanation of how you identified this"
}

Common character identifications:
- White costume with red cape, large chest window = Power Girl (DC)
- Red/blue with S symbol = Superman (DC)
- Bat costume, pointed ears = Batman (DC)
- Red/blue spider web pattern = Spider-Man (Marvel)
- Yellow/blue or blue/gold with X = X-Men (Marvel)
- Green with ring = Green Lantern (DC)

If this appears to be a variant cover (artistic rendition with minimal text), still identify the character/series.
If you cannot identify the comic at all, set confidence to 0.`;

      const identifyResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            { role: "system", content: identificationPrompt },
            {
              role: "user",
              content: [
                { type: "text", text: "Please identify this comic book cover:" },
                {
                  type: "image_url",
                  image_url: {
                    url: scanImageBase64.startsWith("data:") 
                      ? scanImageBase64 
                      : `data:image/jpeg;base64,${scanImageBase64}`,
                  },
                },
              ],
            },
          ],
          max_tokens: 500,
        }),
      });

      if (!identifyResponse.ok) {
        const errorText = await identifyResponse.text();
        console.error("[VISION-MATCH] Identification API error:", identifyResponse.status, errorText);
        
        // Log failed attempt
        await supabase.from("scan_vision_usage").insert({
          scan_event_id: scanEventId,
          user_id: userId || null,
          triggered_by: triggeredBy,
          candidates_compared: 0,
          similarity_score: 0,
          matched_comic_id: null,
          vision_override_applied: false,
        });

        return new Response(
          JSON.stringify({
            bestMatchComicId: null,
            bestMatchTitle: null,
            bestMatchIssue: null,
            bestMatchPublisher: null,
            bestMatchYear: null,
            bestMatchCoverUrl: null,
            similarityScore: 0,
            visionOverrideApplied: false,
            limitReached: false,
            candidatesCompared: 0,
            identificationMode: true,
            error: "Vision API temporarily unavailable",
          }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const aiResponse = await identifyResponse.json();
      const content = aiResponse.choices?.[0]?.message?.content || "";
      
      console.log("[VISION-MATCH] Identification response:", content);

      // Parse identification result
      let identifiedTitle: string | null = null;
      let identifiedIssue: string | null = null;
      let identifiedPublisher: string | null = null;
      let identifiedCharacter: string | null = null;
      let identificationConfidence = 0;
      let reasoning = "";

      try {
        const jsonMatch = content.match(/\{[\s\S]*?\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          identifiedTitle = parsed.identified_title || null;
          identifiedIssue = parsed.identified_issue || null;
          identifiedPublisher = parsed.identified_publisher || null;
          identifiedCharacter = parsed.identified_character || null;
          identificationConfidence = parsed.confidence || 0;
          reasoning = parsed.reasoning || "";
        }
      } catch (parseError) {
        console.error("[VISION-MATCH] Failed to parse identification response:", parseError);
      }

      console.log(`[VISION-MATCH] Identified: "${identifiedTitle}" #${identifiedIssue} by ${identifiedPublisher}, character: ${identifiedCharacter}, confidence: ${identificationConfidence}`);
      if (reasoning) {
        console.log(`[VISION-MATCH] Reasoning: ${reasoning}`);
      }

      // Log usage for identification mode
      await supabase.from("scan_vision_usage").insert({
        scan_event_id: scanEventId,
        user_id: userId || null,
        triggered_by: triggeredBy,
        candidates_compared: 0,
        similarity_score: identificationConfidence,
        matched_comic_id: null,
        matched_title: identifiedTitle,
        vision_override_applied: identificationConfidence >= 0.7,
      });

      return new Response(
        JSON.stringify({
          bestMatchComicId: null,
          bestMatchTitle: null,
          bestMatchIssue: null,
          bestMatchPublisher: null,
          bestMatchYear: null,
          bestMatchCoverUrl: null,
          similarityScore: 0,
          visionOverrideApplied: false,
          limitReached: false,
          candidatesCompared: 0,
          // Identification results
          identificationMode: true,
          identifiedTitle,
          identifiedIssue,
          identifiedPublisher,
          identifiedCharacter,
          identificationConfidence,
        } as VisionMatchResult),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ========================================================================
    // COMPARISON MODE: Compare against candidate covers
    // ========================================================================
    console.log(`[VISION-MATCH] COMPARISON MODE - comparing against ${candidatesCount} candidates`);

    // Build the prompt for cover comparison
    const candidateDescriptions = topCandidates.map((c, i) => 
      `${i + 1}. "${c.title}" #${c.issue || 'N/A'} (${c.publisher || 'Unknown'}, ${c.year || 'Unknown'}) - Cover URL: ${c.coverUrl}`
    ).join("\n");

    const systemPrompt = `You are a comic book cover identification expert. You will be shown a scanned comic book cover image. Your task is to compare it against the provided candidate covers and determine which one matches best.

Analyze:
1. Title text on the cover
2. Issue number
3. Cover artwork and composition
4. Publisher logo
5. Characters depicted
6. Color scheme and art style

Respond with a JSON object containing:
- "best_match_index": The 1-based index of the best matching candidate (1-${candidatesCount}), or 0 if none match well
- "similarity_score": A confidence score from 0.0 to 1.0 indicating how well the best match matches
- "reasoning": Brief explanation of why this match was chosen

Be strict - only give high similarity scores (>0.85) if the cover art, title, and issue number clearly match. Lower scores for partial matches.`;

    const userPrompt = `Here are the ${candidatesCount} candidate comics to compare against:

${candidateDescriptions}

Look at the scanned cover image and determine which candidate (if any) best matches it. Consider the title, issue number, cover art, and publisher.`;

    // Call Lovable AI with vision capability
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash", // Fast + good for vision
        messages: [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content: [
              { type: "text", text: userPrompt },
              {
                type: "image_url",
                image_url: {
                  url: scanImageBase64.startsWith("data:") 
                    ? scanImageBase64 
                    : `data:image/jpeg;base64,${scanImageBase64}`,
                },
              },
            ],
          },
        ],
        max_tokens: 500,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[VISION-MATCH] Lovable AI error:", response.status, errorText);
      
      if (response.status === 429) {
        console.log("[VISION-MATCH] Rate limited by Lovable AI");
      }

      // Log failed attempt
      await supabase.from("scan_vision_usage").insert({
        scan_event_id: scanEventId,
        user_id: userId || null,
        triggered_by: triggeredBy,
        candidates_compared: candidatesCount,
        similarity_score: 0,
        matched_comic_id: null,
        vision_override_applied: false,
      });

      return new Response(
        JSON.stringify({
          bestMatchComicId: null,
          bestMatchTitle: null,
          bestMatchIssue: null,
          bestMatchPublisher: null,
          bestMatchYear: null,
          bestMatchCoverUrl: null,
          similarityScore: 0,
          visionOverrideApplied: false,
          limitReached: false,
          candidatesCompared: candidatesCount,
          error: "Vision API temporarily unavailable",
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const aiResponse = await response.json();
    const content = aiResponse.choices?.[0]?.message?.content || "";
    
    console.log("[VISION-MATCH] AI response:", content);

    // Parse the JSON response
    let bestMatchIndex = 0;
    let similarityScore = 0;
    let reasoning = "";

    try {
      // Extract JSON from response (may be wrapped in markdown code blocks)
      const jsonMatch = content.match(/\{[\s\S]*?\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        bestMatchIndex = parsed.best_match_index || 0;
        similarityScore = parsed.similarity_score || 0;
        reasoning = parsed.reasoning || "";
      }
    } catch (parseError) {
      console.error("[VISION-MATCH] Failed to parse AI response:", parseError);
    }

    // Determine if we should apply the vision override
    const visionOverrideApplied = bestMatchIndex > 0 && similarityScore >= 0.85;
    const bestMatch = bestMatchIndex > 0 ? topCandidates[bestMatchIndex - 1] : null;

    console.log(`[VISION-MATCH] Best match index: ${bestMatchIndex}, score: ${similarityScore}`);
    console.log(`[VISION-MATCH] vision_override_applied: ${visionOverrideApplied}`);
    if (reasoning) {
      console.log(`[VISION-MATCH] Reasoning: ${reasoning}`);
    }

    // CRITICAL FIX: If comparison mode found NO good match (score < 0.3), 
    // fallback to identification mode to let AI identify the comic directly
    if (similarityScore < 0.3) {
      console.log(`[VISION-MATCH] Comparison failed (score: ${similarityScore}), falling back to IDENTIFICATION MODE`);
      
      // Run identification
      const identificationPrompt = `You are an expert comic book collector. Look at this comic cover and identify it.

Analyze:
1. Main character(s) depicted (costume, features)
2. Title text (may be stylized)
3. Issue number
4. Publisher logo
5. Art style and era

Provide identification as JSON:
{
  "identified_title": "Series title",
  "identified_issue": "Issue number or null",
  "identified_publisher": "Publisher",
  "identified_character": "Main character",
  "confidence": 0.0-1.0,
  "reasoning": "Brief explanation"
}

Character hints:
- Red muscular monster = Red Hulk (Marvel Hulk series 2008)
- Green muscular monster = Hulk (Marvel)
- Red/blue spider suit = Spider-Man
- Bat costume = Batman`;

      const identifyResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            { role: "system", content: identificationPrompt },
            {
              role: "user",
              content: [
                { type: "text", text: "Identify this comic:" },
                {
                  type: "image_url",
                  image_url: {
                    url: scanImageBase64.startsWith("data:") 
                      ? scanImageBase64 
                      : `data:image/jpeg;base64,${scanImageBase64}`,
                  },
                },
              ],
            },
          ],
          max_tokens: 500,
        }),
      });

      if (identifyResponse.ok) {
        const idResponse = await identifyResponse.json();
        const idContent = idResponse.choices?.[0]?.message?.content || "";
        console.log("[VISION-MATCH] Fallback identification response:", idContent);

        let identifiedTitle: string | null = null;
        let identifiedIssue: string | null = null;
        let identifiedPublisher: string | null = null;
        let identifiedCharacter: string | null = null;
        let identificationConfidence = 0;

        try {
          const jsonMatch = idContent.match(/\{[\s\S]*?\}/);
          if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0]);
            identifiedTitle = parsed.identified_title || null;
            identifiedIssue = parsed.identified_issue || null;
            identifiedPublisher = parsed.identified_publisher || null;
            identifiedCharacter = parsed.identified_character || null;
            identificationConfidence = parsed.confidence || 0;
          }
        } catch (e) {
          console.error("[VISION-MATCH] Failed to parse identification:", e);
        }

        if (identifiedTitle && identificationConfidence >= 0.5) {
          console.log(`[VISION-MATCH] Fallback identified: "${identifiedTitle}" #${identifiedIssue} confidence: ${identificationConfidence}`);
          
          // Log usage with identification
          await supabase.from("scan_vision_usage").insert({
            scan_event_id: scanEventId,
            user_id: userId || null,
            triggered_by: triggeredBy,
            candidates_compared: candidatesCount,
            similarity_score: identificationConfidence,
            matched_comic_id: null,
            matched_title: identifiedTitle,
            vision_override_applied: true,
          });

          return new Response(
            JSON.stringify({
              bestMatchComicId: null,
              bestMatchTitle: null,
              bestMatchIssue: null,
              bestMatchPublisher: null,
              bestMatchYear: null,
              bestMatchCoverUrl: null,
              similarityScore: 0,
              visionOverrideApplied: false,
              limitReached: false,
              candidatesCompared: candidatesCount,
              identificationMode: true,
              identifiedTitle,
              identifiedIssue,
              identifiedPublisher,
              identifiedCharacter,
              identificationConfidence,
            } as VisionMatchResult),
            { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      }
    }

    // Log usage
    await supabase.from("scan_vision_usage").insert({
      scan_event_id: scanEventId,
      user_id: userId || null,
      triggered_by: triggeredBy,
      candidates_compared: candidatesCount,
      similarity_score: similarityScore,
      matched_comic_id: bestMatch?.id || null,
      matched_title: bestMatch?.title || null,
      vision_override_applied: visionOverrideApplied,
    });

    const result: VisionMatchResult = {
      bestMatchComicId: bestMatch?.id || null,
      bestMatchTitle: bestMatch?.title || null,
      bestMatchIssue: bestMatch?.issue || null,
      bestMatchPublisher: bestMatch?.publisher || null,
      bestMatchYear: bestMatch?.year || null,
      bestMatchCoverUrl: bestMatch?.coverUrl || null,
      similarityScore,
      visionOverrideApplied,
      limitReached: false,
      candidatesCompared: candidatesCount,
    };

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("[VISION-MATCH] Error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
