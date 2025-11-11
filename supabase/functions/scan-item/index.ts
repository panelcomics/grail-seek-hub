// supabase/functions/scan-item/index.ts
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-client-info, apikey',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

// Helper to compute SHA-256 hash
async function computeSHA256(data: string): Promise<string> {
  const encoder = new TextEncoder();
  const buffer = encoder.encode(data);
  const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// Helper to check rate limit
async function checkRateLimit(supabase: any, userId: string | null, ipAddress: string): Promise<boolean> {
  const identifier = userId || ipAddress;
  const windowMinutes = 1;
  const maxScans = 10;

  // Clean old windows first
  const cutoff = new Date(Date.now() - windowMinutes * 60 * 1000).toISOString();
  await supabase.from('scan_rate_limits').delete().lt('window_start', cutoff);

  // Check current window
  const { data: existing } = await supabase
    .from('scan_rate_limits')
    .select('*')
    .or(`user_id.eq.${userId},ip_address.eq.${ipAddress}`)
    .gte('window_start', cutoff)
    .single();

  if (existing) {
    if (existing.scan_count >= maxScans) {
      return false; // Rate limit exceeded
    }
    // Increment count
    await supabase
      .from('scan_rate_limits')
      .update({ scan_count: existing.scan_count + 1, updated_at: new Date().toISOString() })
      .eq('id', existing.id);
  } else {
    // Create new window
    await supabase.from('scan_rate_limits').insert({
      user_id: userId,
      ip_address: ipAddress,
      scan_count: 1,
      window_start: new Date().toISOString(),
    });
  }

  return true;
}

serve(async (req) => {
  console.log('Function invoked:', req.method, req.url);
  
  // Handle OPTIONS for CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (req.method !== "POST") {
      console.log('Method not POST');
      return new Response(JSON.stringify({ ok: false, error: "Method not allowed" }), {
        status: 405,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Initialize Supabase client with service role
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get user ID from auth header if available
    const authHeader = req.headers.get('Authorization');
    let userId: string | null = null;
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      const { data: { user } } = await supabase.auth.getUser(token);
      userId = user?.id || null;
    }

    // Get IP address for rate limiting
    const ipAddress = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown';

    // Check rate limit
    const allowed = await checkRateLimit(supabase, userId, ipAddress);
    if (!allowed) {
      console.log('Rate limit exceeded');
      return new Response(
        JSON.stringify({ 
          ok: false, 
          error: "Rate limit exceeded. Please wait a minute and try again (max 10 scans/min)." 
        }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Parse and validate request body
    let body;
    try {
      body = await req.json();
    } catch (e) {
      console.error('Failed to parse request body:', e);
      return new Response(
        JSON.stringify({ ok: false, error: "No scan image received. Please try again." }), 
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log('Body received:', { hasImage: !!body.imageBase64, length: body.imageBase64?.length });
    const { imageBase64 } = body;
    
    if (!imageBase64 || typeof imageBase64 !== "string" || imageBase64.trim().length === 0) {
      console.log('Invalid imageBase64:', { exists: !!imageBase64, type: typeof imageBase64, length: imageBase64?.length });
      return new Response(
        JSON.stringify({ ok: false, error: "No scan image received. Please try again." }), 
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Compute SHA-256 hash for caching
    const imageSha256 = await computeSHA256(imageBase64);
    console.log('Image SHA-256:', imageSha256);

    // Check cache (7 days TTL)
    const cacheTTLDays = 7;
    const cacheMinDate = new Date(Date.now() - cacheTTLDays * 24 * 60 * 60 * 1000).toISOString();
    const { data: cachedResult } = await supabase
      .from('scan_cache')
      .select('*')
      .eq('image_sha256', imageSha256)
      .gte('created_at', cacheMinDate)
      .single();

    if (cachedResult) {
      console.log('Cache hit - returning cached result');
      return new Response(
        JSON.stringify({
          ok: true,
          ocrPreview: cachedResult.ocr?.slice(0, 120) + (cachedResult.ocr?.length > 120 ? "..." : ""),
          comicvineResults: cachedResult.comicvine_results || [],
          cached: true,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log('Cache miss - calling APIs');

    const GOOGLE_VISION_API_KEY = Deno.env.get("GOOGLE_VISION_API_KEY");
    const COMICVINE_API_KEY = Deno.env.get("COMICVINE_API_KEY");
    console.log('Keys check:', { vision: !!GOOGLE_VISION_API_KEY, comicvine: !!COMICVINE_API_KEY });

    if (!GOOGLE_VISION_API_KEY || !COMICVINE_API_KEY) {
      console.log('Missing secrets');
      return new Response(JSON.stringify({ ok: false, error: "Missing API secrets – check Cloud → Secrets" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ---------- Google Vision OCR ----------
    console.log('Calling Google Vision...');
    const visionRes = await fetch(
      `https://vision.googleapis.com/v1/images:annotate?key=${GOOGLE_VISION_API_KEY}`,
      {
        method: "POST",
        body: JSON.stringify({
          requests: [{
            image: { content: imageBase64 },
            features: [{ type: "TEXT_DETECTION" }],
          }],
        }),
        headers: { "Content-Type": "application/json" },
      },
    );

    console.log('Vision response status:', visionRes.status);
    const visionData = await visionRes.json();
    if (!visionRes.ok || visionData.error) {
      console.error('Vision error:', visionData.error);
      throw new Error(visionData.error?.message ?? "Vision API failed");
    }

    const ocrText = visionData.responses?.[0]?.fullTextAnnotation?.text ?? "";
    console.log('OCR text preview:', ocrText.substring(0, 50));
    
    // Clean OCR text aggressively: remove timestamps, special chars, extra whitespace
    let cleaned = ocrText
      .replace(/\d{1,2}:\d{2}(?::\d{2})?\s*(?:AM|PM)?/gi, '') // Remove timestamps
      .replace(/[^\w\s]/g, " ") // Replace special chars with spaces
      .replace(/\s+/g, " ") // Collapse whitespace
      .trim();
    
    // Remove common UI artifacts
    cleaned = cleaned.replace(/\b(GS|Scan|Camera|Upload|Photo|Capture)\b/gi, '').trim();

    console.log('Cleaned query for ComicVine:', cleaned);
    const cvRes = await fetch(
      `https://comicvine.gamespot.com/api/search/?api_key=${COMICVINE_API_KEY}&format=json&query=${encodeURIComponent(cleaned)}&resources=issue&limit=10`,
      {
        headers: {
          "User-Agent": "GrailSeeker/1.0 (panelcomics.com)",
        },
      }
    );

    console.log('ComicVine response status:', cvRes.status);
    const cvData = await cvRes.json();
    console.log('ComicVine data:', JSON.stringify(cvData).substring(0, 200));
    
    // ComicVine uses status_code: 1 for success (not error field)
    if (!cvRes.ok || cvData.status_code !== 1) {
      console.error('ComicVine failed:', { status_code: cvData.status_code, error: cvData.error });
      throw new Error(cvData.error ?? "ComicVine API failed");
    }

    const results = (cvData.results ?? []).map((i: any) => ({
      id: i.id ?? null,
      name: i.name ?? "Unknown",
      issue_number: i.issue_number ?? "",
      volume: i.volume?.name ?? "Unknown",
      cover_date: i.cover_date ?? "",
      image: i.image?.small_url ?? i.image?.thumb_url ?? null,
    }));

    console.log('Success – results count:', results.length);

    // Store in cache
    await supabase.from('scan_cache').upsert({
      image_sha256: imageSha256,
      user_id: userId,
      ocr: ocrText,
      comicvine_results: results,
    }, { onConflict: 'image_sha256' });
    console.log('Cached result for future requests');

    return new Response(
      JSON.stringify({
        ok: true,
        ocrPreview: ocrText.slice(0, 120) + (ocrText.length > 120 ? "..." : ""),
        comicvineResults: results,
        cached: false,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error('Function error:', err);
    const errorMessage = err instanceof Error ? err.message : "Unknown error";
    return new Response(
      JSON.stringify({ 
        ok: false, 
        error: "Scan failed. Please retake the photo or try again.",
        details: errorMessage 
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
