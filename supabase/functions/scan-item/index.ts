// supabase/functions/scan-item/index.ts
// IMPROVED SCANNER: Direct OCR → ComicVine search without hardcoded title list
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-client-info, apikey',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

async function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => 
      setTimeout(() => reject(new Error(`${label} timeout after ${ms}ms`)), ms)
    )
  ]);
}

// Patterns to clean from OCR text
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
  /HE'S DIFFERENT/gi,
  /HE'S DEADLY/gi,
  /HE'S THE GREATEST/gi,
  /SHE'S/gi,
  /PAGE QUALITY/gi,
  /STILL ONLY/gi,
  /\bALL AGES\b/gi,
  /DIRECT EDITION/gi,
  /NEWSSTAND/gi,
];

// Slab-related terms to filter out
const SLAB_TERMS = ['cgc', 'cbcs', 'universal grade', 'signature series', 'white pages', 
  'off-white', 'certification', 'graded', 'encapsulated', 'verified signature'];

function detectSlab(ocrText: string): boolean {
  const lower = ocrText.toLowerCase();
  return SLAB_TERMS.some(term => lower.includes(term));
}

function cleanOcrText(text: string): string {
  let cleaned = text;
  
  // Remove noise patterns
  for (const pattern of NOISE_PATTERNS) {
    cleaned = cleaned.replace(pattern, ' ');
  }
  
  // Remove slab terms
  for (const term of SLAB_TERMS) {
    cleaned = cleaned.replace(new RegExp(term, 'gi'), ' ');
  }
  
  // Remove cert numbers (8+ digits)
  cleaned = cleaned.replace(/\b\d{8,}\b/g, ' ');
  
  // Remove grade numbers like 9.8, 9.6
  cleaned = cleaned.replace(/\b\d\.\d\b/g, ' ');
  
  // Clean up whitespace
  cleaned = cleaned.replace(/\s+/g, ' ').trim();
  
  return cleaned;
}

