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

    // Try to read JSON body first
    if (req.method !== "GET") {
      try {
        const body = await req.json();
        if (body && typeof body === "object") {
          query = (body.q || body.query || "").toString();
          publisher = body.publisher ? String(body.publisher) : null;
          year = body.year ? parseInt(String(body.year)) : null;
          limit = body.limit ? parseInt(String(body.limit)) : 20;
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
    }

    const normalizedQuery = normalizeTitle(query);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    let results: any[] = [];
    let source: "local" | "live" = "local";

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

      // We fetch a wider set, then score in-memory
      dbQuery = dbQuery.limit(100);

      const { data: volumes, error } = await dbQuery;

      if (error) {
        throw error;
      }

      if (volumes && volumes.length > 0) {
        // Score and sort by relevance to normalizedQuery
        const scoredResults = volumes.map((vol: any) => {
          const nameLower = (vol.name || "").toLowerCase();

          let score = 1000;

          if (nameLower === normalizedQuery) {
            // Exact match
            score = 0;
          } else if (nameLower.startsWith(normalizedQuery)) {
            // Starts with
            score = 10;
          } else if (
            nameLower.split(/\s+/).includes(normalizedQuery) ||
            nameLower.startsWith(`${normalizedQuery} `) ||
            nameLower.endsWith(` ${normalizedQuery}`)
          ) {
            // Appears as a whole word
            score = 20;
          } else if (nameLower.includes(normalizedQuery)) {
            // Appears anywhere
            score = 30;
          }

          // Length penalty: prefer shorter titles
          score += (vol.name?.length || 0) / 10;

          // Year tie-breaker: prefer older series when year is known
          if (year && vol.start_year) {
            score += Math.abs(vol.start_year - year);
          } else if (vol.start_year) {
            score += Math.max(0, 2024 - vol.start_year) / 100;
          }

          // Issue count bonus as final tiebreaker
          score -= (vol.issue_count || 0) / 1000;

          return { ...vol, score };
        });

        scoredResults.sort((a, b) => a.score - b.score);
        results = scoredResults.map(({ score, ...vol }) => vol).slice(0, limit);
      }

      // --- Live ComicVine fallback when local cache has no matches ---
      if (results.length === 0) {
        const apiKey = Deno.env.get("COMICVINE_API_KEY");
        if (apiKey) {
          const params = new URLSearchParams({
            api_key: apiKey,
            format: "json",
            filter: `name:${normalizedQuery}`,
            sort: "start_year:asc",
            limit: String(limit),
          });

          const resp = await fetch(`https://comicvine.gamespot.com/api/volumes/?${params.toString()}`);
          if (resp.ok) {
            const json = await resp.json();
            const apiResults = json.results || [];

            results = apiResults.map((v: any) => ({
              id: v.id,
              name: v.name,
              slug: v.slug || v.name?.toLowerCase().replace(/[^a-z0-9]+/g, "-") || "",
              publisher: v.publisher?.name || null,
              start_year: v.start_year || null,
              issue_count: v.count_of_issues || null,
              image_url: v.image?.small_url || v.image?.super_url || null,
              deck: v.deck || null,
            }));

            source = "live";
          }
        }
      }
    }

    return new Response(
      JSON.stringify({
        results: results.slice(0, limit),
        query: normalizedQuery,
        filters: { publisher, year },
        source,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("Volume suggest error:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Unknown error",
        results: [],
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
