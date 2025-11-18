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

// Known comic series titles for fuzzy matching (expanded list)
const KNOWN_COMIC_TITLES = [
  'Amazing Spider-Man', 'Spider-Man', 'Spider Man', 'Peter Parker Spider-Man',
  'Spectacular Spider-Man', 'Web of Spider-Man', 'Sensational Spider-Man',
  'X-Men', 'Uncanny X-Men', 'Astonishing X-Men', 'New X-Men', 'X-Force',
  'Batman', 'Detective Comics', 'Batman Dark Knight', 'Batman Incorporated',
  'Superman', 'Action Comics', 'Superman Man of Steel', 'Adventures of Superman',
  'Avengers', 'New Avengers', 'Mighty Avengers', 'Young Avengers',
  'Justice League', 'Justice League of America', 'Justice League International',
  'Fantastic Four', 'Iron Man', 'Invincible Iron Man', 'Captain America',
  'Thor', 'Mighty Thor', 'Journey into Mystery', 'Hulk', 'Incredible Hulk',
  'Wolverine', 'Daredevil', 'Punisher', 'Ghost Rider', 'Silver Surfer',
  'Flash', 'Green Lantern', 'Green Lantern Corps', 'Wonder Woman',
  'Spawn', 'Walking Dead', 'Invincible', 'Saga', 'Sandman', 'Watchmen',
  'V for Vendetta', 'Hellboy', 'Amazing Fantasy', 'Tales of Suspense',
  'Strange Tales', 'New Mutants', 'Teen Titans', 'Aquaman', 'Hawkman',
  'Green Arrow', 'Black Panther', 'Doctor Strange', 'Ant-Man', 'Wasp',
  'Captain Marvel', 'Ms Marvel', 'Deadpool', 'Cable', 'Venom', 'Carnage'
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
  /ANNUAL/gi,
  /HE'S DIFFERENT/gi,
  /HE'S DEADLY/gi,
  /HE'S THE GREATEST/gi,
  /SHE'S/gi,
  /PAGE QUALITY/gi,
  /\b[A-Z]{2,}\b(?:\s+[A-Z]{2,}){2,}/g, // All-caps marketing phrases
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

// Levenshtein distance for fuzzy string matching
function levenshteinDistance(str1: string, str2: string): number {
  const s1 = str1.toLowerCase();
  const s2 = str2.toLowerCase();
  const matrix: number[][] = [];

  for (let i = 0; i <= s2.length; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= s1.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= s2.length; i++) {
    for (let j = 1; j <= s1.length; j++) {
      if (s2[i - 1] === s1[j - 1]) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1,     // insertion
          matrix[i - 1][j] + 1      // deletion
        );
      }
    }
  }

  return matrix[s2.length][s1.length];
}

// Calculate similarity score (0-1) between two strings
function calculateSimilarity(str1: string, str2: string): number {
  const distance = levenshteinDistance(str1, str2);
  const maxLength = Math.max(str1.length, str2.length);
  if (maxLength === 0) return 1;
  return 1 - (distance / maxLength);
}

// Extract all potential title candidates from OCR text
function extractTitleCandidates(text: string): string[] {
  const candidates: string[] = [];
  
  // Exclude these terms from title detection
  const excludeTerms = [
    'cgc', 'cbcs', 'universal grade', 'signature series', 'white pages', 
    'off-white', 'page quality', 'certification', 'approved by', 
    'comics code', 'cad authority', "he's", "she's", "it's", "they're",
    'different', 'deadly', 'greatest', 'page', 'quality'
  ];
  
  // Split into lines and filter out label/grading text
  const lines = text.split('\n').filter(line => {
    const lower = line.toLowerCase();
    return !excludeTerms.some(term => lower.includes(term)) &&
           !/\b\d{6,}\b/.test(line) && // Cert numbers
           !/^\d\.?\d?$/.test(line.trim()); // Grade numbers like 9.8
  });
  
  // Look for capitalized phrases (2-5 words)
  const phrasePattern = /\b([A-Z][A-Za-z]*(?:\s+[A-Z][A-Za-z]*){1,4})\b/g;
  
  for (const line of lines) {
    let match;
    while ((match = phrasePattern.exec(line)) !== null) {
      const candidate = match[1].trim();
      // Must be at least 5 characters and not just "THE" or similar
      if (candidate.length >= 5 && !excludeTerms.some(term => candidate.toLowerCase().includes(term))) {
        candidates.push(candidate);
      }
    }
  }
  
  return [...new Set(candidates)]; // Remove duplicates
}

