// supabase/functions/scan-item/index.ts
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-client-info, apikey',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

async function checkRateLimit(supabase: any, userId: string | null, ipAddress: string): Promise<boolean> {
  const identifier = userId || ipAddress;
  const windowMinutes = 1;
  const maxScans = 10;

  const cutoff = new Date(Date.now() - windowMinutes * 60 * 1000).toISOString();
  await supabase.from('scan_rate_limits').delete().lt('window_start', cutoff);

  const { data: existing } = await supabase
    .from('scan_rate_limits')
    .select('*')
    .or(`user_id.eq.${userId},ip_address.eq.${ipAddress}`)
    .gte('window_start', cutoff)
    .single();

  if (existing) {
    if (existing.scan_count >= maxScans) return false;
    await supabase
      .from('scan_rate_limits')
      .update({ scan_count: existing.scan_count + 1, updated_at: new Date().toISOString() })
      .eq('id', existing.id);
  } else {
    await supabase.from('scan_rate_limits').insert({
      user_id: userId,
      ip_address: ipAddress,
      scan_count: 1,
      window_start: new Date().toISOString(),
    });
  }
  return true;
}

async function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => 
      setTimeout(() => reject(new Error(`${label} timeout after ${ms}ms`)), ms)
    )
  ]);
}

// Comic title keywords for fuzzy matching
const COMIC_TITLE_KEYWORDS = [
  'Amazing Spider-Man', 'Spider-Man', 'Spider Man', 'X-Men', 'Batman', 'Superman', 
  'Avengers', 'Justice League', 'Fantastic Four', 'Iron Man', 'Captain America', 
  'Thor', 'Hulk', 'Incredible Hulk', 'Wolverine', 'Daredevil', 'Punisher', 
  'Flash', 'Green Lantern', 'Wonder Woman', 'Spawn', 'Walking Dead',
  'Invincible', 'Saga', 'Sandman', 'Watchmen', 'V for Vendetta', 'Hellboy',
  'Detective Comics', 'Action Comics', 'Amazing Fantasy', 'Tales of Suspense',
  'Journey into Mystery', 'Strange Tales', 'Uncanny X-Men', 'New Mutants'
];

// Noise patterns to remove from title extraction
const NOISE_PATTERNS = [
  /APPROVED BY THE COMICS CODE/gi,
  /COMICS CODE AUTHORITY/gi,
  /\bTM\b/g,
  /\b©\b/g,
  /ALL NEW/gi,
  /BRAND NEW/gi,
  /FIRST APPEARANCE/gi,
  /ORIGIN OF/gi,
  /INTRODUCING/gi,
  /GUEST STARRING/gi,
  /FEATURING/gi,
  /SPECIAL/gi,
  /ANNUAL/gi
];

function detectSlab(ocrText: string): boolean {
  const slabIndicators = ['cgc', 'cbcs', 'universal grade', 'signature series', 'white pages', 'off-white', 'certification'];
  const lower = ocrText.toLowerCase();
  return slabIndicators.some(term => lower.includes(term));
}

function separateSlabFromCover(annotations: any[]): { coverText: string; slabText: string } {
  if (!annotations || annotations.length < 2) {
    return { coverText: annotations?.[0]?.description || '', slabText: '' };
  }

  // First annotation is full text, subsequent ones are individual words/blocks
  const blocks = annotations.slice(1);
  
  // Slab labels are typically in top portion (y < 0.3 of image height)
  // and contain grading terms
  const slabTerms = ['cgc', 'cbcs', 'universal', 'grade', 'white', 'pages', 'certification'];
  
  const coverBlocks: string[] = [];
  const slabBlocks: string[] = [];
  
  blocks.forEach(block => {
    const text = block.description;
    const lower = text.toLowerCase();
    
    // Check if this block is likely slab label text
    const isSlabText = slabTerms.some(term => lower.includes(term)) || 
                       /^\d\.?\d?$/.test(text) || // Grade numbers like 9.8
                       /\b\d{8,}\b/.test(text);   // Cert numbers
    
    if (isSlabText) {
      slabBlocks.push(text);
    } else {
      coverBlocks.push(text);
    }
  });
  
  return {
    coverText: coverBlocks.join(' '),
    slabText: slabBlocks.join(' ')
  };
}

