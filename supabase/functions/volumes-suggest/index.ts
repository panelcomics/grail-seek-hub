import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * Search local ComicVine volume cache
 * 
 * GET /volumes-suggest?q=amazing spider man&publisher=Marvel&year=1974
 */
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const query = url.searchParams.get('q') || '';
    const publisher = url.searchParams.get('publisher') || null;
    const year = url.searchParams.get('year') ? parseInt(url.searchParams.get('year')!) : null;
    const limit = parseInt(url.searchParams.get('limit') || '20');

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Clean query - extract title without issue number
    const cleanQuery = query
      .toLowerCase()
      .replace(/#\d+/g, '') // Remove issue numbers like #1, #129
      .replace(/[#()]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    // Build query with fuzzy search and filters
    let dbQuery = supabase
      .from('comicvine_volumes')
      .select('id, name, slug, publisher, start_year, issue_count, image_url, deck');

    // Filter by name/slug if query provided
    if (cleanQuery) {
      dbQuery = dbQuery.or(`name.ilike.%${cleanQuery}%,slug.ilike.%${cleanQuery}%`);
    }

    // Filter by publisher if provided
    if (publisher) {
      dbQuery = dbQuery.ilike('publisher', `%${publisher}%`);
    }

    // Fetch all matching results (we'll sort them properly below)
    dbQuery = dbQuery.limit(100);

    const { data: volumes, error } = await dbQuery;

    if (error) {
      throw error;
    }

    // Sort results by relevance
    let results = volumes || [];
    
    if (cleanQuery && results.length > 0) {
      // Score each result by text relevance
      const scoredResults = results.map(vol => {
        const nameLower = vol.name.toLowerCase();
        const slugLower = vol.slug.toLowerCase();
        
        // Calculate relevance score (lower = better)
        let score = 1000;
        
        // Exact match (best)
        if (nameLower === cleanQuery || slugLower === cleanQuery) {
          score = 0;
        }
        // Starts with query (very good)
        else if (nameLower.startsWith(cleanQuery) || slugLower.startsWith(cleanQuery)) {
          score = 10;
        }
        // Contains query as whole word (good)
        else if (nameLower.includes(` ${cleanQuery} `) || nameLower.startsWith(`${cleanQuery} `)) {
          score = 20;
        }
        // Contains query anywhere (okay)
        else if (nameLower.includes(cleanQuery) || slugLower.includes(cleanQuery)) {
          score = 30;
        }
        
        // Add length penalty (prefer shorter, more specific titles)
        score += vol.name.length / 10;
        
        // Add year bonus if provided (prefer closer years)
        if (year && vol.start_year) {
          score += Math.abs(vol.start_year - year);
        } else if (vol.start_year) {
          // Slight preference for older/established series
          score += Math.max(0, 2024 - vol.start_year) / 100;
        }
        
        // Use issue_count as final tiebreaker (more issues = slight bonus)
        score -= (vol.issue_count || 0) / 1000;
        
        return { ...vol, score };
      });
      
      // Sort by score (lower = more relevant)
      scoredResults.sort((a: any, b: any) => a.score - b.score);
      
      // Remove score from results and take top results
      results = scoredResults.map(({ score, ...vol }: any) => vol).slice(0, limit);
    } else {
      // No query - just sort by issue count descending
      results.sort((a, b) => (b.issue_count || 0) - (a.issue_count || 0));
      results = results.slice(0, limit);
    }

    return new Response(
      JSON.stringify({
        results: results.slice(0, limit),
        query: cleanQuery,
        filters: { publisher, year },
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Volume suggest error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error', results: [] }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
