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

  return q;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Support both query string and JSON body
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

    // Fallback to URL search params
    if (!query) {
      query = url.searchParams.get("q") || "";
      publisher = url.searchParams.get("publisher") || null;
      year = url.searchParams.get("year") ? parseInt(url.searchParams.get("year")!) : null;
      limit = parseInt(url.searchParams.get("limit") || "20");
      offset = parseInt(url.searchParams.get("offset") || "0");
    }
    
    console.log('[VOLUMES-SUGGEST] Search request:', { query, publisher, year, limit, offset });

    const normalizedQuery = normalizeTitle(query);
    console.log('[VOLUMES-SUGGEST] Normalized query:', normalizedQuery);

    // --- ALWAYS query live ComicVine API for manual search ---
    // The local cache is incomplete and causes wrong results
    // Live API is the authoritative source
    
    const apiKey = Deno.env.get("COMICVINE_API_KEY");
    if (!apiKey) {
      console.error('[VOLUMES-SUGGEST] COMICVINE_API_KEY not configured');
      return new Response(
        JSON.stringify({
          results: [],
          totalResults: 0,
          offset: 0,
          limit: 20,
          hasMore: false,
          query: normalizedQuery,
          filters: { publisher, year },
          source: "local",
          error: "ComicVine API key not configured"
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!normalizedQuery) {
      return new Response(
        JSON.stringify({
          results: [],
          totalResults: 0,
          offset,
          limit,
          hasMore: false,
          query: "",
          filters: { publisher, year },
          source: "live",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    try {
      // Use SEARCH endpoint for keyword matching (not volumes with filter)
      // The filter param on volumes endpoint expects exact matches
      // The search endpoint does proper keyword/fuzzy matching
      const params = new URLSearchParams({
        api_key: apiKey,
        format: "json",
        resources: "volume",
        query: query,
        limit: String(Math.max(limit, 50)),
        offset: String(offset),
        field_list: "id,name,publisher,start_year,count_of_issues,image,deck,api_detail_url"
      });

      console.log('[VOLUMES-SUGGEST] Querying live ComicVine SEARCH API...');
      console.log('[VOLUMES-SUGGEST] Search query:', query);
      
      const resp = await fetch(`https://comicvine.gamespot.com/api/search/?${params.toString()}`, {
        headers: { 'User-Agent': 'GrailSeeker-Scanner/1.0' }
      });
      
      if (!resp.ok) {
        console.error('[VOLUMES-SUGGEST] ComicVine API error:', resp.status, resp.statusText);
        throw new Error(`ComicVine API returned ${resp.status}`);
      }

      const json = await resp.json();
      
      if (!json || typeof json !== 'object') {
        console.error('[VOLUMES-SUGGEST] Invalid JSON from ComicVine API');
        throw new Error('Invalid response from ComicVine');
      }

      const apiResults = Array.isArray(json.results) ? json.results : [];
      const totalFromAPI = typeof json.number_of_total_results === 'number' ? json.number_of_total_results : 0;

      console.log('[VOLUMES-SUGGEST] Live API returned', apiResults.length, 'results (total:', totalFromAPI, ')');

      // Score and sort results
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

        // Year match bonus
        if (v.start_year) {
          if (year) {
            score += Math.min(50, Math.abs(v.start_year - year));
          } else {
            // Prefer older series slightly (classic runs)
            score += Math.max(0, 2024 - v.start_year) / 200;
          }
        }

        // Prefer series with more issues (main runs, not reprints)
        score -= (v.count_of_issues || 0) / 100;

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
      
      const results = scoredResults.slice(0, limit);
      
      console.log('[VOLUMES-SUGGEST] Returning', results.length, 'scored results from live API');

      return new Response(
        JSON.stringify({
          results,
          totalResults: totalFromAPI,
          offset,
          limit,
          hasMore: offset + results.length < totalFromAPI,
          query: normalizedQuery,
          filters: { publisher, year },
          source: "live",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    } catch (apiError) {
      console.error('[VOLUMES-SUGGEST] Live API error:', apiError);
      
      // Fallback to local cache only on API failure
      console.log('[VOLUMES-SUGGEST] Falling back to local cache...');
      
      const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
      const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY")!;
      const supabase = createClient(supabaseUrl, supabaseKey);

      let dbQuery = supabase
        .from("comicvine_volumes")
        .select("id, name, slug, publisher, start_year, issue_count, image_url, deck")
        .ilike("name", `%${normalizedQuery}%`)
        .order("issue_count", { ascending: false })
        .limit(limit);

      if (publisher) {
        dbQuery = dbQuery.ilike("publisher", `%${publisher}%`);
      }

      const { data: volumes, error } = await dbQuery;

      if (error) {
        console.error('[VOLUMES-SUGGEST] Local cache error:', error);
      }

      const results = (volumes || []).map((vol: any) => ({
        ...vol,
        score: 50
      }));

      console.log('[VOLUMES-SUGGEST] Returning', results.length, 'results from local cache (fallback)');

      return new Response(
        JSON.stringify({
          results,
          totalResults: results.length,
          offset,
          limit,
          hasMore: false,
          query: normalizedQuery,
          filters: { publisher, year },
          source: "local",
          error: apiError instanceof Error ? apiError.message : "Live API unavailable, using cache"
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
  } catch (error) {
    console.error("[VOLUMES-SUGGEST] Fatal error:", error);
    
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
        error: error instanceof Error ? error.message : "Search temporarily unavailable"
      }),
      { 
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  }
});
