// supabase/functions/scan-item/index.ts
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { track } from '../_shared/track.ts';

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

// Helper to compute match hash for verified cache
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

// Timeout helper
async function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => 
      setTimeout(() => reject(new Error(`${label} timeout after ${ms}ms`)), ms)
    )
  ]);
}

serve(async (req) => {
  const startTime = Date.now();
  console.log('[SCAN-ITEM] Function invoked:', req.method, req.url);
  
  let sessionId: string | null = null;
  
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
      sessionId = body.sessionId || null;
    } catch (e) {
      console.error('[SCAN-ITEM] Failed to parse request body:', e);
      return new Response(
        JSON.stringify({ ok: false, error: "No scan image received. Please try again." }), 
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    // Track scan start
    await track(supabase, {
      flow: 'scan-item',
      action: 'start',
      session_id: sessionId,
      user_id: userId
    });

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

      // CACHE DISABLED FOR TESTING - Always process fresh
      // const cacheTTLDays = 7;
      // const cacheMinDate = new Date(Date.now() - cacheTTLDays * 24 * 60 * 60 * 1000).toISOString();
      // const { data: cachedResult } = await supabase
      //   .from('scan_cache')
      //   .select('*')
      //   .eq('image_sha256', imageSha256)
      //   .gte('created_at', cacheMinDate)
      //   .single();

      // if (cachedResult) {
      //   console.log('Cache hit - returning cached result');
      //   const cachedOcr = cachedResult.ocr || "";
      //   const issueMatch = cachedOcr.match(/#?\s*(\d+)/) || cachedOcr.match(/No\.?\s*(\d+)/i);
      //   const issue_number = issueMatch ? issueMatch[1] : "";
      //   const yearMatch = cachedOcr.match(/\b(19\d{2}|20\d{2})\b/);
      //   const year = yearMatch ? parseInt(yearMatch[1]) : null;
      //   
      //   return new Response(
      //     JSON.stringify({
      //       ok: true,
      //       extracted: { series_title: "", issue_number, year },
      //       comicvineResults: cachedResult.comicvine_results || [],
      //       ocrText: cachedOcr, // Raw OCR for debug
      //       cvQuery: '', // Not available from cache
      //       cached: true,
      //     }),
      //     { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      //   );
      // }
    }

    console.log('[SCAN-ITEM] Processing fresh scan (cache disabled)');

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

      // Call Google Vision with timeout
      console.log('[SCAN-ITEM] Calling Google Vision API...');
      const visionStartTime = Date.now();
      
      try {
        const visionRes = await withTimeout(
          fetch(
            `https://vision.googleapis.com/v1/images:annotate?key=${GOOGLE_VISION_API_KEY}`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                requests: [{
                  image: { content: imageBase64 },
                  features: [{ type: 'TEXT_DETECTION' }],
                }],
              }),
            }
          ),
          20000,
          'Google Vision'
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
      } catch (err: any) {
        visionTime = Date.now() - visionStartTime;
        console.warn('[SCAN-ITEM] Vision timeout or error:', err.message);
        ocrText = ""; // Continue without OCR text
      }
    }
    
    // Extract structured data from OCR - optimized parsing
    
    // Extract grade (appears BEFORE CGC/CBCS keyword)
    const gradeMatch = ocrText.match(/(10\.0|9\.[0-9]|[0-8]\.[0-9]|[0-9]\.5)\s+[\w\s-]+?\s+(CGC|CBCS)/i);
    const grade = gradeMatch ? gradeMatch[1] : "";
    const gradingCompany = gradeMatch ? gradeMatch[2].toUpperCase() : "";
    
    // Extract title - prioritize "Marvel Super Heroes" pattern and special titles
    const titleMatch = ocrText.match(/(?:Marvel Super Heroes )?(.+?) #\d+/i);
    const series_title = titleMatch?.[1]?.trim() || ocrText.match(/G\.I\.\s*JOE/i)?.[0] || '';
    
    // Extract issue number
    const issue_number = ocrText.match(/#\s*(\d+)/i)?.[1] || '';
    
    // Extract publisher
    const publisher = ocrText.includes('Marvel') ? 'Marvel' 
                     : ocrText.includes('Image') ? 'Image' 
                     : ocrText.includes('DC') || ocrText.includes('D.C.') ? 'DC' 
                     : '';
    
    // OCR Helpers: Extract year hint from multiple patterns
    let year: number | null = null;
    
    // 1. Try comma + 4-digit year (e.g., ", 1966")
    const commaYearMatch = ocrText.match(/,\s*(\d{4})/);
    if (commaYearMatch) {
      year = parseInt(commaYearMatch[1]);
    }
    
    // 2. Try month + 2-digit year (e.g., "MAR 66" or "3/66")
    if (!year) {
      const monthYearMatch = ocrText.match(/\b(?:JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC|\d{1,2})[\/\s](\d{2})\b/i);
      if (monthYearMatch) {
        const yy = parseInt(monthYearMatch[1]);
        year = yy >= 30 && yy <= 99 ? 1900 + yy : 2000 + yy;
      }
    }
    
    // 3. Fallback: standalone 4-digit year
    if (!year) {
      const yearMatch = ocrText.match(/\b(19\d{2}|20\d{2})\b/);
      if (yearMatch) {
        year = parseInt(yearMatch[1]);
      }
    }
    
    // OCR Helpers: Extract price tokens
    const priceTokens = ocrText.match(/\d+¢|\$\s*\d+\.\d+/g) || [];
    
    // OCR Helpers: Detect modern barcode (12-13 digits)
    const hasModernBarcode = /\d{12,13}/.test(ocrText);
    
    // Build hints for scoring
    const hints = {
      yearHint: year,
      issue: issue_number,
      priceTokens,
      hasModernBarcode,
      textTokens: ocrText.toLowerCase().split(/\s+/),
    };
    
    console.log('[SCAN-ITEM] OCR Hints:', hints);
    
    // Build clean Comic Vine query: "Title #Issue Publisher Year"
    const queryParts = [];
    if (series_title) queryParts.push(series_title);
    if (issue_number) queryParts.push(`#${issue_number}`);
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
    
    console.log('[SCAN-ITEM] 🎯 Final Query:', cleanQuery);
    
    const cacheEnabled = Deno.env.get('FEATURE_SCANNER_CACHE') === 'true';
    const top3PicksEnabled = Deno.env.get('FEATURE_TOP3_PICKS') === 'true';
    const reprintFilterEnabled = Deno.env.get('FEATURE_REPRINT_FILTER') === 'true';
    
    console.log('[SCAN-ITEM] Feature flags:', {
      cache: cacheEnabled,
      analytics: Deno.env.get('FEATURE_SCANNER_ANALYTICS') === 'true',
      gcdFallback: Deno.env.get('FEATURE_GCD_FALLBACK') === 'true',
      ebayComps: Deno.env.get('FEATURE_EBAY_COMPS') === 'true',
      top3Picks: top3PicksEnabled,
      reprintFilter: reprintFilterEnabled,
      imageCompression: Deno.env.get('FEATURE_IMAGE_COMPRESSION') === 'true',
      pricingPipeline: Deno.env.get('FEATURE_PRICING_PIPELINE') === 'true',
      manualOverride: Deno.env.get('FEATURE_MANUAL_OVERRIDE') === 'true',
      pickAutofill: Deno.env.get('FEATURE_PICK_AUTOFILL') === 'true'
    });
    
    // Check verified match cache (if feature enabled)
    let cachedMatch: any = null;
    if (cacheEnabled && series_title) {
      try {
        const hash = await matchHash(series_title, issue_number, publisher);
        console.log('[SCAN-ITEM] Checking verified_matches cache, hash:', hash);
        
        const { data: verified } = await supabase
          .from('verified_matches')
          .select('*')
          .eq('hash', hash)
          .single();
        
        if (verified) {
          console.log('[SCAN-ITEM] ✅ Cache hit from verified_matches!');
          cachedMatch = {
            id: parseInt(verified.source_id || '0'),
            resource: 'issue',
            title: verified.title,
            issue: verified.issue,
            year: verified.year,
            publisher: verified.publisher,
            volumeName: verified.title,
            volumeId: null,
            variantDescription: verified.variant_description,
            thumbUrl: verified.cover_url,
            coverUrl: verified.cover_url,
            score: 10, // Max score for verified matches
            normalizedScore: 1.0,
            isReprint: false,
            source: 'cache'
          };
          
          await track(supabase, {
            flow: 'cache',
            action: 'cache_hit',
            session_id: sessionId,
            user_id: userId,
            duration_ms: Date.now() - startTime
          });
        }
      } catch (e) {
        console.warn('[SCAN-ITEM] Cache lookup failed:', e);
      }
    } else if (!cacheEnabled) {
      console.log('[SCAN-ITEM] Scanner cache disabled by feature flag');
    }
    
    // Query ComicVine with timeout
    let cvData: any = null;
    let cvTime = 0;
    let results: any[] = [];
    
    try {
      console.log('[SCAN-ITEM] Querying ComicVine API...');
      const cvStartTime = Date.now();
      
      await track(supabase, {
        flow: 'comicvine',
        action: 'start',
        session_id: sessionId,
        user_id: userId,
        query: cleanQuery
      });
      
      const cvRes = await withTimeout(
        fetch(
          `https://comicvine.gamespot.com/api/search/?api_key=${COMICVINE_API_KEY}&format=json&resources=issue,volume&query=${encodeURIComponent(cleanQuery)}&field_list=id,name,issue_number,volume,cover_date,start_year,image&limit=10`,
          {
            headers: {
              "User-Agent": "GrailSeeker/1.0 (panelcomics.com)",
            },
          }
        ),
        25000,
        'ComicVine API'
      );

      cvTime = Date.now() - cvStartTime;
      console.log('[SCAN-ITEM] ComicVine response:', cvRes.status, `(${cvTime}ms)`);
      
      if (!cvRes.ok) {
        await track(supabase, {
          flow: 'comicvine',
          action: 'fail',
          session_id: sessionId,
          user_id: userId,
          duration_ms: cvTime,
          notes: `HTTP ${cvRes.status}`
        });
      }
      
      if (cvRes.ok) {
        cvData = await cvRes.json();
        const resultCount = cvData.results?.length ?? 0;
        console.log('[SCAN-ITEM] ComicVine results count:', resultCount);
        
        await track(supabase, {
          flow: 'comicvine',
          action: 'success',
          session_id: sessionId,
          user_id: userId,
          duration_ms: cvTime,
          result_count: resultCount
        });
        
        if (cvData.status_code === 1 && cvData.results?.length > 0) {
          // Map results to structured format
          // Helper function to calculate weighted match score
          const calculateMatchScore = (result: any, ocrText: string): number => {
            const title = result.volume?.name || result.name || "";
            const issueNumber = result.issue_number || "";
            const publisher = result.volume?.publisher?.name || "";
            const year = result.cover_date ? parseInt(result.cover_date.slice(0, 4)) : (result.start_year ? parseInt(result.start_year) : null);
            
            let score = 0;
            const normalizeText = (text: string) => text.toLowerCase().replace(/[^\w\s]/g, '').trim();
            const ocrLower = normalizeText(ocrText);
            const titleLower = normalizeText(title);
            
            // Extract tokens from OCR text
            const ocrTokens = ocrLower.split(/\s+/);
            const titleTokens = titleLower.split(/\s+/);
            
            // Title match (45% weight)
            const titleMatchRatio = titleTokens.filter(token => ocrTokens.some(ocrToken => 
              ocrToken.includes(token) || token.includes(ocrToken) || 
              // Fuzzy match for partial words
              (token.length > 3 && ocrToken.length > 3 && (
                token.substring(0, 4) === ocrToken.substring(0, 4)
              ))
            )).length / Math.max(titleTokens.length, 1);
            score += titleMatchRatio * 45;
            
            // Issue number match (35% weight) - exact match critical
            if (issueNumber) {
              const issueStr = issueNumber.toString();
              if (ocrLower.includes(issueStr) || ocrLower.includes(`#${issueStr}`)) {
                score += 35;
              } else {
                // Partial credit for similar issue numbers
                const issueMatch = ocrLower.match(/\d+/g);
                if (issueMatch && issueMatch.includes(issueStr)) {
                  score += 25;
                }
              }
            }
            
            // Publisher match (10% weight)
            if (publisher && ocrLower.includes(normalizeText(publisher))) {
              score += 10;
            }
            
            // Year match (10% weight)
            if (year) {
              const yearStr = year.toString();
              if (ocrLower.includes(yearStr)) {
                score += 10;
              }
            }
            
            return Math.min(score, 100);
          };
          
          results = cvData.results
            .filter((i: any) => i.volume?.name || i.name) // Must have a name
            .map((i: any) => {
              const title = i.volume?.name || i.name || "";
              const issueNumber = i.issue_number || "";
              const publisherName = i.volume?.publisher?.name || "";
              const coverYear = i.cover_date ? parseInt(i.cover_date.slice(0, 4)) : (i.start_year ? parseInt(i.start_year) : null);
              const volumeStartYear = i.volume?.start_year ? parseInt(i.volume.start_year) : null;
              
              // Calculate weighted match score
              const matchScore = calculateMatchScore(i, cleanQuery);
              const variantDescription = i.volume?.description || i.deck || "";
              
              return {
                id: i.id,
                resource: i.resource_type || 'issue',
                name: title,
                issue_number: issueNumber,
                volume: i.volume?.name || title,
                volumeId: i.volume?.id || null,
                volumeName: i.volume?.name || null,
                publisher: publisherName,
                year: coverYear,
                cover_date: i.cover_date || "",
                thumbUrl: i.image?.thumb_url || i.image?.small_url || i.image?.medium_url || "",
                coverUrl: i.image?.original_url || i.image?.super_url || i.image?.medium_url || "",
                description: variantDescription,
                volumeStartYear,
              };
            });
          
          // Score and sort results to prefer originals
          const oldPrice = ['12¢','15¢','20¢','25¢','30¢','35¢','40¢','50¢'];
          const variantBad = /(facsimile|true believers|reprint|anniversary|2nd print|third print|second print|replica|reproduction|variant facsimile)/i;
          
          results = results.map((cv: any) => {
            let score = 0;
            // Check both name/title and description for reprint indicators
            const textToCheck = `${cv.name || ''} ${cv.volume || ''} ${cv.description || ''}`;
            const isReprint = variantBad.test(textToCheck);
            
            // Exact issue match
            if (cv.issue_number === hints.issue) score += 3;
            
            // Year closeness
            if (hints.yearHint && cv.year) {
              const cvYear = cv.year;
              if (!isNaN(cvYear)) {
                score += Math.max(0, 3 - Math.min(3, Math.abs(cvYear - hints.yearHint)));
              }
            }
            
            // Original volume (started before or at hint year)
            if (cv.volumeStartYear && hints.yearHint && cv.volumeStartYear <= hints.yearHint) {
              score += 2;
            }
            
            // Publisher match
            if (cv.publisher?.toLowerCase().includes('marvel')) score += 0.5;
            if (cv.publisher?.toLowerCase().includes('dc')) score += 0.5;
            
            // Old price tokens imply original
            if (hints.priceTokens.some((p: string) => oldPrice.includes(p))) score += 1;
            
            // Enhanced penalties for reprints and modern editions
            if (isReprint) score -= 5;
            if (/(facsimile|true believers|reprint|2nd print|anniversary)/i.test(cv.description || '')) {
              score -= 5; // Stronger reprint penalty
            }
            if (cv.year && hints.yearHint) {
              const cvYear = cv.year;
              if (!isNaN(cvYear) && cvYear > hints.yearHint + 5) score -= 2;
            }
            if (hints.hasModernBarcode) score -= 1.5;
            if (hints.priceTokens.some((p: string) => /\$\s*3\.99|\$\s*4\.99/.test(p))) score -= 1.5;
            
            // Normalize score to 0-1 range for UI display
            const normalizedScore = Math.max(0, Math.min(1, (score + 5) / 15));
            
            return { ...cv, score, normalizedScore, isReprint };
          }).sort((a: any, b: any) => b.score - a.score);
          
          // Log top 3 candidates with details
          const top3 = results.slice(0, 3);
          top3.forEach((cv: any, idx: number) => {
            console.log(`[SCAN-ITEM] Candidate #${idx + 1}:`, {
              id: cv.id,
              title: cv.name || cv.volume,
              issue: cv.issue_number,
              year: cv.year,
              score: cv.score.toFixed(2),
              normalizedScore: cv.normalizedScore.toFixed(2),
              isReprint: cv.isReprint,
              variantDescription: cv.description?.substring(0, 100) || 'N/A'
            });
          });
          
          // Return top 3 picks (if FEATURE_TOP3_PICKS enabled, otherwise return all)
          const pickLimit = top3PicksEnabled ? 3 : 10;
          results = top3.slice(0, pickLimit).map((cv: any) => ({
            id: cv.id,
            resource: cv.resource,
            title: cv.name || cv.volume,
            issue: cv.issue_number,
            year: cv.year,
            publisher: cv.publisher,
            volumeName: cv.volumeName,
            volumeId: cv.volumeId,
            variantDescription: cv.description,
            thumbUrl: cv.thumbUrl,
            coverUrl: cv.coverUrl,
            score: cv.normalizedScore,
            isReprint: cv.isReprint,
          }));
        }
      }
    } catch (err: any) {
      console.warn('[SCAN-ITEM] ComicVine error:', err.message);
      cvTime = Date.now() - startTime;
      
      // GCD Fallback (if feature enabled and ComicVine failed)
      if (Deno.env.get('FEATURE_GCD_FALLBACK') === 'true') {
        console.log('[SCAN-ITEM] ComicVine failed, GCD fallback enabled but not yet implemented');
        // TODO: Implement Grand Comics Database API fallback
      }
    }

    const totalTime = Date.now() - startTime;
    
    // Prepend cached match if available
    if (cachedMatch) {
      results = [cachedMatch, ...results.slice(0, 2)]; // Cache + top 2 ComicVine
    }
    
    // Fetch eBay comps if feature enabled and we have results
    if (Deno.env.get('FEATURE_EBAY_COMPS') === 'true' && results.length > 0) {
      console.log('[SCAN-ITEM] eBay comps feature enabled but integration not yet active');
      // TODO: Call ebay-comps function to fetch market comparables
    }
    
    // Track scan success
    await track(supabase, {
      flow: 'scan-item',
      action: 'success',
      session_id: sessionId,
      user_id: userId,
      duration_ms: totalTime,
      result_count: results.length
    });
    
    // Add flush delay before returning
    await new Promise(r => setTimeout(r, 250));
    
    // Always return 200 with ok status indicating if we found results
    const hasResults = results.length > 0;
    console.log('[SCAN-ITEM] Complete:', { 
      ok: hasResults, 
      resultsCount: results.length, 
      totalTime: `${totalTime}ms`,
      hasCache: !!cachedMatch
    });

    return new Response(
      JSON.stringify({
        ok: hasResults,
        reason: hasResults ? undefined : "timeout_or_no_match",
        extracted: { series_title, issue_number, year, publisher, grade, gradingCompany },
        picks: results,
        ocrText: ocrText,
        cvQuery: cleanQuery,
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
    
    // Always return 200 with ok: false to prevent UI hangs
    return new Response(
      JSON.stringify({ 
        ok: false, 
        reason: "error",
        error: "Scan processing error. Please try again.",
        details: errorMessage,
        timing: { total: totalTime }
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
