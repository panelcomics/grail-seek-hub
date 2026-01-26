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
  /COLLECTOR'S EDITION/gi,
  /LIMITED SERIES/gi,
];

// Known title prefixes to help extraction
const KNOWN_TITLE_PATTERNS = [
  'Amazing Spider-Man', 'Spectacular Spider-Man', 'Web of Spider-Man', 'Spider-Man',
  'Uncanny X-Men', 'X-Men', 'New Mutants', 'X-Force', 'Wolverine', 'Cable',
  'Avengers', 'New Avengers', 'West Coast Avengers', 'Mighty Avengers',
  'Fantastic Four', 'Incredible Hulk', 'Iron Man', 'Thor', 'Captain America',
  'Daredevil', 'Punisher', 'Ghost Rider', 'Moon Knight', 'Blade',
  'Batman', 'Detective Comics', 'Superman', 'Action Comics', 'Wonder Woman',
  'Justice League', 'Green Lantern', 'Flash', 'Aquaman', 'Teen Titans',
  'Swamp Thing', 'Saga of the Swamp Thing', 'Hellblazer', 'Sandman', 'Preacher',
  'Spawn', 'Savage Dragon', 'Invincible', 'Walking Dead', 'Saga',
  'Teenage Mutant Ninja Turtles', 'TMNT', 'Star Wars', 'Transformers', 'G.I. Joe',
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

// Levenshtein distance for fuzzy matching
function levenshtein(a: string, b: string): number {
  const matrix: number[][] = [];
  for (let i = 0; i <= b.length; i++) matrix[i] = [i];
  for (let j = 0; j <= a.length; j++) matrix[0][j] = j;
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      matrix[i][j] = b[i-1] === a[j-1] 
        ? matrix[i-1][j-1] 
        : Math.min(matrix[i-1][j-1] + 1, matrix[i][j-1] + 1, matrix[i-1][j] + 1);
    }
  }
  return matrix[b.length][a.length];
}

// Similarity ratio (0-1)
function similarity(a: string, b: string): number {
  const maxLen = Math.max(a.length, b.length);
  if (maxLen === 0) return 1;
  return 1 - levenshtein(a, b) / maxLen;
}

