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

    // Clean query
    const cleanQuery = query
      .toLowerCase()
      .replace(/[#()]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    // Build query with fuzzy search and filters
    let dbQuery = supabase
      .from('comicvine_volumes')
      .select('id, name, slug, publisher, start_year, issue_count, image_url, deck');

    // Use trigram similarity search for fuzzy matching
    if (cleanQuery) {
      dbQuery = dbQuery.or(`name.ilike.%${cleanQuery}%,slug.ilike.%${cleanQuery}%`);
    }

    // Filter by publisher if provided
    if (publisher) {
      dbQuery = dbQuery.ilike('publisher', `%${publisher}%`);
    }

    // Order by relevance and year proximity
    if (year) {
      // Boost volumes with start_year close to target year
      dbQuery = dbQuery.order('start_year', { ascending: false });
    } else {
      // Default: order by issue count (popularity proxy)
      dbQuery = dbQuery.order('issue_count', { ascending: false });
    }

    dbQuery = dbQuery.limit(limit);

    const { data: volumes, error } = await dbQuery;

    if (error) {
      throw error;
    }

    // Post-process: score by year proximity if year provided
    let results = volumes || [];
    if (year && results.length > 0) {
      results = results
        .map(vol => ({
          ...vol,
          yearScore: vol.start_year ? Math.abs(vol.start_year - year) : 999,
        }))
        .sort((a, b) => a.yearScore - b.yearScore)
        .map(({ yearScore, ...vol }) => vol);
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
