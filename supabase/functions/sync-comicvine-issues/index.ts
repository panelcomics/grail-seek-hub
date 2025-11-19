import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  let volumeOffset = 0;
  let volumeLimit = 1;

  try {
    const body = await req.text().then(text => text ? JSON.parse(text) : {}).catch(() => ({}));

    volumeOffset = Number(body.volumeOffset) || 0;
    volumeLimit = Math.min(Math.max(Number(body.volumeLimit) || 1, 1), 5);

    const apiKey = Deno.env.get('COMICVINE_API_KEY');
    if (!apiKey) throw new Error('Missing COMICVINE_API_KEY');

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // 1) Load a small slice of volumes to process
    const { data: volumes, error: volError } = await supabase
      .from('comicvine_volumes')
      .select('id, name')
      .order('id', { ascending: true })
      .range(volumeOffset, volumeOffset + volumeLimit - 1);

    if (volError) throw volError;

    if (!volumes || volumes.length === 0) {
      return new Response(JSON.stringify({
        success: true,
        volumesProcessed: 0,
        issuesProcessed: 0,
        done: true,
        message: 'No volumes found for this offset/limit',
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    let totalIssues = 0;

    // 2) For each volume, fetch up to 100 issues from ComicVine
    for (const vol of volumes) {
      const issuesUrl =
        `https://comicvine.gamespot.com/api/issues/` +
        `?api_key=${apiKey}` +
        `&format=json` +
        `&filter=volume:${vol.id}` +
        `&limit=100` +
        `&field_list=id,volume,issue_number,name,cover_date,image,writer,artist`;

      const res = await fetch(issuesUrl, { headers: { 'User-Agent': 'GrailSeeker Scanner' } });
      if (!res.ok) throw new Error(`ComicVine issues error ${res.status} for volume ${vol.id}`);

      const data = await res.json();
      const issues = data?.results || [];

      if (issues.length === 0) continue;

      const toUpsert = issues.map((i: any) => ({
        id: i.id,
        volume_id: i.volume?.id ?? vol.id,
        issue_number: i.issue_number?.toString() ?? null,
        name: i.name ?? null,
        cover_date: i.cover_date ?? null,
        image_url: i.image?.small_url ?? null,
        writer: i.writer ?? null,
        artist: i.artist ?? null,
        last_synced_at: new Date().toISOString(),
      }));

      const { error: issuesError } = await supabase
        .from('comicvine_issues')
        .upsert(toUpsert, { onConflict: 'id' });

      if (issuesError) throw issuesError;

      totalIssues += issues.length;
    }

    return new Response(JSON.stringify({
      success: true,
      volumeOffset,
      volumeLimit,
      volumesProcessed: volumes.length,
      issuesProcessed: totalIssues,
      nextVolumeOffset: volumeOffset + volumes.length,
      done: volumes.length < volumeLimit,
      message: `Synced issues for ${volumes.length} volume(s) from offset ${volumeOffset}`,
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error('ComicVine issue sync error:', error);
    return new Response(JSON.stringify({
      success: false,
      message: error.message || 'Unknown error',
      volumeOffset,
      volumeLimit,
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