// Extract title and issue from OCR text using multiple strategies
function extractTitleAndIssue(ocrText: string): { 
  title: string | null; 
  issue: string | null;
  confidence: number;
  method: string;
} {
  const cleanedText = cleanOcrText(ocrText);
  console.log('[SCAN-ITEM] Cleaned OCR text:', cleanedText.substring(0, 300));
  
  // Strategy 0: Check for known title patterns first (most reliable)
  const lowerText = cleanedText.toLowerCase();
  for (const knownTitle of KNOWN_TITLE_PATTERNS) {
    const lowerKnown = knownTitle.toLowerCase();
    if (lowerText.includes(lowerKnown)) {
      // Found known title, now look for issue number nearby
      const idx = lowerText.indexOf(lowerKnown);
      const afterTitle = cleanedText.substring(idx + knownTitle.length, idx + knownTitle.length + 30);
      const issueMatch = afterTitle.match(/\s*#?\s*(\d{1,4})\b/);
      const issue = issueMatch ? issueMatch[1] : null;
      console.log('[SCAN-ITEM] Strategy 0 (known title):', knownTitle, '#', issue);
      return { title: knownTitle, issue, confidence: 0.95, method: 'known_title' };
    }
  }
  
  // Strategy 1: Look for "Title #Number" pattern
  const hashPatterns = [
    /\b([A-Z][A-Za-z\-'\s]{2,50}?)\s*#\s*(\d{1,4})\b/g,
    /\b([A-Z][a-z]+(?:\s+[A-Za-z][a-z]+){1,6})\s*#\s*(\d{1,4})\b/g,
  ];
  
  for (const pattern of hashPatterns) {
    const matches = [...cleanedText.matchAll(pattern)];
    if (matches.length > 0) {
      const best = matches.reduce((a, b) => (a[1].length > b[1].length) ? a : b);
      const title = best[1].trim();
      const issue = best[2];
      
      if (title.split(/\s+/).length >= 2 || title.length >= 6) {
        console.log('[SCAN-ITEM] Strategy 1 (hash pattern):', title, '#', issue);
        return { title, issue, confidence: 0.9, method: 'hash_pattern' };
      }
    }
  }
  
  // Strategy 2: Look for "No. X" or "Issue X" patterns
  const noMatch = cleanedText.match(/\b([A-Z][A-Za-z\-'\s]{2,50}?)\s+(?:No\.?|Issue|Vol\.?)\s*(\d{1,4})\b/i);
  if (noMatch) {
    const title = noMatch[1].trim();
    const issue = noMatch[2];
    console.log('[SCAN-ITEM] Strategy 2 (No/Issue pattern):', title, '#', issue);
    return { title, issue, confidence: 0.85, method: 'no_pattern' };
  }
  
  // Strategy 3: Look for standalone issue number and find nearby title-like text
  const standaloneIssue = cleanedText.match(/\b#\s*(\d{1,4})\b/);
  if (standaloneIssue) {
    const issue = standaloneIssue[1];
    const words = cleanedText.split(/\s+/);
    const hashIdx = words.findIndex(w => w.includes('#'));
    
    // Take 2-5 words before the hash as title
    if (hashIdx > 1) {
      const titleWords = words.slice(Math.max(0, hashIdx - 5), hashIdx)
        .filter(w => /^[A-Z]/.test(w) && w.length > 1);
      if (titleWords.length >= 2) {
        const title = titleWords.join(' ');
        console.log('[SCAN-ITEM] Strategy 3 (words before hash):', title, '#', issue);
        return { title, issue, confidence: 0.75, method: 'before_hash' };
      }
    }
    
    // Or find capitalized multi-word phrases anywhere
    const titleMatch = cleanedText.match(/\b([A-Z][A-Za-z\-']+(?:\s+[A-Za-z\-']+){1,5})\b/);
    if (titleMatch) {
      const title = titleMatch[1].trim();
      if (title.length >= 5) {
        console.log('[SCAN-ITEM] Strategy 3 (standalone issue):', title, '#', issue);
        return { title, issue, confidence: 0.7, method: 'standalone_issue' };
      }
    }
  }
  
  // Strategy 4: Just extract any plausible title for search
  const titleOnlyMatch = cleanedText.match(/\b([A-Z][a-z]+(?:\s+(?:of|the|and|The|Of|And|[A-Z][a-z]+)){1,5})\b/);
  if (titleOnlyMatch) {
    const title = titleOnlyMatch[1].trim();
    console.log('[SCAN-ITEM] Strategy 4 (title only):', title);
    return { title, issue: null, confidence: 0.5, method: 'title_only' };
  }
  
  // Strategy 5: First N capitalized words as fallback
  const firstCaps = cleanedText.match(/^([A-Z][A-Za-z]+(?:\s+[A-Za-z]+){0,4})/);
  if (firstCaps) {
    console.log('[SCAN-ITEM] Strategy 5 (first caps):', firstCaps[1]);
    return { title: firstCaps[1], issue: null, confidence: 0.4, method: 'first_caps' };
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

// Variant cover detection patterns
interface VariantInfo {
  isVariant: boolean;
  variantType: string | null;
  variantDetails: string | null;
  ratioVariant: string | null;
  artistName: string | null;
}

function detectVariantCover(ocrText: string): VariantInfo {
  const lower = ocrText.toLowerCase();
  const result: VariantInfo = {
    isVariant: false,
    variantType: null,
    variantDetails: null,
    ratioVariant: null,
    artistName: null
  };
  
  // Ratio variant patterns (1:10, 1:25, 1:50, 1:100, etc.)
  const ratioMatch = ocrText.match(/\b1[:\/](\d{1,4})\b/i);
  if (ratioMatch) {
    result.isVariant = true;
    result.variantType = 'ratio';
    result.ratioVariant = `1:${ratioMatch[1]}`;
    result.variantDetails = `${result.ratioVariant} Incentive Variant`;
  }
  
  // Virgin/textless cover
  if (/\b(virgin|textless|logo[\s-]?free|clean\s*cover)\b/i.test(ocrText)) {
    result.isVariant = true;
    result.variantType = result.variantType || 'virgin';
    result.variantDetails = result.variantDetails 
      ? `${result.variantDetails} (Virgin)` 
      : 'Virgin Cover (No Logo/Text)';
  }
  
  // Variant cover explicit mentions
  if (/\b(variant|var\.?|cvr\s*[b-z]|cover\s*[b-z])\b/i.test(ocrText)) {
    result.isVariant = true;
    result.variantType = result.variantType || 'variant';
    
    // Try to extract cover letter (Cover B, Cover C, etc.)
    const coverLetterMatch = ocrText.match(/\b(?:cvr|cover)\s*([b-z])\b/i);
    if (coverLetterMatch) {
      result.variantDetails = result.variantDetails || `Cover ${coverLetterMatch[1].toUpperCase()} Variant`;
    }
  }
  
  // Homage cover detection
  if (/\b(homage|tribute|reimagined)\b/i.test(ocrText)) {
    result.isVariant = true;
    result.variantType = result.variantType || 'homage';
    result.variantDetails = result.variantDetails || 'Homage Variant';
  }
  
  // Sketch/B&W variant
  if (/\b(sketch|b[\s&]*w|black\s*(and|&)?\s*white|line\s*art)\b/i.test(ocrText)) {
    result.isVariant = true;
    result.variantType = result.variantType || 'sketch';
    result.variantDetails = result.variantDetails || 'Sketch/B&W Variant';
  }
  
  // Foil/metallic variant
  if (/\b(foil|metallic|holographic|holo|chrome)\b/i.test(ocrText)) {
    result.isVariant = true;
    result.variantType = result.variantType || 'foil';
    result.variantDetails = result.variantDetails || 'Foil/Metallic Cover';
  }
  
  // Exclusive variants (store, convention, etc.)
  const exclusiveMatch = ocrText.match(/\b(exclusive|excl\.?|limited|convention|sdcc|nycc|c2e2|eccc|comic[\s-]?con)\b/i);
  if (exclusiveMatch) {
    result.isVariant = true;
    result.variantType = result.variantType || 'exclusive';
    const excType = exclusiveMatch[1].toUpperCase();
    if (['SDCC', 'NYCC', 'C2E2', 'ECCC'].includes(excType)) {
      result.variantDetails = result.variantDetails || `${excType} Convention Exclusive`;
    } else {
      result.variantDetails = result.variantDetails || 'Exclusive Variant';
    }
  }
  
  // Second/third/fourth printing
  const printingMatch = ocrText.match(/\b(second|2nd|third|3rd|fourth|4th|fifth|5th|\d+(?:st|nd|rd|th))\s*print(?:ing)?\b/i);
  if (printingMatch) {
    result.isVariant = true;
    result.variantType = result.variantType || 'printing';
    result.variantDetails = result.variantDetails || `${printingMatch[1]} Printing`;
  }
  
  // Newsstand variant
  if (/\bNewsstand\b/i.test(ocrText)) {
    result.isVariant = true;
    result.variantType = result.variantType || 'newsstand';
    result.variantDetails = result.variantDetails || 'Newsstand Edition';
  }
  
  // Try to extract artist name for variant covers
  // Common artist attribution patterns
  const artistPatterns = [
    /\bart(?:ist)?\s*(?:by|:)\s*([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/i,
    /\bcover\s*(?:by|:)\s*([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/i,
    /\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)\s+(?:variant|cover)\b/i,
  ];
  
  for (const pattern of artistPatterns) {
    const artistMatch = ocrText.match(pattern);
    if (artistMatch && artistMatch[1].length > 3) {
      result.artistName = artistMatch[1];
      break;
    }
  }
  
  // If we detected a variant but have no details, give generic description
  if (result.isVariant && !result.variantDetails) {
    result.variantDetails = 'Variant Cover';
  }
  
  console.log('[SCAN-ITEM] Variant detection:', result);
  return result;
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

// Score results based on match quality with fuzzy matching
function scoreResults(
  results: any[], 
  searchTitle: string, 
  searchIssue: string | null,
  searchPublisher: string | null
): any[] {
  const normalizedTitle = searchTitle.toLowerCase().replace(/[^a-z0-9\s]/g, '');
  const titleWords = normalizedTitle.split(/\s+/).filter(w => w.length > 2);
  
  return results.map(result => {
    let score = 0.30; // Base score
    const breakdown = { title: 0, issue: 0, publisher: 0, fuzzy: 0 };
    
    // Title matching (40% weight)
    const resultTitle = (result.title || '').toLowerCase().replace(/[^a-z0-9\s]/g, '');
    const resultWords = resultTitle.split(/\s+/).filter((w: string) => w.length > 2);
    
    // Exact word overlap
    const matchingWords = titleWords.filter(w => resultWords.includes(w));
    const wordMatchRatio = titleWords.length > 0 ? matchingWords.length / titleWords.length : 0;
    
    // Fuzzy word matching (handle OCR typos)
    let fuzzyMatches = 0;
    for (const searchWord of titleWords) {
      for (const resultWord of resultWords) {
        if (similarity(searchWord, resultWord) > 0.8) {
          fuzzyMatches++;
          break;
        }
      }
    }
    const fuzzyRatio = titleWords.length > 0 ? fuzzyMatches / titleWords.length : 0;
    
    // Check containment
    const titleContains = resultTitle.includes(normalizedTitle) || normalizedTitle.includes(resultTitle);
    
    // Overall title similarity
    const titleSim = similarity(normalizedTitle, resultTitle);
    
    breakdown.title = titleContains ? 0.40 : Math.max(wordMatchRatio * 0.35, titleSim * 0.30);
    breakdown.fuzzy = fuzzyRatio > wordMatchRatio ? (fuzzyRatio - wordMatchRatio) * 0.10 : 0;
    
    // Issue number matching (35% weight)
    if (searchIssue && result.issue) {
      const searchNum = parseInt(searchIssue);
      const resultNum = parseInt(result.issue);
      if (result.issue === searchIssue || resultNum === searchNum) {
        breakdown.issue = 0.35;
      } else if (Math.abs(resultNum - searchNum) <= 1) {
        // Off by one (OCR error)
        breakdown.issue = 0.20;
      }
    } else if (!searchIssue) {
      breakdown.issue = 0.10;
    }
    
    // Publisher matching (15% weight)
    if (searchPublisher && result.publisher) {
      if (result.publisher.toLowerCase().includes(searchPublisher.toLowerCase())) {
        breakdown.publisher = 0.15;
      }
    } else if (!searchPublisher) {
      breakdown.publisher = 0.05;
    }
    
    score = breakdown.title + breakdown.issue + breakdown.publisher + breakdown.fuzzy;
    
    // Boost for strong multi-factor match
    if (breakdown.title >= 0.30 && breakdown.issue >= 0.30) {
      score = Math.min(0.98, score + 0.12);
    }
    
    // Penalty for very low title match
    if (breakdown.title < 0.15) {
      score *= 0.6;
    }
    
    return {
      ...result,
      score: Math.round(score * 100) / 100,
      scoreBreakdown: breakdown,
      matchMode: 'search'
    };
  })
  .filter(r => r.score >= 0.35) // Filter out poor matches
  .sort((a, b) => b.score - a.score);
}

// Helper to log scan events
async function logScanEvent(
  supabase: any,
  data: {
    rawInput: string | null;
    normalizedInput: string | null;
    inputSource: 'typed' | 'image'; // Standardized: 'image' for scan-item, 'typed' for text query
    usedOcr: boolean; // True if OCR text was extracted and used
    confidence: number | null;
    strategy: string | null;
    source: string | null;
    rejectedReason: string | null;
    candidateCount: number;
    requestId: string;
  }
): Promise<void> {
  try {
    const { error } = await supabase.from('scan_events').insert({
      raw_input: data.rawInput?.slice(0, 500) || null,
      normalized_input: data.normalizedInput?.slice(0, 500) || null,
      input_source: data.inputSource,
      used_ocr: data.usedOcr,
      confidence: data.confidence,
      strategy: data.strategy,
      source: data.source,
      rejected_reason: data.rejectedReason,
      candidate_count: data.candidateCount,
      request_id: data.requestId,
    });
    if (error) {
      console.warn('[SCAN-ITEM] Failed to log scan event:', error.message);
    } else {
      console.log('[SCAN-ITEM] Scan event logged successfully');
    }
  } catch (err: any) {
    console.warn('[SCAN-ITEM] Error logging scan event:', err.message);
  }
}

serve(async (req) => {
  const startTime = Date.now();
  console.log('[SCAN-ITEM] Function invoked');
  
  // Generate request_id for correlating events
  const requestId = crypto.randomUUID();
  console.log('[SCAN-ITEM] Request ID:', requestId);
  
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Initialize supabase client early for logging
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    if (req.method !== "POST") {
      return new Response(JSON.stringify({ ok: false, error: "Method not allowed" }), {
        status: 405,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    // Support both imageBase64 and imageData for compatibility
    const imageBase64 = body.imageBase64 || body.imageData?.replace(/^data:image\/[a-z]+;base64,/, '');
    const textQuery = body.textQuery;

    const COMICVINE_API_KEY = Deno.env.get("COMICVINE_API_KEY");
    const GOOGLE_VISION_API_KEY = Deno.env.get("GOOGLE_VISION_API_KEY");
    
    if (!COMICVINE_API_KEY || !GOOGLE_VISION_API_KEY) {
      console.error('[SCAN-ITEM] Missing API keys');
      // Log the error event
      await logScanEvent(supabase, {
        rawInput: textQuery || '[image]',
        normalizedInput: null,
        inputSource: textQuery ? 'typed' : 'image',
        usedOcr: false,
        confidence: null,
        strategy: null,
        source: null,
        rejectedReason: 'missing_api_keys',
        candidateCount: 0,
        requestId,
      });
      return new Response(JSON.stringify({ ok: false, error: "Server configuration error", requestId }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let ocrText = "";
    let visionTime = 0;
    // Standardized: 'image' for camera/upload flow, 'typed' for text query
    let inputSource: 'typed' | 'image' = 'image';
    let usedOcr = false;
    let rawInput: string | null = null;
    
    if (textQuery) {
      ocrText = textQuery;
      rawInput = textQuery;
      inputSource = 'typed';
      usedOcr = false; // Text query is not OCR
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
          // Store OCR text in raw_input, use '[image]' as fallback
          rawInput = ocrText || '[image]';
          // input_source stays 'image' but we track OCR usage separately
          if (ocrText) {
            usedOcr = true;
          }
          console.log('[SCAN-ITEM] OCR extracted (' + visionTime + 'ms, used_ocr=' + usedOcr + '):', ocrText.substring(0, 300));
        } else {
          const errorText = await visionRes.text();
          console.error('[SCAN-ITEM] Vision API error:', visionRes.status, errorText);
          rawInput = '[image]';
        }
      } catch (err: any) {
        console.error('[SCAN-ITEM] Vision error:', err.message);
        rawInput = '[image]';
      }
    }

    if (!ocrText) {
      // Log the no-text event
      await logScanEvent(supabase, {
        rawInput: rawInput || '[image]',
        normalizedInput: null,
        inputSource,
        usedOcr: false,
        confidence: null,
        strategy: null,
        source: null,
        rejectedReason: 'no_text_extracted',
        candidateCount: 0,
        requestId,
      });
      return new Response(
        JSON.stringify({
          ok: false,
          error: "No text could be extracted from the image",
          picks: [],
          extracted: {},
          requestId
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Extract data from OCR
    const isSlab = detectSlab(ocrText);
    const { title, issue, confidence: extractionConfidence, method: extractionMethod } = extractTitleAndIssue(ocrText);
    const publisher = extractPublisher(ocrText);
    const year = extractYear(ocrText);
    const variantInfo = detectVariantCover(ocrText);
    
    // Build normalized input (the query used for matching)
    const normalizedInput = title 
      ? (issue ? `${title} #${issue}` : title) + (publisher ? ` (${publisher})` : '')
      : null;
    
    console.log('[SCAN-ITEM] Extracted:', { title, issue, publisher, year, isSlab, extractionMethod, variantInfo });

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

    const topScore = results.length > 0 ? results[0].score : null;
    const topSource = results.length > 0 ? results[0].source : null;

    // Determine rejected_reason if no good matches
    let rejectedReason: string | null = null;
    if (!title) {
      rejectedReason = 'no_title_extracted';
    } else if (results.length === 0) {
      rejectedReason = 'no_matches_found';
    } else if (topScore !== null && topScore < 0.5) {
      rejectedReason = 'low_confidence';
    }

    // Log the scan event
    await logScanEvent(supabase, {
      rawInput: rawInput || ocrText,
      normalizedInput,
      inputSource,
      usedOcr,
      confidence: topScore,
      strategy: extractionMethod,
      source: topSource,
      rejectedReason,
      candidateCount: results.length,
      requestId,
    });

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
          extractionConfidence,
          // Variant detection fields
          isVariant: variantInfo.isVariant,
          variantType: variantInfo.variantType,
          variantDetails: variantInfo.variantDetails,
          ratioVariant: variantInfo.ratioVariant,
          variantArtist: variantInfo.artistName
        },
        picks: results.slice(0, 10),
        ocrText,
        requestId, // Return request_id to frontend for correlation
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
    // Log the error event
    await logScanEvent(supabase, {
      rawInput: '[error]',
      normalizedInput: null,
      inputSource: 'image',
      usedOcr: false,
      confidence: null,
      strategy: null,
      source: null,
      rejectedReason: `error: ${error.message?.slice(0, 100)}`,
      candidateCount: 0,
      requestId,
    });
    return new Response(
      JSON.stringify({
        ok: false,
        error: error.message || "Internal server error",
        requestId
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      }
    );
  }
});
