import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ComicQuery {
  series: string;
  issue: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { comics } = await req.json() as { comics: ComicQuery[] };

    const COMICVINE_API_KEY = Deno.env.get('COMICVINE_API_KEY');
    
    if (!COMICVINE_API_KEY) {
      console.warn('COMICVINE_API_KEY not configured, returning empty results');
      return new Response(
        JSON.stringify({ results: comics.map(() => null) }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Fetching covers for comics:', comics);

    // Fetch covers for each comic
    const results = await Promise.all(
      comics.map(async (comic) => {
        try {
          const query = `${comic.series} ${comic.issue}`.trim();
          const params = new URLSearchParams({
            api_key: COMICVINE_API_KEY,
            format: 'json',
            query: query,
            resources: 'issue',
            limit: '1',
          });

          const response = await fetch(
            `https://comicvine.gamespot.com/api/search/?${params}`,
            {
              headers: {
                'User-Agent': 'GrailSeeker/1.0',
              },
            }
          );

          if (!response.ok) {
            console.error(`ComicVine API error for ${query}:`, response.status);
            return null;
          }

          const data = await response.json();
          
          if (data.status_code !== 1 || !data.results || data.results.length === 0) {
            console.log(`No results found for: ${query}`);
            return null;
          }

          const issue = data.results[0];
          return {
            title: comic.series,
            issue: comic.issue,
            coverUrl: issue.image?.medium_url || issue.image?.small_url || null,
            volumeName: issue.volume?.name || null,
          };
        } catch (error) {
          console.error(`Error fetching ${comic.series} ${comic.issue}:`, error);
          return null;
        }
      })
    );

    return new Response(
      JSON.stringify({ results }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in fetch-comic-covers:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
