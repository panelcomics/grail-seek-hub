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
  
  // FEATURE_IMAGE_COMPRESSION: Client-side compression happens before this function
  // This function receives pre-compressed images and thumbnails from uploadImage.ts
  
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

    // Check for optional preview/thumbnail
    const preview = formData.get('preview') as File | null;

    // Structured logging
    const logEntry = {
      when: new Date().toISOString(),
      userId,
      fieldName,
      size: file.size,
      type: file.type,
      name: file.name,
      hasPreview: !!preview,
      previewSize: preview?.size
    };
    console.log('[upload-scanner-image]', JSON.stringify(logEntry));

    // Generate upload path
    const timestamp = Date.now();
    const baseName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_').replace(/\.[^.]+$/, '');
    const compressedPath = `uploads/${userId}/${timestamp}-${baseName}-compressed.jpg`;

    console.log('Uploading compressed image to external Supabase:', compressedPath);

    // Upload compressed image directly to external Supabase Storage using service role
    const uploadUrl = `${externalUrl}/storage/v1/object/${bucket}/${compressedPath}`;
    const fileBuffer = await file.arrayBuffer();

    const uploadResponse = await fetch(uploadUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${externalServiceRole}`,
        'x-upsert': 'true',
        'Content-Type': 'image/jpeg',
      },
      body: fileBuffer,
    });

    if (!uploadResponse.ok) {
      const errorText = await uploadResponse.text();
      console.error('Upload failed:', { status: uploadResponse.status, body: errorText, timestamp: new Date().toISOString() });
      return new Response(
        JSON.stringify({ error: 'Upload failed. Please try again.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Generate public URL for compressed image
    const publicUrl = `${externalUrl}/storage/v1/object/public/${bucket}/${compressedPath}`;
    
    // Upload preview/thumbnail if provided
    let previewPath = null;
    let previewUrl = null;
    
    if (preview) {
      previewPath = `thumbnails/${userId}/${timestamp}-${baseName}-thumb.jpg`;
      const previewUploadUrl = `${externalUrl}/storage/v1/object/${bucket}/${previewPath}`;
      const previewBuffer = await preview.arrayBuffer();
      
      console.log('Uploading thumbnail to external Supabase:', previewPath);
      
      const previewResponse = await fetch(previewUploadUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${externalServiceRole}`,
          'x-upsert': 'true',
          'Content-Type': 'image/jpeg',
        },
        body: previewBuffer,
      });
      
      if (previewResponse.ok) {
        previewUrl = `${externalUrl}/storage/v1/object/public/${bucket}/${previewPath}`;
      } else {
        console.warn('Preview upload failed, continuing without it');
      }
    }
    
    const elapsed = Date.now() - startTime;
    
    const response = {
      ok: true,
      path: compressedPath,
      publicUrl,
      previewPath,
      previewUrl,
      sizes: {
        originalKB: Math.round(file.size / 1024),
        compressedKB: Math.round(file.size / 1024),
        previewKB: preview ? Math.round(preview.size / 1024) : 0
      }
    };
    
    console.log('[upload-scanner-image] Success:', { ...response, elapsed: `${elapsed}ms` });

    return new Response(
      JSON.stringify(response),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    const elapsed = Date.now() - startTime;
    console.error('[upload-scanner-image] Error:', { 
      error: error instanceof Error ? error.message : 'Unknown',
      stack: error instanceof Error ? error.stack : undefined,
      elapsed: `${elapsed}ms`,
      timestamp: new Date().toISOString()
    });
    return new Response(
      JSON.stringify({ error: 'Upload failed. Please try again.' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