function cleanTitle(text: string): string {
  let cleaned = text;
  
  // Remove noise patterns
  for (const pattern of NOISE_PATTERNS) {
    cleaned = cleaned.replace(pattern, '');
  }
  
  // Remove extra whitespace
  cleaned = cleaned.replace(/\s+/g, ' ').trim();
  
  return cleaned;
}

function fuzzyExtractTitle(ocrText: string): string | null {
  const upper = ocrText.toUpperCase();
  const lines = ocrText.split('\n');
  
  // First pass: look for exact keyword matches in individual lines
  for (const line of lines) {
    const cleanedLine = cleanTitle(line);
    for (const keyword of COMIC_TITLE_KEYWORDS) {
      const keywordUpper = keyword.toUpperCase();
      if (cleanedLine.toUpperCase().includes(keywordUpper)) {
        // Found a line with a known title - extract just that part
        const regex = new RegExp(`([A-Za-z\\s&'-]*${keyword}[A-Za-z\\s&'-]*)`, 'i');
        const match = cleanedLine.match(regex);
        if (match) {
          return match[1].trim();
        }
        return keyword;
      }
    }
  }
  
  // Second pass: look in full text
  for (const keyword of COMIC_TITLE_KEYWORDS) {
    const keywordUpper = keyword.toUpperCase();
    if (upper.includes(keywordUpper)) {
      const regex = new RegExp(`([A-Za-z\\s&'-]*${keyword}[A-Za-z\\s&'-]*)`, 'i');
      const match = ocrText.match(regex);
      if (match) {
        return cleanTitle(match[1].trim());
      }
      return keyword;
    }
  }
  
  return null;
}

