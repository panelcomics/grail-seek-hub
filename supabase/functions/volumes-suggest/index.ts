import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function normalizeTitle(raw: string): string {
  if (!raw) return "";

  let q = raw.toLowerCase().trim();

  // Strip common noise characters
  q = q.replace(/[#()]/g, " ");

  // Remove issue numbers at the end: "#129", "129", "129 variant" etc.
  q = q.replace(/(?:#|no\.)?\s*\d+[a-z0-9-]*\s*$/i, "");

  q = q.replace(/\s+/g, " ").trim();

  // Drop leading "the " for better matching
  if (q.startsWith("the ")) {
    q = q.slice(4);
  }

  return q;
}

serve(async (req) => {
  const isDebug = Deno.env.get("VITE_SCANNER_DEBUG") === 'true';
  
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Support both query string and JSON body, but prefer body (how the app calls it)
    const url = new URL(req.url);
    let query = "";
    let publisher: string | null = null;
    let year: number | null = null;
    let limit = 20;
    let offset = 0;

    // Try to read JSON body first
    if (req.method !== "GET") {
      try {
        const body = await req.json();
        if (body && typeof body === "object") {
          query = (body.q || body.query || "").toString();
          publisher = body.publisher ? String(body.publisher) : null;
          year = body.year ? parseInt(String(body.year)) : null;
          limit = body.limit ? parseInt(String(body.limit)) : 20;
          offset = body.offset ? parseInt(String(body.offset)) : 0;
        }
      } catch {
        // Ignore body parse errors, fall back to URL params
      }
    }

    // Fallback to URL search params if still empty
    if (!query) {
      query = url.searchParams.get("q") || "";
      publisher = url.searchParams.get("publisher") || null;
      year = url.searchParams.get("year") ? parseInt(url.searchParams.get("year")!) : null;
      limit = parseInt(url.searchParams.get("limit") || "20");
      offset = parseInt(url.searchParams.get("offset") || "0");
    }
    
    if (isDebug) {
      console.log('[VOLUMES-SUGGEST] Query:', { query, publisher, year, limit, offset });
    }

    const normalizedQuery = normalizeTitle(query);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    let results: any[] = [];
    let source: "local" | "live" = "local";
    let bestScore = Infinity;

    if (normalizedQuery) {
      // --- Local cache search ---
      let dbQuery = supabase
        .from("comicvine_volumes")
        .select("id, name, slug, publisher, start_year, issue_count, image_url, deck");

      // Require title text match on name
      dbQuery = dbQuery.ilike("name", `%${normalizedQuery}%`);

      if (publisher) {
        dbQuery = dbQuery.ilike("publisher", `%${publisher}%`);
      }

      // We fetch a wider set for in-memory scoring, apply pagination after
      dbQuery = dbQuery.limit(200);

      const { data: volumes, error } = await dbQuery;

      if (error) {
        throw error;
      }

      if (volumes && volumes.length > 0) {
        // Score and sort by relevance to normalizedQuery
        const scoredResults = volumes.map((vol: any) => {
          const normalizedTitle = normalizeTitle(vol.name || "");

          let score = 100;

          if (normalizedTitle === normalizedQuery) {
            // Exact match of full title
            score = 0;
          } else if (normalizedTitle.startsWith(normalizedQuery)) {
            // Title starts with query
            score = 10;
          } else if (
            normalizedTitle.split(/\s+/).includes(normalizedQuery) ||
            normalizedTitle.startsWith(`${normalizedQuery} `) ||
            normalizedTitle.endsWith(` ${normalizedQuery}`)
          ) {
            // Query appears as a whole word
            score = 20;
          } else if (normalizedTitle.includes(normalizedQuery)) {
            // Query appears anywhere in title
            score = 30;
          }

          // Year tie-breaker: prefer closer to requested year, older series slightly preferred
          if (year && vol.start_year) {
            score += Math.min(50, Math.abs(vol.start_year - year));
          } else if (vol.start_year) {
            score += Math.max(0, 2024 - vol.start_year) / 200;
          }

          // Issue count bonus as final tiebreaker (more issues very slightly preferred)
          score -= (vol.issue_count || 0) / 2000;

          return { ...vol, score };
        });

        scoredResults.sort((a: any, b: any) => a.score - b.score);
        
        // Apply pagination after scoring
        const totalAvailable = scoredResults.length;
        const paginatedResults = scoredResults.slice(offset, offset + limit);
        
        results = paginatedResults;
        bestScore = scoredResults[0]?.score ?? Infinity;
      }

       // --- Live ComicVine fallback when local cache has no strong matches ---
       if (results.length === 0 || bestScore > 30) {
         const apiKey = Deno.env.get("COMICVINE_API_KEY");
         if (apiKey) {
           const params = new URLSearchParams({
             api_key: apiKey,
             format: "json",
             filter: `name:${query}`,
             sort: "start_year:asc",
             limit: String(limit),
             offset: String(offset),
           });

           const resp = await fetch(`https://comicvine.gamespot.com/api/volumes/?${params.toString()}`);
           if (resp.ok) {
             const json = await resp.json();
             
             // Defensive: validate response structure
             if (!json || typeof json !== 'object') {
               console.error('[VOLUMES-SUGGEST] Invalid JSON from ComicVine API');
               // Fall through to return local results
             } else {
               const apiResults = Array.isArray(json.results) ? json.results : [];
               const totalFromAPI = typeof json.number_of_total_results === 'number' ? json.number_of_total_results : 0;

               if (isDebug) {
                 console.log('[VOLUMES-SUGGEST] Live API returned', apiResults.length, 'results (total:', totalFromAPI, ')');
               }

               const scoredResults = apiResults.map((v: any) => {
               const normalizedTitle = normalizeTitle(v.name || "");

               let score = 100;
               if (normalizedTitle === normalizedQuery) {
                 score = 0;
               } else if (normalizedTitle.startsWith(normalizedQuery)) {
                 score = 10;
               } else if (
                 normalizedTitle.split(/\s+/).includes(normalizedQuery) ||
                 normalizedTitle.startsWith(`${normalizedQuery} `) ||
                 normalizedTitle.endsWith(` ${normalizedQuery}`)
               ) {
                 score = 20;
               } else if (normalizedTitle.includes(normalizedQuery)) {
                 score = 30;
               }

               if (v.start_year) {
                 if (year) {
                   score += Math.min(50, Math.abs(v.start_year - year));
                 } else {
                   score += Math.max(0, 2024 - v.start_year) / 200;
                 }
               }

               score -= (v.count_of_issues || 0) / 2000;

               return {
                 id: v.id,
                 name: v.name,
                 slug: v.slug || v.name?.toLowerCase().replace(/[^a-z0-9]+/g, "-") || "",
                 publisher: v.publisher?.name || null,
                 start_year: v.start_year || null,
                 issue_count: v.count_of_issues || null,
                 image_url: v.image?.small_url || v.image?.super_url || null,
                 deck: v.deck || null,
                 score,
               };
             });

               scoredResults.sort((a: any, b: any) => a.score - b.score);
               results = scoredResults;
               bestScore = results[0]?.score ?? Infinity;
               source = "live";
               
               if (isDebug) {
                 console.log('[VOLUMES-SUGGEST] Live results processed, bestScore:', bestScore);
               }
               
               return new Response(
                 JSON.stringify({
                   results,
                   totalResults: totalFromAPI,
                   offset,
                   limit,
                   hasMore: offset + results.length < totalFromAPI,
                   query: normalizedQuery,
                   filters: { publisher, year },
                   source,
                 }),
                 { headers: { ...corsHeaders, "Content-Type": "application/json" } },
               );
             }
           }
         }
       }
     }

    return new Response(
      JSON.stringify({
        results,
        totalResults: results.length,
        offset,
        limit,
        hasMore: false,
        query: normalizedQuery,
        filters: { publisher, year },
        source,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("Volume suggest error:", error);
    
    // Always return safe HTTP 200 with empty results - never crash
    return new Response(
      JSON.stringify({
        results: [],
        totalResults: 0,
        offset: 0,
        limit: 20,
        hasMore: false,
        query: "",
        filters: {},
        source: "local",
        error: error instanceof Error ? error.message : "ComicVine search temporarily unavailable"
      }),
      { 
        status: 200, // Always 200 - client handles empty results gracefully
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      },
    );
  }
});
