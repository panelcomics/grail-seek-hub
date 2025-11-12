import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const externalUrl = Deno.env.get('VITE_EXTERNAL_SUPABASE_URL');
    const externalKey = Deno.env.get('VITE_EXTERNAL_SUPABASE_ANON_KEY');

    if (!externalUrl || !externalKey) {
      throw new Error('External Supabase credentials not configured');
    }

    const externalSupabase = createClient(externalUrl, externalKey);

    const formData = await req.formData();
    const file = formData.get('file') as File;
    const filePath = formData.get('filePath') as string;

    if (!file || !filePath) {
      return new Response(
        JSON.stringify({ error: 'Missing file or filePath' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Uploading to external Supabase:', filePath);

    const fileBuffer = await file.arrayBuffer();
    const { data, error } = await externalSupabase.storage
      .from('images')
      .upload(filePath, fileBuffer, {
        contentType: file.type,
        upsert: true,
      });

    if (error) {
      console.error('Upload error:', error);
      throw error;
    }

    const { data: urlData } = externalSupabase.storage
      .from('images')
      .getPublicUrl(filePath);

    console.log('Upload successful:', urlData.publicUrl);

    return new Response(
      JSON.stringify({ 
        path: data.path,
        publicUrl: urlData.publicUrl 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Upload proxy error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
