// supabase/functions/scan-item/index.ts
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { Image } from "https://deno.land/x/imagescript@1.2.15/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-client-info, apikey',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

// Helper to resize image to max 800px for faster OCR
async function resizeImageForOCR(base64Image: string): Promise<string> {
  try {
    const imageBytes = Uint8Array.from(atob(base64Image), c => c.charCodeAt(0));
    const image = await Image.decode(imageBytes);
    
    const maxDimension = 800;
    if (image.width > maxDimension || image.height > maxDimension) {
      const scale = maxDimension / Math.max(image.width, image.height);
      const newWidth = Math.floor(image.width * scale);
      const newHeight = Math.floor(image.height * scale);
      
      console.log(`Resizing image: ${image.width}x${image.height} -> ${newWidth}x${newHeight}`);
      image.resize(newWidth, newHeight);
    }
    
    const resizedBytes = await image.encodeJPEG(85);
    return btoa(String.fromCharCode(...resizedBytes));
  } catch (err) {
    console.error('Image resize failed, using original:', err);
    return base64Image;
  }
}

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
  const startTime = Date.now();
  console.log('[SCAN-ITEM] Function invoked:', req.method, req.url);
  
  // Handle OPTIONS for CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (req.method !== "POST") {
      console.log('[SCAN-ITEM] Method not POST');
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
      console.error('[SCAN-ITEM] Failed to parse request body:', e);
      return new Response(
        JSON.stringify({ ok: false, error: "No scan image received. Please try again." }), 
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log('[SCAN-ITEM] Body received:', { 
      hasImage: !!body.imageBase64, 
      hasQuery: !!body.textQuery,
      hasBarcode: !!body.barcodeData,
      imageSize: body.imageBase64 ? body.imageBase64.length : 0
    });
    const { imageBase64, textQuery, barcodeData } = body;
    
    // Accept imageBase64, textQuery, or barcodeData
    if (!imageBase64 && !textQuery && !barcodeData) {
      console.log('[SCAN-ITEM] No image, text query, or barcode provided');
      return new Response(
        JSON.stringify({ ok: false, error: "No scan data received. Please try again." }), 
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Priority 1: If barcode/cert number provided, search by that first
    if (barcodeData) {
      console.log('[SCAN-ITEM] Barcode detected:', barcodeData);
      // TODO: Implement cert number search in ComicVine API
      // For now, treat it as a text query
    }

    // Compute SHA-256 hash for caching (only if image provided)
    let imageSha256: string | null = null;
    if (imageBase64) {
      imageSha256 = await computeSHA256(imageBase64);
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
        const cachedOcr = cachedResult.ocr || "";
        const issueMatch = cachedOcr.match(/#?\s*(\d+)/) || cachedOcr.match(/No\.?\s*(\d+)/i);
        const issue_number = issueMatch ? issueMatch[1] : "";
        const yearMatch = cachedOcr.match(/\b(19\d{2}|20\d{2})\b/);
        const year = yearMatch ? parseInt(yearMatch[1]) : null;
        
        return new Response(
          JSON.stringify({
            ok: true,
            extracted: { series_title: "", issue_number, year },
            comicvineResults: cachedResult.comicvine_results || [],
            ocrText: cachedOcr, // Raw OCR for debug
            cvQuery: '', // Not available from cache
            cached: true,
          }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    console.log('Cache miss - processing request');

    const COMICVINE_API_KEY = Deno.env.get("COMICVINE_API_KEY");
    const GOOGLE_VISION_API_KEY = Deno.env.get("GOOGLE_VISION_API_KEY");
    
    let ocrText = "";
    let visionTime = 0;
    
    // If textQuery provided (client override), use it directly
    if (textQuery) {
      console.log('Using client-provided text query:', textQuery);
      ocrText = textQuery;
    } else if (imageBase64) {
      // Perform server-side OCR with Google Vision API
      console.log('[SCAN-ITEM] Keys check:', { comicvine: !!COMICVINE_API_KEY, vision: !!GOOGLE_VISION_API_KEY });

      if (!COMICVINE_API_KEY || !GOOGLE_VISION_API_KEY) {
        console.error('[SCAN-ITEM] Missing API keys');
        return new Response(JSON.stringify({ ok: false, error: "Server configuration error. Please contact support." }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Resize image to 800px max for faster OCR
      console.log('[SCAN-ITEM] Resizing image for OCR...');
      const resizedImage = await resizeImageForOCR(imageBase64);

      console.log('[SCAN-ITEM] Calling Google Vision API...');
      const visionStartTime = Date.now();
      
      const visionRes = await fetch(
        `https://vision.googleapis.com/v1/images:annotate?key=${GOOGLE_VISION_API_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            requests: [{
              image: { content: resizedImage },
              features: [{ type: 'TEXT_DETECTION' }],
            }],
          }),
        }
      );

      visionTime = Date.now() - visionStartTime;
      console.log('[SCAN-ITEM] Google Vision response:', visionRes.status, `(${visionTime}ms)`);
      
      if (!visionRes.ok) {
        throw new Error('Google Vision API request failed');
      }

      const visionData = await visionRes.json();
      const annotations = visionData.responses?.[0]?.textAnnotations;
      
      if (!annotations || annotations.length === 0) {
        console.log('[SCAN-ITEM] No text detected in image');
        ocrText = "";
      } else {
        ocrText = annotations[0].description || "";
        console.log('[SCAN-ITEM] OCR extracted text:', ocrText.substring(0, 200));
      }
    }
    
    // Extract structured data from OCR - optimized for CGC slab format
    // CGC format: "GRADE PAGES CGC TYPE Title #123 Publisher, M/YY Creator info"
    
    // Extract grade (CGC X.X or CBCS X.X)
    const gradeMatch = ocrText.match(/(CGC|CBCS)\s+[\w\s]*?\s+(10\.0|9\.[0-9]|[0-8]\.[0-9]|[0-9]\.5)/i);
    const grade = gradeMatch ? gradeMatch[2] : "";
    const gradingCompany = gradeMatch ? gradeMatch[1].toUpperCase() : "";
    
    // Extract title and issue number
    // Pattern: "Title #123" or "Title No. 123" - title usually appears after CGC type
    let titleMatch = ocrText.match(/(?:CGC|CBCS)\s+(?:UNIVERSAL GRADE|SIGNATURE SERIES|RESTORED|QUALIFIED)\s+([A-Za-z\s&'-]+?)\s+#?(\d+)/i);
    if (!titleMatch) {
      // Fallback: look for "Title #123" anywhere
      titleMatch = ocrText.match(/([A-Za-z\s&'-]{3,}?)\s+#(\d+)/);
    }
    
    const series_title = titleMatch ? titleMatch[1].trim() : "";
    const issue_number = titleMatch ? titleMatch[2] : "";
    
    // Extract publisher (D.C., Marvel, Image, etc.)
    let publisher = "";
    const publisherMatch = ocrText.match(/\b(D\.C\.|DC|Marvel|Image|Dark Horse|IDW|Archie)\s+Comics/i);
    if (publisherMatch) {
      publisher = publisherMatch[1].replace("D.C.", "DC").toUpperCase();
    }
    
    // Extract year from date format "M/YY" or "MM/YYYY" or full year
    let year: number | null = null;
    const dateMatch = ocrText.match(/\b(\d{1,2})\/(\d{2,4})\b/);
    if (dateMatch) {
      let yearStr = dateMatch[2];
      // Convert 2-digit year to 4-digit
      if (yearStr.length === 2) {
        const twoDigit = parseInt(yearStr);
        yearStr = twoDigit > 30 ? `19${yearStr}` : `20${yearStr}`;
      }
      year = parseInt(yearStr);
    } else {
      // Fallback: look for 4-digit year
      const yearMatch = ocrText.match(/\b(19\d{2}|20\d{2})\b/);
      if (yearMatch) year = parseInt(yearMatch[1]);
    }
    
    // Build clean query for ComicVine: "Title Issue# Publisher Year"
    const queryParts = [];
    if (series_title) queryParts.push(series_title);
    if (issue_number) queryParts.push(issue_number);
    if (publisher) queryParts.push(publisher);
    if (year) queryParts.push(year.toString());
    const cleanQuery = queryParts.join(' ');
    
    console.log('[SCAN-ITEM] Extracted data:', { 
      series_title, 
      issue_number, 
      publisher, 
      year, 
      grade,
      gradingCompany,
      cleanQuery 
    });
    
    console.log('[SCAN-ITEM] Querying ComicVine API...');
    const cvStartTime = Date.now();
    const cvRes = await fetch(
      `https://comicvine.gamespot.com/api/search/?api_key=${COMICVINE_API_KEY}&format=json&query=${encodeURIComponent(cleanQuery)}&resources=issue&field_list=name,issue_number,volume,cover_date,image,deck&limit=10`,
      {
        headers: {
          "User-Agent": "GrailSeeker/1.0 (panelcomics.com)",
        },
      }
    );

    const cvTime = Date.now() - cvStartTime;
    console.log('[SCAN-ITEM] ComicVine response:', cvRes.status, `(${cvTime}ms)`);
    const cvData = await cvRes.json();
    console.log('[SCAN-ITEM] ComicVine results count:', cvData.results?.length ?? 0);
    
    // ComicVine uses status_code: 1 for success (not error field)
    if (!cvRes.ok || cvData.status_code !== 1) {
      console.error('ComicVine failed:', { status_code: cvData.status_code, error: cvData.error });
      throw new Error(cvData.error ?? "ComicVine API failed");
    }

    // Filter out results with missing critical data, map the rest
    const results = (cvData.results ?? [])
      .filter((i: any) => i.volume?.name && i.id) // Must have volume name and ID
      .map((i: any) => ({
        id: i.id,
        name: i.name || i.volume.name, // Use volume name if issue name missing
        issue_number: i.issue_number ?? "",
        volume: i.volume.name,
        cover_date: i.cover_date ?? "",
        image: i.image?.small_url ?? i.image?.thumb_url ?? null,
        description: i.deck ?? "", // Include description for validation
      }));

    const totalTime = Date.now() - startTime;
    console.log('[SCAN-ITEM] Success! Results:', results.length, `Total time: ${totalTime}ms`);

    // Store in cache (only if we have an image hash)
    if (imageSha256) {
      await supabase.from('scan_cache').upsert({
        image_sha256: imageSha256,
        user_id: userId,
        ocr: ocrText,
        comicvine_results: results,
      }, { onConflict: 'image_sha256' });
      console.log('[SCAN-ITEM] Cached result for future requests');
    }

    return new Response(
      JSON.stringify({
        ok: true,
        extracted: { series_title, issue_number, year, publisher, grade, gradingCompany },
        comicvineResults: results,
        ocrText: ocrText, // Raw OCR for debug
        cvQuery: cleanQuery, // Query sent to ComicVine for debug
        cached: false,
        timing: { total: totalTime, vision: visionTime || 0, comicvine: cvTime || 0 }
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error('[SCAN-ITEM] Function error:', err);
    const errorMessage = err instanceof Error ? err.message : "Unknown error";
    const totalTime = Date.now() - startTime;
    console.error('[SCAN-ITEM] Failed after', totalTime, 'ms');
    
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