// Extract title and issue from OCR text using multiple strategies
function extractTitleAndIssue(ocrText: string): { 
  title: string | null; 
  issue: string | null;
  confidence: number;
  method: string;
} {
  const cleanedText = cleanOcrText(ocrText);
  console.log('[SCAN-ITEM] Cleaned OCR text:', cleanedText.substring(0, 200));
  
  // Strategy 1: Look for "Title #Number" pattern
  // Match patterns like "Amazing Spider-Man #129" or "Saga of the Swamp Thing #21"
  const hashPatterns = [
    /\b([A-Z][A-Za-z\-'\s]{2,50}?)\s*#\s*(\d{1,4})\b/g,
    /\b([A-Z][a-z]+(?:\s+[A-Za-z][a-z]+){1,6})\s*#\s*(\d{1,4})\b/g,
  ];
  
  for (const pattern of hashPatterns) {
    const matches = [...cleanedText.matchAll(pattern)];
    if (matches.length > 0) {
      // Pick the longest title match (more likely to be complete)
      const best = matches.reduce((a, b) => 
        (a[1].length > b[1].length) ? a : b
      );
      const title = best[1].trim();
      const issue = best[2];
      
      // Validate it looks like a real title (not just junk)
      if (title.split(/\s+/).length >= 2 || title.length >= 6) {
        console.log('[SCAN-ITEM] Strategy 1 (hash pattern):', title, '#', issue);
        return { title, issue, confidence: 0.9, method: 'hash_pattern' };
      }
    }
  }
  
  // Strategy 2: Look for "No. X" or "Issue X" patterns
  const noPatterns = [
    /\b([A-Z][A-Za-z\-'\s]{2,50}?)\s+No\.?\s*(\d{1,4})\b/gi,
    /\b([A-Z][A-Za-z\-'\s]{2,50}?)\s+Issue\s*(\d{1,4})\b/gi,
  ];
  
  for (const pattern of noPatterns) {
    const match = cleanedText.match(pattern);
    if (match) {
      // Re-extract groups
      const reMatch = cleanedText.match(/\b([A-Z][A-Za-z\-'\s]{2,50}?)\s+(?:No\.?|Issue)\s*(\d{1,4})\b/i);
      if (reMatch) {
        const title = reMatch[1].trim();
        const issue = reMatch[2];
        console.log('[SCAN-ITEM] Strategy 2 (No/Issue pattern):', title, '#', issue);
        return { title, issue, confidence: 0.85, method: 'no_pattern' };
      }
    }
  }
  
  // Strategy 3: Look for standalone issue number and find nearby title-like text
  const standaloneIssue = cleanedText.match(/\b#\s*(\d{1,4})\b/);
  if (standaloneIssue) {
    const issue = standaloneIssue[1];
    // Find the most title-like phrase in the text
    const lines = cleanedText.split('\n');
    for (const line of lines) {
      // Skip lines with issue number
      if (line.includes('#') || /\bNo\.?\s*\d/i.test(line)) continue;
      
      // Find capitalized multi-word phrases
      const titleMatch = line.match(/\b([A-Z][A-Za-z\-']+(?:\s+[A-Za-z\-']+){1,5})\b/);
      if (titleMatch) {
        const title = titleMatch[1].trim();
        if (title.length >= 5) {
          console.log('[SCAN-ITEM] Strategy 3 (standalone issue):', title, '#', issue);
          return { title, issue, confidence: 0.7, method: 'standalone_issue' };
        }
      }
    }
  }
  
  // Strategy 4: Just extract any plausible title for manual search
  // Look for 2-5 capitalized words
  const titleOnlyMatch = cleanedText.match(/\b([A-Z][a-z]+(?:\s+(?:of|the|and|The|Of|And|[A-Z][a-z]+)){1,5})\b/);
  if (titleOnlyMatch) {
    const title = titleOnlyMatch[1].trim();
    console.log('[SCAN-ITEM] Strategy 4 (title only):', title);
    return { title, issue: null, confidence: 0.5, method: 'title_only' };
  }
  
  console.log('[SCAN-ITEM] No title/issue extracted');
  return { title: null, issue: null, confidence: 0, method: 'none' };
}

// Extract publisher from OCR text
function extractPublisher(text: string): string | null {
  const publishers = [
    { name: 'Marvel', patterns: ['Marvel', 'Marvel Comics'] },
    { name: 'DC', patterns: ['DC', 'DC Comics'] },
    { name: 'Image', patterns: ['Image', 'Image Comics'] },
    { name: 'Dark Horse', patterns: ['Dark Horse'] },
    { name: 'IDW', patterns: ['IDW'] },
    { name: 'Boom', patterns: ['Boom', 'Boom! Studios'] },
    { name: 'Vertigo', patterns: ['Vertigo'] },
    { name: 'Wildstorm', patterns: ['Wildstorm'] },
    { name: 'Valiant', patterns: ['Valiant'] },
    { name: 'Dynamite', patterns: ['Dynamite'] },
  ];
  
  const lower = text.toLowerCase();
  for (const pub of publishers) {
    for (const pattern of pub.patterns) {
      if (lower.includes(pattern.toLowerCase())) {
        return pub.name;
      }
    }
  }
  return null;
}

// Extract year from OCR text
function extractYear(text: string): number | null {
  const yearMatch = text.match(/\b(19[3-9]\d|20[0-3]\d)\b/);
  return yearMatch ? parseInt(yearMatch[1]) : null;
}

// Query ComicVine with the extracted data
async function searchComicVine(
  apiKey: string, 
  title: string, 
  issue: string | null,
  publisher: string | null
): Promise<any[]> {
  const results: any[] = [];
  
  // Build search query - use title + issue if available
  let searchQuery = title;
  if (issue) {
    searchQuery = `${title} ${issue}`;
  }
  if (publisher) {
    searchQuery = `${searchQuery} ${publisher}`;
  }
  
  console.log('[SCAN-ITEM] ComicVine search query:', searchQuery);
  
  // Search for issues directly (better for matching specific issues)
  const issueSearchUrl = `https://comicvine.gamespot.com/api/search/?api_key=${apiKey}&format=json&resources=issue&query=${encodeURIComponent(searchQuery)}&field_list=id,name,issue_number,volume,cover_date,image&limit=15`;
  
  console.log('[SCAN-ITEM] ComicVine issue search URL:', issueSearchUrl);
  
  try {
    const response = await withTimeout(
      fetch(issueSearchUrl, {
        headers: { 'User-Agent': 'GrailSeeker-Scanner/1.0' }
      }),
      20000,
      'ComicVine issue search'
    );
    
    if (response.ok) {
      const data = await response.json();
      console.log('[SCAN-ITEM] ComicVine returned', data.results?.length || 0, 'issue results');
      
      for (const item of (data.results || [])) {
        results.push({
          id: item.id,
          resource: 'issue',
          title: item.volume?.name || item.name || '',
          issue: item.issue_number || '',
          year: item.cover_date ? parseInt(item.cover_date.slice(0, 4)) : null,
          publisher: item.volume?.publisher?.name || publisher || '',
          volumeName: item.volume?.name || '',
          volumeId: item.volume?.id || null,
          variantDescription: '',
          thumbUrl: item.image?.small_url || '',
          coverUrl: item.image?.original_url || '',
          source: 'issue_search'
        });
      }
    }
  } catch (err: any) {
    console.warn('[SCAN-ITEM] Issue search error:', err.message);
  }
  
  // If we have a specific issue number, also try volume search + issue filter
  if (issue && results.length < 5) {
    console.log('[SCAN-ITEM] Trying volume + issue approach...');
    
    const volumeUrl = `https://comicvine.gamespot.com/api/search/?api_key=${apiKey}&format=json&resources=volume&query=${encodeURIComponent(title)}&field_list=id,name,publisher,start_year,count_of_issues&limit=10`;
    
    try {
      const volResponse = await withTimeout(
        fetch(volumeUrl, {
          headers: { 'User-Agent': 'GrailSeeker-Scanner/1.0' }
        }),
        15000,
        'ComicVine volume search'
      );
      
      if (volResponse.ok) {
        const volData = await volResponse.json();
        const volumes = volData.results || [];
        console.log('[SCAN-ITEM] Found', volumes.length, 'volumes');
        
        // For each volume, query for the specific issue
        for (const vol of volumes.slice(0, 5)) {
          const issueUrl = `https://comicvine.gamespot.com/api/issues/?api_key=${apiKey}&format=json&filter=volume:${vol.id},issue_number:${issue}&field_list=id,name,issue_number,volume,cover_date,image&limit=3`;
          
          try {
            const issueResponse = await fetch(issueUrl, {
              headers: { 'User-Agent': 'GrailSeeker-Scanner/1.0' }
            });
            
            if (issueResponse.ok) {
              const issueData = await issueResponse.json();
              
              for (const item of (issueData.results || [])) {
                // Check if we already have this result
                const exists = results.some(r => r.id === item.id);
                if (!exists) {
                  results.push({
                    id: item.id,
                    resource: 'issue',
                    title: item.volume?.name || vol.name || '',
                    issue: item.issue_number || '',
                    year: item.cover_date ? parseInt(item.cover_date.slice(0, 4)) : null,
                    publisher: vol.publisher?.name || publisher || '',
                    volumeName: vol.name || '',
                    volumeId: vol.id,
                    variantDescription: '',
                    thumbUrl: item.image?.small_url || '',
                    coverUrl: item.image?.original_url || '',
                    source: 'volume_issue'
                  });
                }
              }
            }
          } catch (err: any) {
            console.warn('[SCAN-ITEM] Issue fetch error for volume', vol.id, ':', err.message);
          }
        }
      }
    } catch (err: any) {
      console.warn('[SCAN-ITEM] Volume search error:', err.message);
    }
  }
  
  return results;
}

// Score results based on match quality
function scoreResults(
  results: any[], 
  searchTitle: string, 
  searchIssue: string | null,
  searchPublisher: string | null
): any[] {
  const normalizedTitle = searchTitle.toLowerCase().replace(/[^a-z0-9\s]/g, '');
  const titleWords = normalizedTitle.split(/\s+/).filter(w => w.length > 2);
  
  return results.map(result => {
    let score = 0.40; // Base score
    const breakdown = { title: 0, issue: 0, publisher: 0 };
    
    // Title matching (40% weight)
    const resultTitle = (result.title || '').toLowerCase().replace(/[^a-z0-9\s]/g, '');
    const resultWords = resultTitle.split(/\s+/).filter((w: string) => w.length > 2);
    
    // Check word overlap
    const matchingWords = titleWords.filter(w => resultWords.includes(w) || resultTitle.includes(w));
    const wordMatchRatio = titleWords.length > 0 ? matchingWords.length / titleWords.length : 0;
    
    // Check if titles contain each other
    const titleContains = resultTitle.includes(normalizedTitle) || normalizedTitle.includes(resultTitle);
    
    breakdown.title = titleContains ? 0.40 : (wordMatchRatio * 0.35);
    
    // Issue number matching (35% weight)
    if (searchIssue && result.issue) {
      if (result.issue === searchIssue) {
        breakdown.issue = 0.35;
      } else if (parseInt(result.issue) === parseInt(searchIssue)) {
        breakdown.issue = 0.30;
      }
    } else if (!searchIssue) {
      // No issue to match, give partial credit
      breakdown.issue = 0.15;
    }
    
    // Publisher matching (15% weight)
    if (searchPublisher && result.publisher) {
      if (result.publisher.toLowerCase().includes(searchPublisher.toLowerCase())) {
        breakdown.publisher = 0.15;
      }
    } else if (!searchPublisher) {
      // No publisher to match
      breakdown.publisher = 0.05;
    }
    
    score = breakdown.title + breakdown.issue + breakdown.publisher;
    
    // Boost if multiple factors match well
    if (breakdown.title >= 0.30 && breakdown.issue >= 0.30) {
      score = Math.min(0.98, score + 0.10);
    }
    
    return {
      ...result,
      score: Math.round(score * 100) / 100,
      scoreBreakdown: breakdown,
      matchMode: 'search'
    };
  }).sort((a, b) => b.score - a.score);
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

    const body = await req.json();
    // Support both imageBase64 and imageData for compatibility
    const imageBase64 = body.imageBase64 || body.imageData?.replace(/^data:image\/[a-z]+;base64,/, '');
    const textQuery = body.textQuery;

    const COMICVINE_API_KEY = Deno.env.get("COMICVINE_API_KEY");
    const GOOGLE_VISION_API_KEY = Deno.env.get("GOOGLE_VISION_API_KEY");
    
    if (!COMICVINE_API_KEY || !GOOGLE_VISION_API_KEY) {
      console.error('[SCAN-ITEM] Missing API keys');
      return new Response(JSON.stringify({ ok: false, error: "Server configuration error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let ocrText = "";
    let visionTime = 0;
    
    if (textQuery) {
      ocrText = textQuery;
      console.log('[SCAN-ITEM] Using text query:', textQuery);
    } else if (imageBase64) {
      console.log('[SCAN-ITEM] Calling Google Vision API...');
      const visionStartTime = Date.now();
      
      // Clean base64 if it has data URL prefix
      const cleanBase64 = imageBase64.replace(/^data:image\/[a-z]+;base64,/, '');
      
      try {
        const visionRes = await withTimeout(
          fetch(
            `https://vision.googleapis.com/v1/images:annotate?key=${GOOGLE_VISION_API_KEY}`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                requests: [{
                  image: { content: cleanBase64 },
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
          const annotations = visionData.responses?.[0]?.textAnnotations || [];
          ocrText = annotations?.[0]?.description || "";
          console.log('[SCAN-ITEM] OCR extracted (' + visionTime + 'ms):', ocrText.substring(0, 300));
        } else {
          const errorText = await visionRes.text();
          console.error('[SCAN-ITEM] Vision API error:', visionRes.status, errorText);
        }
      } catch (err: any) {
        console.error('[SCAN-ITEM] Vision error:', err.message);
      }
    }

    if (!ocrText) {
      return new Response(
        JSON.stringify({
          ok: false,
          error: "No text could be extracted from the image",
          picks: [],
          extracted: {}
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Extract data from OCR
    const isSlab = detectSlab(ocrText);
    const { title, issue, confidence: extractionConfidence, method: extractionMethod } = extractTitleAndIssue(ocrText);
    const publisher = extractPublisher(ocrText);
    const year = extractYear(ocrText);
    
    console.log('[SCAN-ITEM] Extracted:', { title, issue, publisher, year, isSlab, extractionMethod });

    let results: any[] = [];
    
    if (title) {
      // Search ComicVine with extracted data
      results = await searchComicVine(COMICVINE_API_KEY, title, issue, publisher);
      
      // Score results
      results = scoreResults(results, title, issue, publisher);
      
      console.log('[SCAN-ITEM] Final results count:', results.length);
      if (results.length > 0) {
        console.log('[SCAN-ITEM] Top result:', results[0].title, '#' + results[0].issue, 'score:', results[0].score);
      }
    } else {
      console.log('[SCAN-ITEM] No title extracted, returning empty results');
    }

    const totalTime = Date.now() - startTime;

    return new Response(
      JSON.stringify({
        ok: true,
        extracted: {
          title,
          issueNumber: issue,
          publisher,
          year,
          isSlab,
          finalCleanTitle: title,
          extractionMethod,
          extractionConfidence
        },
        picks: results.slice(0, 10),
        ocrText,
        timings: {
          vision: visionTime,
          total: totalTime
        },
        debug: {
          queryMode: 'search',
          resultCount: results.length,
          extractionMethod
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
