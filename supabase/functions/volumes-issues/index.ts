import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * Get all issues for a specific volume
 * 
 * GET /volumes-issues?volumeId=12345
 */
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const volumeId = url.searchParams.get('volumeId');

    if (!volumeId) {
      return new Response(
        JSON.stringify({ error: 'volumeId parameter required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch issues from local cache first
    const { data: issues, error } = await supabase
      .from('comicvine_issues')
      .select('*')
      .eq('volume_id', parseInt(volumeId));

    if (error) {
      throw error;
    }

    let finalIssues = issues || [];

    // If no local issues, fall back to ComicVine API
    if (finalIssues.length === 0) {
      console.log(`No local issues for volume ${volumeId}, fetching from ComicVine API`);
      
      const comicVineKey = Deno.env.get('COMICVINE_API_KEY');
      if (!comicVineKey) {
        console.error('COMICVINE_API_KEY not configured');
      } else {
        try {
          const cvUrl = `https://comicvine.gamespot.com/api/issues/?api_key=${comicVineKey}&format=json&filter=volume:${volumeId}&field_list=id,volume,issue_number,name,cover_date,image,person_credits&limit=100`;
          const cvResponse = await fetch(cvUrl, {
            headers: { 'User-Agent': 'Lovable-Scanner/1.0' }
          });

          if (cvResponse.ok) {
            const cvData = await cvResponse.json();
            if (cvData.error === 'OK' && cvData.results) {
              finalIssues = cvData.results.map((issue: any) => {
                // Extract writer and artist from person_credits
                let writer = null;
                let artist = null;
                if (issue.person_credits && Array.isArray(issue.person_credits)) {
                  const writers = issue.person_credits.filter((p: any) => 
                    p.role && p.role.toLowerCase().includes('writer')
                  );
                  const artists = issue.person_credits.filter((p: any) => 
                    p.role && (p.role.toLowerCase().includes('artist') || p.role.toLowerCase().includes('penciler'))
                  );
                  if (writers.length > 0) writer = writers.map((w: any) => w.name).join(', ');
                  if (artists.length > 0) artist = artists.map((a: any) => a.name).join(', ');
                }

                return {
                  id: issue.id,
                  volume_id: issue.volume?.id || parseInt(volumeId),
                  issue_number: issue.issue_number,
                  name: issue.name,
                  cover_date: issue.cover_date,
                  image_url: issue.image?.medium_url || issue.image?.small_url,
                  writer,
                  artist,
                  key_notes: null,
                  last_synced_at: null
                };
              });
            }
          }
        } catch (cvError) {
          console.error('ComicVine API error:', cvError);
        }
      }
    }

    // Sort issues by issue_number (try numeric sorting)
    const sortedIssues = finalIssues.sort((a, b) => {
      const aNum = parseFloat(a.issue_number || '0');
      const bNum = parseFloat(b.issue_number || '0');
      return aNum - bNum;
    });

    return new Response(
      JSON.stringify({
        volumeId: parseInt(volumeId),
        issues: sortedIssues,
        source: issues && issues.length > 0 ? 'cache' : 'live'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Volume issues error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error', issues: [] }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