function extractTokensFromOCR(ocrText: string, annotations?: any[]): any {
  const isSlab = detectSlab(ocrText);
  console.log('[SCAN-ITEM] Detected slab:', isSlab);
  
  let coverText = ocrText;
  let slabText = '';
  
  // If slab detected and we have detailed annotations, separate regions
  if (isSlab && annotations && annotations.length > 1) {
    const separated = separateSlabFromCover(annotations);
    coverText = separated.coverText;
    slabText = separated.slabText;
    console.log('[SCAN-ITEM] Separated cover text:', coverText.substring(0, 100));
    console.log('[SCAN-ITEM] Separated slab text:', slabText.substring(0, 100));
  }
  
  // Extract from cover text primarily
  const slabTerms = ['cgc', 'cbcs', 'universal', 'grade', 'certification', 'white pages', 'off-white'];
  const lines = coverText.split('\n').filter(line => {
    const lower = line.toLowerCase();
    return !slabTerms.some(term => lower.includes(term)) && !/\b\d{6,}\b/.test(line);
  });
  const cleanText = lines.join(' ');
  
  // Primary title extraction - prioritize known comic titles
  let title = "";
  const fuzzyTitle = fuzzyExtractTitle(coverText);
  if (fuzzyTitle) {
    title = fuzzyTitle;
    console.log('[SCAN-ITEM] Used fuzzy title extraction:', title);
  } else {
    // Fallback to first capitalized line
    const titleMatch = cleanText.match(/^[A-Z][A-Za-z\s&'-]+/m);
    if (titleMatch) {
      title = titleMatch[0].trim();
    }
  }
  
  // Clean the extracted title
  const finalCleanTitle = cleanTitle(title);
  console.log('[SCAN-ITEM] Final clean title:', finalCleanTitle);
  
  // Extract issue number from cover text
  let issueNumber = null;
  const issuePatterns = [
    /#\s*(\d{1,4})\b/,
    /\bNo\.?\s*(\d{1,4})\b/i,
    /\bIssue\s*(\d{1,4})\b/i
  ];
  
  for (const pattern of issuePatterns) {
    const match = cleanText.match(pattern);
    if (match) {
      issueNumber = match[1];
      break;
    }
  }
  
  // Extract publisher from both cover and slab text
  const publishers = ['DC', 'Marvel', 'Image', 'Dark Horse', 'IDW', 'Boom', 'Vertigo', 'Wildstorm'];
  let publisher = null;
  const combinedText = coverText + ' ' + slabText;
  for (const pub of publishers) {
    if (new RegExp(`\\b${pub}(?:\\s+COMICS?)?\\b`, 'i').test(combinedText)) {
      publisher = pub;
      break;
    }
  }
  
  // Extract year
  const yearMatch = combinedText.match(/\b(19[3-9]\d|20[0-3]\d)\b/);
  const year = yearMatch ? parseInt(yearMatch[1]) : null;
  
  return { 
    title: finalCleanTitle || null, 
    issueNumber, 
    publisher, 
    year,
    isSlab,
    coverText: coverText.substring(0, 200),
    slabText: slabText.substring(0, 200),
    finalCleanTitle
  };
}

async function queryComicVineVolumes(apiKey: string, title: string): Promise<any[]> {
  const url = `https://comicvine.gamespot.com/api/search/?api_key=${apiKey}&format=json&resources=volume&query=${encodeURIComponent(title)}&field_list=id,name,publisher,start_year&limit=20`;
  
  console.log('[SCAN-ITEM] 🔍 ComicVine Volume Query:', url);
  
  const response = await fetch(url, {
    headers: { "User-Agent": "GrailSeeker/1.0 (panelcomics.com)" }
  });
  
  if (!response.ok) {
    throw new Error(`ComicVine volume query failed: ${response.status}`);
  }
  
  const data = await response.json();
  return data.results || [];
}

async function queryComicVineIssue(apiKey: string, volumeId: number, issueNumber: string): Promise<any[]> {
  const url = `https://comicvine.gamespot.com/api/issues/?api_key=${apiKey}&format=json&filter=volume:${volumeId},issue_number:${issueNumber}&field_list=id,name,issue_number,volume,cover_date,image&limit=10`;
  
  console.log('[SCAN-ITEM] 🔍 ComicVine Issue Query:', url);
  
  const response = await fetch(url, {
    headers: { "User-Agent": "GrailSeeker/1.0 (panelcomics.com)" }
  });
  
  if (!response.ok) {
    throw new Error(`ComicVine issue query failed: ${response.status}`);
  }
  
  const data = await response.json();
  return data.results || [];
}

serve(async (req) => {
  const startTime = Date.now();
  console.log('[SCAN-ITEM] Function invoked');
  
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (req.method !== "POST") {
      return new Response(JSON.stringify({ ok: false, error: "Method not allowed" }), {
        status: 405,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const authHeader = req.headers.get('Authorization');
    let userId: string | null = null;
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      const { data: { user } } = await supabase.auth.getUser(token);
      userId = user?.id || null;
    }

    const ipAddress = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown';

    const canProceed = await checkRateLimit(supabase, userId, ipAddress);
    if (!canProceed) {
      return new Response(JSON.stringify({ ok: false, error: "Rate limit exceeded" }), {
        status: 429,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const { imageBase64, textQuery } = body;

    const COMICVINE_API_KEY = Deno.env.get("COMICVINE_API_KEY");
    const GOOGLE_VISION_API_KEY = Deno.env.get("GOOGLE_VISION_API_KEY");
    
    if (!COMICVINE_API_KEY || !GOOGLE_VISION_API_KEY) {
      return new Response(JSON.stringify({ ok: false, error: "Server configuration error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let ocrText = "";
    let ocrAnnotations: any[] = [];
    let visionTime = 0;
    
    if (textQuery) {
      ocrText = textQuery;
    } else if (imageBase64) {
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
        
        if (visionRes.ok) {
          const visionData = await visionRes.json();
          ocrAnnotations = visionData.responses?.[0]?.textAnnotations || [];
          ocrText = ocrAnnotations?.[0]?.description || "";
          console.log('[SCAN-ITEM] OCR extracted:', ocrText.substring(0, 200));
          console.log('[SCAN-ITEM] OCR annotations count:', ocrAnnotations.length);
        }
      } catch (err: any) {
        console.warn('[SCAN-ITEM] Vision error:', err.message);
      }
    }

    const tokens = extractTokensFromOCR(ocrText, ocrAnnotations);
    
    console.log('[SCAN-ITEM] 🔍 DEBUG: Extracted OCR Tokens:', {
      title: tokens.title,
      issueNumber: tokens.issueNumber,
      publisher: tokens.publisher,
      year: tokens.year,
      isSlab: tokens.isSlab,
      coverTextPreview: tokens.coverText,
      slabTextPreview: tokens.slabText
    });

    let results: any[] = [];
    let exactMatchMode = false;
    let noMatchesFound = false;

    // PRIMARY MODE: Only if BOTH title AND issueNumber are non-empty strings
    if (tokens.title && typeof tokens.title === 'string' && tokens.title.trim() !== '' &&
        tokens.issueNumber && typeof tokens.issueNumber === 'string' && tokens.issueNumber.trim() !== '') {
      exactMatchMode = true;
      console.log('[SCAN-ITEM] 🎯 PRIMARY MODE: Exact title + issue matching');
      console.log('[SCAN-ITEM] Searching for:', `${tokens.title} #${tokens.issueNumber}`);
      
      try {
        const volumes = await queryComicVineVolumes(COMICVINE_API_KEY, tokens.title);
        console.log('[SCAN-ITEM] Found', volumes.length, 'volumes for title:', tokens.title);
        
        for (const volume of volumes.slice(0, 5)) {
          const issues = await queryComicVineIssue(COMICVINE_API_KEY, volume.id, tokens.issueNumber);
          
          for (const issue of issues) {
            // Calculate score based on match quality
            let score = 0.95;
            const volumePub = volume.publisher?.name || '';
            
            // Exact match: title + issue + publisher
            if (tokens.publisher && volumePub.toLowerCase().includes(tokens.publisher.toLowerCase())) {
              score = 0.98;
            }
            
            results.push({
              id: issue.id,
              resource: 'issue',
              title: issue.volume?.name || issue.name || volume.name,
              issue: issue.issue_number,
              year: issue.cover_date ? parseInt(issue.cover_date.slice(0, 4)) : null,
              publisher: volumePub || tokens.publisher || "",
              volumeName: volume.name,
              volumeId: volume.id,
              variantDescription: "",
              thumbUrl: issue.image?.small_url || "",
              coverUrl: issue.image?.original_url || "",
              score: score,
              matchMode: 'exact'
            });
          }
        }
        
        console.log('[SCAN-ITEM] Found', results.length, 'exact issue matches');
        
        if (results.length === 0) {
          console.log('[SCAN-ITEM] ⚠️ No exact matches found, will try fallback search');
        }
      } catch (err: any) {
        console.error('[SCAN-ITEM] Error in exact matching:', err.message);
      }
    } else if (tokens.issueNumber && tokens.publisher) {
      // ISSUE + PUBLISHER MODE: Title unreliable but issue + publisher available
      console.log('[SCAN-ITEM] 🔍 ISSUE + PUBLISHER MODE: Matching by issue and publisher');
      exactMatchMode = true;
      
      try {
        // Search using publisher + issue as query
        const searchQuery = `${tokens.publisher} #${tokens.issueNumber}`;
        const url = `https://comicvine.gamespot.com/api/search/?api_key=${COMICVINE_API_KEY}&format=json&resources=issue&query=${encodeURIComponent(searchQuery)}&field_list=id,name,issue_number,volume,cover_date,image&limit=20`;
        
        const response = await withTimeout(
          fetch(url, {
            headers: { "User-Agent": "GrailSeeker/1.0 (panelcomics.com)" }
          }),
          25000,
          'ComicVine'
        );
        
        if (response.ok) {
          const data = await response.json();
          const searchResults = data.results || [];
          
          for (const item of searchResults) {
            // Filter by exact issue number match
            if (item.issue_number === tokens.issueNumber) {
              const volumePub = item.volume?.publisher?.name || '';
              const pubMatch = volumePub.toLowerCase().includes(tokens.publisher.toLowerCase());
              
              results.push({
                id: item.id,
                resource: 'issue',
                title: item.volume?.name || item.name || "",
                issue: item.issue_number,
                year: item.cover_date ? parseInt(item.cover_date.slice(0, 4)) : null,
                publisher: volumePub,
                volumeName: item.volume?.name || "",
                volumeId: item.volume?.id || null,
                variantDescription: "",
                thumbUrl: item.image?.small_url || "",
                coverUrl: item.image?.original_url || "",
                score: pubMatch ? 0.90 : 0.75,
                matchMode: 'issue_publisher'
              });
            }
          }
          
          console.log('[SCAN-ITEM] Found', results.length, 'issue+publisher matches');
        }
      } catch (err: any) {
        console.error('[SCAN-ITEM] Error in issue+publisher matching:', err.message);
      }
    } else {
      console.log('[SCAN-ITEM] ℹ️ OCR incomplete - title or issueNumber missing, using fallback search');
    }
    
    // FALLBACK MODE: Run if not in exact mode OR if exact mode found nothing
    if (!exactMatchMode || results.length === 0) {
      console.log('[SCAN-ITEM] 🔄 FALLBACK MODE: Loose search');
      
      const searchQuery = tokens.title || textQuery || ocrText.substring(0, 50);
      const url = `https://comicvine.gamespot.com/api/search/?api_key=${COMICVINE_API_KEY}&format=json&resources=issue,volume&query=${encodeURIComponent(searchQuery)}&field_list=id,name,issue_number,volume,cover_date,image&limit=10`;
      
      console.log('[SCAN-ITEM] 🔍 Fallback Query URL:', url);
      
      try {
        const response = await withTimeout(
          fetch(url, {
            headers: { "User-Agent": "GrailSeeker/1.0 (panelcomics.com)" }
          }),
          25000,
          'ComicVine'
        );
        
        if (response.ok) {
          const data = await response.json();
          const fallbackResults = data.results || [];
          
          results.push(...fallbackResults.map((item: any) => ({
            id: item.id,
            resource: item.resource_type || 'issue',
            title: item.volume?.name || item.name || "",
            issue: item.issue_number || "",
            year: item.cover_date ? parseInt(item.cover_date.slice(0, 4)) : null,
            publisher: item.volume?.publisher?.name || "",
            volumeName: item.volume?.name || "",
            volumeId: item.volume?.id || null,
            variantDescription: "",
            thumbUrl: item.image?.small_url || "",
            coverUrl: item.image?.original_url || "",
            score: 0.40,
            matchMode: 'fallback'
          })));
          
          console.log('[SCAN-ITEM] Fallback found', results.length, 'results');
        }
      } catch (err: any) {
        console.warn('[SCAN-ITEM] Fallback search error:', err.message);
      }
    }
    
    // Only set noMatchesFound if we tried exact matching AND fallback returned nothing
    if (exactMatchMode && results.length === 0) {
      noMatchesFound = true;
      console.log('[SCAN-ITEM] ⚠️ No matches found after exact + fallback search');
    }

    const totalTime = Date.now() - startTime;

    return new Response(
      JSON.stringify({
        ok: true,
        extracted: {
          title: tokens.title,
          issueNumber: tokens.issueNumber,
          publisher: tokens.publisher,
          year: tokens.year,
          isSlab: tokens.isSlab,
          coverText: tokens.coverText,
          slabText: tokens.slabText,
          finalCleanTitle: tokens.finalCleanTitle
        },
        picks: results,
        ocrText,
        exactMatchMode,
        noMatchesFound,
        timings: {
          vision: visionTime,
          total: totalTime
        },
        debug: {
          queryMode: exactMatchMode ? 'exact' : 'fallback',
          resultCount: results.length,
          annotationsCount: ocrAnnotations.length
        }
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      }
    );

  } catch (error: any) {
    console.error('[SCAN-ITEM] Fatal error:', error);
    return new Response(
      JSON.stringify({
        ok: false,
        error: error.message || "Internal server error"
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      }
    );
  }
});