// Fuzzy match a candidate against known comic titles
function fuzzyMatchTitle(candidate: string): { title: string; score: number } | null {
  let bestMatch: { title: string; score: number } | null = null;
  
  for (const knownTitle of KNOWN_COMIC_TITLES) {
    const score = calculateSimilarity(candidate, knownTitle);
    
    // Also check if candidate contains the known title
    const candidateLower = candidate.toLowerCase();
    const knownLower = knownTitle.toLowerCase();
    const containsMatch = candidateLower.includes(knownLower) || knownLower.includes(candidateLower);
    
    // Boost score if there's a substring match
    const finalScore = containsMatch ? Math.max(score, 0.85) : score;
    
    if (finalScore >= 0.70 && (!bestMatch || finalScore > bestMatch.score)) {
      bestMatch = { title: knownTitle, score: finalScore };
    }
  }
  
  return bestMatch;
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

// Extract series title from pattern like "Title #Number"
function extractSeriesTitleFromPattern(text: string): { title: string; issue: string | null; confidence: number } | null {
  // Look for patterns like "Amazing Spider-Man #129" or "Avengers #4"
  const patterns = [
    // Pattern: 2-5 words followed by #number
    /\b([A-Z][A-Za-z\s&'-]{3,60}?)\s*#\s*(\d{1,4})\b/,
    // Pattern: "The Title Name #Number"
    /\b(The\s+[A-Z][A-Za-z\s&'-]{3,60}?)\s*#\s*(\d{1,4})\b/i,
  ];
  
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      let seriesTitle = match[1].trim();
      const issueNum = match[2];
      
      // Clean the series title
      seriesTitle = cleanTitle(seriesTitle);
      
      // Verify it looks like a real title (not just junk)
      const words = seriesTitle.split(/\s+/);
      if (words.length >= 2 && words.length <= 6) {
        // Check that at least one word is longer than 3 characters
        const hasRealWord = words.some(w => w.length > 3);
        if (hasRealWord) {
          console.log('[SCAN-ITEM] Pattern match found:', seriesTitle, '#' + issueNum);
          return { title: seriesTitle, issue: issueNum, confidence: 0.95 };
        }
      }
    }
  }
  
  return null;
}

// Check if a title looks like junk
function isTitleJunk(title: string): boolean {
  if (!title || title.length < 3) return true;
  
  const words = title.split(/\s+/);
  
  // Too few words or just the publisher name
  if (words.length <= 2) {
    const publishers = ['DC', 'Marvel', 'Image', 'Dark Horse', 'IDW', 'Boom', 'Vertigo'];
    if (publishers.some(pub => title.toUpperCase().includes(pub.toUpperCase()))) {
      return true;
    }
  }
  
  // All words are very short
  const allShort = words.every(w => w.length <= 3);
  if (allShort) return true;
  
  // Check for obvious marketing blurbs
  const junkPhrases = ['HE\'S', 'SHE\'S', 'IT\'S', 'THEY\'RE', 'CAD', 'OS MARVEL'];
  if (junkPhrases.some(phrase => title.toUpperCase().includes(phrase))) {
    return true;
  }
  
  return false;
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
  
  // NEW ALGORITHM: Region-based extraction with fuzzy matching
  console.log('[SCAN-ITEM] 🔍 Starting title extraction pipeline...');
  
  // STEP 1: Extract all potential title candidates from COVER TEXT ONLY
  const detectedTitles = extractTitleCandidates(coverText);
  console.log('[SCAN-ITEM] Detected title candidates:', detectedTitles);
  
  // STEP 2: Fuzzy match each candidate against known comic titles
  const matchedTitles = detectedTitles.map(candidate => {
    const match = fuzzyMatchTitle(candidate);
    return {
      candidate,
      matchedTitle: match?.title || null,
      score: match?.score || 0
    };
  }).filter(m => m.matchedTitle !== null);
  
  console.log('[SCAN-ITEM] Fuzzy matched titles:', matchedTitles);
  
  // STEP 3: Choose the best match
  let chosenTitle = "";
  let confidenceScoreTitle = 0;
  
  if (matchedTitles.length > 0) {
    // Sort by score and pick the best
    matchedTitles.sort((a, b) => b.score - a.score);
    const best = matchedTitles[0];
    chosenTitle = best.matchedTitle!;
    confidenceScoreTitle = best.score;
    console.log('[SCAN-ITEM] ✅ Chosen title:', chosenTitle, 'with confidence:', confidenceScoreTitle);
  } else {
    // FALLBACK: Try pattern-based extraction
    const patternResult = extractSeriesTitleFromPattern(ocrText);
    if (patternResult) {
      chosenTitle = patternResult.title;
      confidenceScoreTitle = patternResult.confidence;
      console.log('[SCAN-ITEM] ✅ Used pattern extraction fallback:', chosenTitle);
    } else {
      console.log('[SCAN-ITEM] ⚠️ No title match found');
    }
  }
  
  // STEP 4: Clean the chosen title
  const finalCleanTitle = chosenTitle ? cleanTitle(chosenTitle) : "";
  
  // Extract issue number from cover text (separate from title)
  let issueNumber: string | null = null;
  const issuePatterns = [
    /#\s*(\d{1,4})\b/,
    /\bNo\.?\s*(\d{1,4})\b/i,
    /\bIssue\s*(\d{1,4})\b/i
  ];
  
  const cleanCoverText = coverText.split('\n').filter(line => {
    const lower = line.toLowerCase();
    return !['cgc', 'cbcs', 'universal', 'grade'].some(term => lower.includes(term));
  }).join(' ');
  
  for (const pattern of issuePatterns) {
    const match = cleanCoverText.match(pattern);
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
  
  // Build series candidate from pattern if available
  let seriesCandidateFromPattern = "";
  const patternFinal = extractSeriesTitleFromPattern(ocrText);
  if (patternFinal) {
    seriesCandidateFromPattern = `${patternFinal.title} #${patternFinal.issue}`;
  }
  
  return { 
    title: finalCleanTitle || null, 
    issueNumber, 
    publisher, 
    year,
    isSlab,
    coverText: coverText.substring(0, 200),
    slabText: slabText.substring(0, 200),
    finalCleanTitle,
    seriesCandidateFromPattern,
    // New debug fields
    detectedTitles,
    chosenTitle,
    confidenceScoreTitle
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
      console.log('[SCAN-ITEM] Publisher filter:', tokens.publisher || 'none');
      
      try {
        // Build focused query: title + publisher if available
        let queryString = tokens.title;
        if (tokens.publisher) {
          queryString = `${tokens.title} ${tokens.publisher}`;
        }
        
        const volumes = await queryComicVineVolumes(COMICVINE_API_KEY, queryString);
        console.log('[SCAN-ITEM] Found', volumes.length, 'volumes for query:', queryString);
        
        // Filter volumes by publisher if we have one
        const filteredVolumes = tokens.publisher 
          ? volumes.filter(vol => {
              const volPub = vol.publisher?.name || '';
              return volPub.toLowerCase().includes(tokens.publisher.toLowerCase());
            })
          : volumes;
        
        console.log('[SCAN-ITEM] After publisher filter:', filteredVolumes.length, 'volumes');
        
        for (const volume of filteredVolumes.slice(0, 5)) {
          const issues = await queryComicVineIssue(COMICVINE_API_KEY, volume.id, tokens.issueNumber);
          
          for (const issue of issues) {
            const volumePub = volume.publisher?.name || '';
            const volumeName = issue.volume?.name || volume.name;
            
            // Calculate score based on match quality
            let score = 0.70; // Base score
            let scoreBreakdown = { title: 0, publisher: 0, issue: 0 };
            
            // Title match (check if volume name contains keywords from finalCleanTitle)
            const titleWords = tokens.finalCleanTitle.toLowerCase().split(/\s+/).filter((w: string) => w.length > 2);
            const volumeNameLower = volumeName.toLowerCase();
            const titleMatchCount = titleWords.filter((w: string) => volumeNameLower.includes(w)).length;
            const titleMatchRatio = titleWords.length > 0 ? titleMatchCount / titleWords.length : 0;
            scoreBreakdown.title = titleMatchRatio * 0.40; // 40% weight for title
            
            // Publisher match
            if (tokens.publisher && volumePub.toLowerCase().includes(tokens.publisher.toLowerCase())) {
              scoreBreakdown.publisher = 0.30; // 30% weight for publisher
            }
            
            // Issue number match (exact)
            if (issue.issue_number === tokens.issueNumber) {
              scoreBreakdown.issue = 0.30; // 30% weight for issue
            }
            
            score = scoreBreakdown.title + scoreBreakdown.publisher + scoreBreakdown.issue;
            
            // Bonus: if all three match well
            if (scoreBreakdown.title >= 0.30 && scoreBreakdown.publisher > 0 && scoreBreakdown.issue > 0) {
              score = Math.min(0.98, score + 0.10); // Boost to near-perfect
            }
            
            console.log(`[SCAN-ITEM] Result: ${volumeName} #${issue.issue_number} - Score: ${score.toFixed(2)} (T:${scoreBreakdown.title.toFixed(2)} P:${scoreBreakdown.publisher.toFixed(2)} I:${scoreBreakdown.issue.toFixed(2)})`);
            
            results.push({
              id: issue.id,
              resource: 'issue',
              title: volumeName,
              issue: issue.issue_number,
              year: issue.cover_date ? parseInt(issue.cover_date.slice(0, 4)) : null,
              publisher: volumePub || tokens.publisher || "",
              volumeName: volume.name,
              volumeId: volume.id,
              variantDescription: "",
              thumbUrl: issue.image?.small_url || "",
              coverUrl: issue.image?.original_url || "",
              score: score,
              matchMode: 'exact',
              scoreBreakdown
            });
          }
        }
        
        // Sort by score descending
        results.sort((a, b) => b.score - a.score);
        
        console.log('[SCAN-ITEM] Found', results.length, 'exact issue matches');
        console.log('[SCAN-ITEM] Top result:', results[0] ? `${results[0].title} #${results[0].issue} (${results[0].score.toFixed(2)})` : 'none');
        
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
          finalCleanTitle: tokens.finalCleanTitle,
          seriesCandidateFromPattern: tokens.seriesCandidateFromPattern || null,
          detectedTitles: tokens.detectedTitles || [],
          chosenTitle: tokens.chosenTitle || null,
          confidenceScoreTitle: tokens.confidenceScoreTitle || 0
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
          annotationsCount: ocrAnnotations.length,
          comicVineQuery: tokens.title && tokens.publisher 
            ? `${tokens.title} ${tokens.publisher}` 
            : tokens.title || 'fallback',
          seriesCandidateFromPattern: tokens.seriesCandidateFromPattern || 'none'
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