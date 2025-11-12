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
    // Get external Supabase credentials
    const externalUrl = Deno.env.get('VITE_EXTERNAL_SUPABASE_URL');
    const externalServiceRole = Deno.env.get('EXTERNAL_SUPABASE_SERVICE_ROLE');
    const bucket = 'images';

    if (!externalUrl || !externalServiceRole) {
      console.error('Missing external Supabase credentials');
      return new Response(
        JSON.stringify({ error: 'External storage not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify user is authenticated with main Supabase
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Not authenticated - please sign in' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create main Supabase client to verify auth
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } }
    });

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      console.error('Auth verification failed:', authError);
      return new Response(
        JSON.stringify({ error: 'Invalid session - please sign in again' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse multipart form data
    const formData = await req.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return new Response(
        JSON.stringify({ error: 'No file provided' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Generate upload path
    const timestamp = Date.now();
    const originalName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const path = `uploads/${user.id}/${timestamp}-${originalName}`;

    console.log('Uploading to external Supabase:', path);

    // Upload directly to external Supabase Storage using service role
    const uploadUrl = `${externalUrl}/storage/v1/object/${bucket}/${path}`;
    const fileBuffer = await file.arrayBuffer();

    const uploadResponse = await fetch(uploadUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${externalServiceRole}`,
        'x-upsert': 'true',
        'Content-Type': file.type || 'application/octet-stream',
      },
      body: fileBuffer,
    });

    if (!uploadResponse.ok) {
      const errorText = await uploadResponse.text();
      console.error('Upload failed:', uploadResponse.status, errorText);
      return new Response(
        JSON.stringify({ 
          error: `Upload failed: ${uploadResponse.status} ${uploadResponse.statusText}`,
          details: errorText 
        }),
        { status: uploadResponse.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Generate public URL
    const publicUrl = `${externalUrl}/storage/v1/object/public/${bucket}/${path}`;
    console.log('Upload successful - path:', path, 'publicUrl:', publicUrl);

    return new Response(
      JSON.stringify({ path, publicUrl }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Upload proxy error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
