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

  let limit = 10;
  let offset = 0;

  try {
    const body = await req.text().then(text => text ? JSON.parse(text) : {}).catch(() => ({}));

    limit = Math.min(Number(body.limit) || 10, 100);
    offset = Number(body.offset) || 0;

    const apiKey = Deno.env.get('COMICVINE_API_KEY');
    if (!apiKey) throw new Error('Missing COMICVINE_API_KEY');

    const url =
      `https://comicvine.gamespot.com/api/volumes/` +
      `?api_key=${apiKey}` +
      `&format=json` +
      `&limit=${limit}` +
      `&offset=${offset}` +
      `&field_list=id,name,start_year,publisher,image,count_of_issues`;

    const res = await fetch(url, { headers: { 'User-Agent': 'GrailSeeker Scanner' } });
    if (!res.ok) throw new Error(`ComicVine returned ${res.status}`);

    const data = await res.json();
    const volumes = data?.results || [];

    if (volumes.length > 0) {
      const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
      const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
      const supabase = createClient(supabaseUrl, supabaseKey);

      const toUpsert = volumes.map((v: any) => ({
        id: v.id,
        name: v.name || null,
        slug: (v.name || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''),
        start_year: v.start_year || null,
        publisher: v.publisher?.name || null,
        image_url: v.image?.small_url || null,
        issue_count: v.count_of_issues || 0,
        last_synced_at: new Date().toISOString(),
      }));

      const { error } = await supabase
        .from('comicvine_volumes')
        .upsert(toUpsert, { onConflict: 'id' });

      if (error) throw new Error(error.message);
    }

    return new Response(JSON.stringify({
      success: true,
      limit,
      offset,
      processed: volumes.length,
      done: volumes.length < limit,
      message: `Synced ${volumes.length} volumes (offset ${offset})`,
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    return new Response(JSON.stringify({
      success: false,
      message: error.message || 'Unknown error',
      limit,
      offset,
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
