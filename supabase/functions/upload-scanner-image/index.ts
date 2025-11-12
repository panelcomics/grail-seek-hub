import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();
  
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

    // Resolve user ID from JWT or fallback header
    let userId = 'public';
    const authHeader = req.headers.get('Authorization');
    const userIdHeader = req.headers.get('x-user-id');

    if (authHeader) {
      try {
        const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
        const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY')!;
        const supabase = createClient(supabaseUrl, supabaseKey, {
          global: { headers: { Authorization: authHeader } }
        });
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (!authError && user) {
          userId = user.id;
        }
      } catch (e) {
        console.warn('Auth verification failed, using fallback:', e);
      }
    }

    // Fallback to x-user-id header if JWT failed
    if (userId === 'public' && userIdHeader) {
      userId = userIdHeader;
    }

    // Parse multipart form data
    const formData = await req.formData();
    
    // Accept both 'image' and 'file', prefer 'image'
    let file = formData.get('image') as File | null;
    let fieldName = 'image';
    
    if (!file) {
      file = formData.get('file') as File | null;
      fieldName = 'file';
    }

    if (!file) {
      console.error('No file provided in form data');
      return new Response(
        JSON.stringify({ error: 'No file provided. Expected "image" or "file" field.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Structured logging
    const logEntry = {
      when: new Date().toISOString(),
      userId,
      fieldName,
      size: file.size,
      type: file.type,
      name: file.name
    };
    console.log('[upload-scanner-image]', JSON.stringify(logEntry));

    // Generate upload path
    const timestamp = Date.now();
    const originalName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const path = `uploads/${userId}/${timestamp}-${originalName}`;

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
    const elapsed = Date.now() - startTime;
    
    console.log('[upload-scanner-image] Success:', { path, publicUrl, elapsed: `${elapsed}ms` });

    return new Response(
      JSON.stringify({ path, publicUrl }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    const elapsed = Date.now() - startTime;
    console.error('[upload-scanner-image] Error:', { error: error.message, elapsed: `${elapsed}ms` });
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
