import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// SHA-1 hash utility (same as client)
async function matchHash(title: string, issue?: string | null, publisher?: string | null): Promise<string> {
  const normalize = (s: string) => s.toLowerCase().trim().replace(/[^\w\s]/g, '');
  const parts = [
    normalize(title),
    issue ? normalize(issue) : '',
    publisher ? normalize(publisher) : ''
  ];
  const combined = parts.join('|');
  
  const encoder = new TextEncoder();
  const data_buf = encoder.encode(combined);
  const hashBuffer = await crypto.subtle.digest('SHA-1', data_buf);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  
  return hashHex.substring(0, 12);
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get user from auth
    const authHeader = req.headers.get('Authorization');
    let userId = null;
    if (authHeader) {
      const { data: { user } } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''));
      userId = user?.id;
    }

    const body = await req.json();
    const { title, issue, publisher, year, variant_description, cover_url, source_id, source = 'comicvine' } = body;

    if (!title) {
      return new Response(
        JSON.stringify({ ok: false, error: 'Title is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Generate hash
    const hash = await matchHash(title, issue, publisher);

    // Insert verified match (ignore duplicates)
    const { error } = await supabase
      .from('verified_matches')
      .insert([{
        hash,
        source,
        source_id,
        title,
        issue,
        publisher,
        year,
        variant_description,
        cover_url,
        created_by: userId
      }])
      .select()
      .single();

    // Ignore duplicate key errors
    if (error && !error.message.includes('duplicate key')) {
      console.error('Error saving verified match:', error);
    }

    return new Response(
      JSON.stringify({ ok: true, hash }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Error in save-verified:', error);
    return new Response(
      JSON.stringify({ ok: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
