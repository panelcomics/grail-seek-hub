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

    // Fetch issues for this volume
    const { data: issues, error } = await supabase
      .from('comicvine_issues')
      .select('*')
      .eq('volume_id', parseInt(volumeId));

    if (error) {
      throw error;
    }

    // Sort issues by issue_number (try numeric sorting)
    const sortedIssues = (issues || []).sort((a, b) => {
      const aNum = parseFloat(a.issue_number || '0');
      const bNum = parseFloat(b.issue_number || '0');
      return aNum - bNum;
    });

    return new Response(
      JSON.stringify({
        volumeId: parseInt(volumeId),
        issues: sortedIssues,
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
