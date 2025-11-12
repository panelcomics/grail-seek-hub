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
    console.log('[TEST-UPLOAD] Starting test upload');

    // Get external Supabase credentials
    const externalUrl = Deno.env.get('VITE_EXTERNAL_SUPABASE_URL');
    const externalServiceRole = Deno.env.get('EXTERNAL_SUPABASE_SERVICE_ROLE');

    if (!externalUrl || !externalServiceRole) {
      const error = 'Missing VITE_EXTERNAL_SUPABASE_URL or EXTERNAL_SUPABASE_SERVICE_ROLE';
      console.error('[TEST-UPLOAD]', error);
      return new Response(
        JSON.stringify({ ok: false, message: error }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[TEST-UPLOAD] External URL:', externalUrl);

    // Create Supabase client with service role
    const supabase = createClient(externalUrl, externalServiceRole, {
      auth: { persistSession: false }
    });

    // Create a tiny 1x1 PNG buffer
    // PNG signature + IHDR chunk for 1x1 transparent pixel
    const pngBuffer = new Uint8Array([
      0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, // PNG signature
      0x00, 0x00, 0x00, 0x0D, // IHDR length
      0x49, 0x48, 0x44, 0x52, // IHDR
      0x00, 0x00, 0x00, 0x01, // width: 1
      0x00, 0x00, 0x00, 0x01, // height: 1
      0x08, 0x06, 0x00, 0x00, 0x00, // bit depth, color type, etc.
      0x1F, 0x15, 0xC4, 0x89, // CRC
      0x00, 0x00, 0x00, 0x0A, // IDAT length
      0x49, 0x44, 0x41, 0x54, // IDAT
      0x78, 0x9C, 0x63, 0x00, 0x01, 0x00, 0x00, 0x05, 0x00, 0x01,
      0x0D, 0x0A, 0x2D, 0xB4, // IDAT data + CRC
      0x00, 0x00, 0x00, 0x00, // IEND length
      0x49, 0x45, 0x4E, 0x44, // IEND
      0xAE, 0x42, 0x60, 0x82  // CRC
    ]);

    const timestamp = Date.now();
    const path = `probes/test-${timestamp}.png`;

    console.log('[TEST-UPLOAD] Uploading to path:', path);

    // Upload the file
    const { data: uploadData, error: uploadError } = await supabase
      .storage
      .from('images')
      .upload(path, pngBuffer, {
        contentType: 'image/png',
        upsert: true
      });

    if (uploadError) {
      console.error('[TEST-UPLOAD] Upload error:', uploadError);
      return new Response(
        JSON.stringify({
          ok: false,
          message: uploadError.message,
          stack: uploadError.stack
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[TEST-UPLOAD] Upload successful:', uploadData);

    // Get public URL
    const { data: urlData } = supabase
      .storage
      .from('images')
      .getPublicUrl(path);

    console.log('[TEST-UPLOAD] Public URL:', urlData.publicUrl);

    return new Response(
      JSON.stringify({ ok: true, url: urlData.publicUrl }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('[TEST-UPLOAD] Exception:', error);
    return new Response(
      JSON.stringify({
        ok: false,
        message: error.message || 'Internal server error',
        stack: error.stack
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
