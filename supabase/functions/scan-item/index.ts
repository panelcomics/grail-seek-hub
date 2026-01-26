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

// REPRINT/TPB FILTER: Keywords that indicate this is NOT an original single issue
// Used to penalize or filter out collected editions from scan results
const REPRINT_KEYWORDS = [
  'tpb', 'trade paperback', 'graphic novel', 'omnibus', 'compendium',
  'collected', 'collection', 'complete', 'ultimate collection',
  'deluxe edition', 'hardcover', 'hc edition', 'prestige format',
  'treasury', 'facsimile', 'reprint', 'reprinting', 'magazine',
  'epic collection', 'masterworks', 'essentials', 'showcase presents',
  'archives', 'absolute', 'library edition', 'artist edition',
  'gallery edition', 'artifact edition', 'premiere edition',
];

// KEY ISSUE PATTERNS - first appearances and significant events
const KEY_ISSUE_PATTERNS = [
  { pattern: /first\s*appearance/i, tag: '1st Appearance' },
  { pattern: /1st\s*app(?:earance)?/i, tag: '1st Appearance' },
  { pattern: /origin\s*(?:of|story)/i, tag: 'Origin Story' },
  { pattern: /death\s*of/i, tag: 'Death Issue' },
  { pattern: /wedding/i, tag: 'Wedding Issue' },
  { pattern: /1st\s*print/i, tag: '1st Print' },
  { pattern: /key\s*issue/i, tag: 'Key Issue' },
  { pattern: /newsstand/i, tag: 'Newsstand Edition' },
];

// Known title prefixes to help extraction
// IMPORTANT: More specific patterns (with "Annual", "Giant-Size") MUST come FIRST
// so they are matched before the base title pattern
const KNOWN_TITLE_PATTERNS = [
  // Annual editions (must be before base titles!)
  'Fantastic Four Annual', 'Amazing Spider-Man Annual', 'Avengers Annual',
  'Uncanny X-Men Annual', 'X-Men Annual', 'Thor Annual', 'Iron Man Annual',
  'Captain America Annual', 'Incredible Hulk Annual', 'Daredevil Annual',
  'Justice League Annual', 'Batman Annual', 'Superman Annual', 'Action Comics Annual',
  'Detective Comics Annual', 'Wonder Woman Annual', 'Green Lantern Annual',
  'Teen Titans Annual', 'New Mutants Annual', 'Wolverine Annual',
  // Giant-Size editions
  'Giant-Size X-Men', 'Giant-Size Fantastic Four', 'Giant-Size Spider-Man',
  'Giant-Size Avengers', 'Giant-Size Hulk', 'Giant-Size Defenders',
  // King-Size editions
  'King-Size Special',
  // Base titles (after specific editions)
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
  // Comico and other indie titles
  'Jonny Quest', 'Johnny Quest', 'Robotech', 'Grendel', 'Mage', 'The Maze Agency',
  'Justice Machine', 'Elementals', 'E-Man', 'Nexus', 'Badger', 'Rocketeer',
];

// OCR typos for specific known titles - maps common OCR misreads to correct title
const OCR_TYPO_MAP: Record<string, string> = {
  // Jonny Quest variants
  'jonny quore': 'Jonny Quest',
  'jonny quoal': 'Jonny Quest',
  'jonny quost': 'Jonny Quest',
  'jonny quesh': 'Jonny Quest',
  'jonny queat': 'Jonny Quest',
  'jonny quesf': 'Jonny Quest',
  'jonny quesl': 'Jonny Quest',
  'johnny quore': 'Jonny Quest',
  'johnny quoal': 'Jonny Quest',
  'johnny quost': 'Jonny Quest',
  'jade incorporated': 'Jonny Quest',
  // X-Men variants
  'x-mer': 'X-Men',
  'x mer': 'X-Men',
  'xmen': 'X-Men',
  'uncanny x-mer': 'Uncanny X-Men',
  'uncany x-men': 'Uncanny X-Men',
  // Spider-Man variants
  'spider-mar': 'Spider-Man',
  'spiderman': 'Spider-Man',
  'spider mar': 'Spider-Man',
  'amazing spider-mar': 'Amazing Spider-Man',
  'amazing spiderman': 'Amazing Spider-Man',
  'amaz1ng spider-man': 'Amazing Spider-Man',
  'amazlng spider-man': 'Amazing Spider-Man',
  'spectacular spider-mar': 'Spectacular Spider-Man',
  // Fantastic Four variants
  'fantast1c four': 'Fantastic Four',
  'fantaslic four': 'Fantastic Four',
  'fantastic f0ur': 'Fantastic Four',
  'fantastic 4': 'Fantastic Four',
  'ff annual': 'Fantastic Four Annual',
  // Batman variants
  'batmar': 'Batman',
  'batmam': 'Batman',
  'ba7man': 'Batman',
  // Superman variants
  'supermar': 'Superman',
  'supermam': 'Superman',
  // Hulk variants
  'incredible hu1k': 'Incredible Hulk',
  'incredib1e hulk': 'Incredible Hulk',
  'incred1ble hulk': 'Incredible Hulk',
  // Avengers variants
  'avengcrs': 'Avengers',
  'avenger5': 'Avengers',
  // Common OCR issues
  'detectlve comics': 'Detective Comics',
  'detect1ve comics': 'Detective Comics',
  'teen t1tans': 'Teen Titans',
  'teen tltans': 'Teen Titans',
  'iron mar': 'Iron Man',
  'iron mam': 'Iron Man',
  'daredevll': 'Daredevil',
  'daredev1l': 'Daredevil',
  'cap7ain america': 'Captain America',
  'captain amer1ca': 'Captain America',
  'green lanlern': 'Green Lantern',
  'green 1antern': 'Green Lantern',
  'swamp th1ng': 'Swamp Thing',
  'saga of the swamp th1ng': 'Saga of the Swamp Thing',
  'new mut4nts': 'New Mutants',
  'new mutanls': 'New Mutants',
  'ghost r1der': 'Ghost Rider',
  'ghost rlider': 'Ghost Rider',
  'moon kn1ght': 'Moon Knight',
  'moonknight': 'Moon Knight',
};

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
  
  const lowerText = cleanedText.toLowerCase();
  
  // Strategy 0-PRE: Check explicit OCR typo map first (handles known OCR errors)
  for (const [typo, correctTitle] of Object.entries(OCR_TYPO_MAP)) {
    if (lowerText.includes(typo)) {
      // Find issue number anywhere in the text
      const issueMatch = cleanedText.match(/\b(\d{1,4})\b/);
      const issue = issueMatch ? issueMatch[1] : null;
      console.log('[SCAN-ITEM] Strategy 0-PRE (OCR typo map):', typo, '->', correctTitle, '#', issue);
      return { title: correctTitle, issue, confidence: 0.92, method: 'ocr_typo_map' };
    }
  }
  
  // Strategy 0a: Check for known title patterns first (most reliable)
  // Use fuzzy matching to catch OCR errors like "JONNY QUOH" → "Jonny Quest"
  // IMPORTANT: Check for "Annual" suffix enhancement - OCR may have words scattered
  const hasAnnualInText = /\bannual\b/i.test(lowerText);
  const hasGiantSizeInText = /\bgiant[\s-]?size\b/i.test(lowerText);
  
  for (const knownTitle of KNOWN_TITLE_PATTERNS) {
    const lowerKnown = knownTitle.toLowerCase();
    // Direct match
    if (lowerText.includes(lowerKnown)) {
      const idx = lowerText.indexOf(lowerKnown);
      const afterTitle = cleanedText.substring(idx + knownTitle.length, idx + knownTitle.length + 30);
      const issueMatch = afterTitle.match(/\s*#?\s*(\d{1,4})\b/);
      const issue = issueMatch ? issueMatch[1] : null;
      console.log('[SCAN-ITEM] Strategy 0a (known title):', knownTitle, '#', issue);
      return { title: knownTitle, issue, confidence: 0.95, method: 'known_title' };
    }
    
    // Check for base title match with "Annual" in text (words may be scattered in OCR)
    // e.g., "ANNUAL ... Fantastic FOUR" should become "Fantastic Four Annual"
    const isAnnualTitle = lowerKnown.includes('annual');
    const isGiantSizeTitle = lowerKnown.includes('giant-size');
    const baseTitle = knownTitle.replace(/ Annual$/i, '').replace(/^Giant-Size /i, '');
    const lowerBase = baseTitle.toLowerCase();
    
    if (!isAnnualTitle && hasAnnualInText && lowerText.includes(lowerBase)) {
      // Found base title (e.g., "Fantastic Four") and "Annual" appears elsewhere in OCR
      // Upgrade to Annual edition
      const annualTitle = `${baseTitle} Annual`;
      // Look for issue number - check for "#X" pattern or standalone digits after year
      const issuePatterns = [
        /\b#\s*(\d{1,3})\b/,       // #2
        /\bannual\b[^0-9]*(\d{1,3})\b/i,  // ANNUAL 2
        /\b(\d{1,2})\s*(?:19|20)\d{2}\b/  // Issue before year like "2 1964"
      ];
      let issue: string | null = null;
      for (const pattern of issuePatterns) {
        const match = cleanedText.match(pattern);
        if (match) {
          issue = match[1];
          break;
        }
      }
      console.log('[SCAN-ITEM] Strategy 0a+ (base + Annual detected):', annualTitle, '#', issue);
      return { title: annualTitle, issue, confidence: 0.95, method: 'known_title_annual' };
    }
    
    if (!isGiantSizeTitle && hasGiantSizeInText && lowerText.includes(lowerBase)) {
      // Found base title and "Giant-Size" in text
      const giantTitle = `Giant-Size ${baseTitle}`;
      const issueMatch = cleanedText.match(/\b#?\s*(\d{1,3})\b/);
      const issue = issueMatch ? issueMatch[1] : null;
      console.log('[SCAN-ITEM] Strategy 0a+ (Giant-Size + base detected):', giantTitle, '#', issue);
      return { title: giantTitle, issue, confidence: 0.95, method: 'known_title_giant' };
    }
    
    // Fuzzy match for OCR errors - LOWERED threshold from 0.75 to 0.60
    // "quore" vs "quest" needs lower threshold
    const knownWords = lowerKnown.split(/\s+/);
    if (knownWords.length >= 2) {
      const ocrWords = lowerText.split(/\s+/);
      let matchedWords = 0;
      let matchStartIdx = -1;
      
      for (let i = 0; i < ocrWords.length; i++) {
        for (const knownWord of knownWords) {
          // Lower threshold to 0.60 and allow 3-char words
          if (knownWord.length >= 3 && similarity(ocrWords[i], knownWord) > 0.60) {
            if (matchStartIdx === -1) matchStartIdx = i;
            matchedWords++;
            break;
          }
        }
      }
      
      // If we matched most words, consider it a fuzzy hit
      if (matchedWords >= Math.ceil(knownWords.length * 0.5) && matchStartIdx !== -1) {
        // For Annual editions, use smarter issue extraction to avoid price confusion
        // IMPORTANT: Filter out prices (25¢, $0.25) before extracting issue
        const textWithoutPrices = cleanedText.replace(/\d+[¢€$]/g, '').replace(/\$\d+(\.\d+)?/g, '');
        
        // Prioritized issue extraction patterns (in order of reliability)
        const fuzzyIssuePatterns = [
          /\b#\s*(\d{1,3})\b/,              // #2 (most reliable - explicit issue marker)
          /\b(\d{1,2})\s+(?:19|20)\d{2}\b/, // 2 1964 (issue before year)
          /\bannual\b[^0-9]*#?\s*(\d{1,3})\b/i, // ANNUAL #2 or ANNUAL 2
        ];
        
        let issue: string | null = null;
        for (const pattern of fuzzyIssuePatterns) {
          const match = textWithoutPrices.match(pattern);
          if (match) {
            issue = match[1];
            break;
          }
        }
        
        // Fallback: only if no pattern matched, use first standalone number (but NOT prices)
        if (!issue) {
          const fallbackMatch = textWithoutPrices.match(/\b(\d{1,4})\b/);
          issue = fallbackMatch ? fallbackMatch[1] : null;
        }
        
        console.log('[SCAN-ITEM] Strategy 0b (fuzzy known title):', knownTitle, '#', issue, 'matched', matchedWords, 'of', knownWords.length);
        return { title: knownTitle, issue, confidence: 0.88, method: 'fuzzy_known_title' };
      }
    }
  }
  
  // Strategy 0c: Look for title immediately after publisher (but NOT for 2-letter patterns like "DC")
  // Use only distinctive publishers to avoid false positives from "CDC" → "DC"
  const publisherPatterns = ['comico', 'marvel', 'image', 'dark horse', 'idw', 'boom', 'vertigo', 'valiant', 'eclipse', 'first comics', 'malibu'];
  for (const pubPat of publisherPatterns) {
    const pubIdx = lowerText.indexOf(pubPat);
    if (pubIdx !== -1) {
      // Extract the text after publisher
      const afterPub = cleanedText.substring(pubIdx + pubPat.length).trim();
      // Look for capitalized title words after publisher (common pattern: "COMICO JONNY QUEST")
      const titleMatch = afterPub.match(/^([A-Z][A-Za-z]+(?:\s+[A-Z][A-Za-z]+){0,4})/);
      if (titleMatch) {
        const potentialTitle = titleMatch[1].trim();
        // Make sure it's not just noise (at least 5 chars, not a single word like "THE")
        if (potentialTitle.length >= 5 && !/^(the|and|of|to|in|for|on|at|by)$/i.test(potentialTitle)) {
          // Look for issue number
          const afterTitle = afterPub.substring(potentialTitle.length);
          const issueMatch = afterTitle.match(/\s*#?\s*(\d{1,4})\b/);
          const issue = issueMatch ? issueMatch[1] : null;
          console.log('[SCAN-ITEM] Strategy 0c (after publisher):', potentialTitle, '#', issue);
          return { title: potentialTitle, issue, confidence: 0.85, method: 'after_publisher' };
        }
      }
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
  // IMPORTANT: Check indie publishers FIRST (before DC/Marvel) since they're more specific
  // Also use word boundaries to avoid "CDC" matching "DC"
  const publishers = [
    // Indie publishers first (more specific)
    { name: 'Comico', patterns: [/\bcomico\b/i] },
    { name: 'First Comics', patterns: [/\bfirst comics\b/i, /\bfirst\s+comics\b/i] },
    { name: 'Eclipse', patterns: [/\beclipse\b/i] },
    { name: 'Pacific', patterns: [/\bpacific comics\b/i, /\bpacific\b/i] },
    { name: 'Now Comics', patterns: [/\bnow comics\b/i] },
    { name: 'Malibu', patterns: [/\bmalibu\b/i] },
    { name: 'Dark Horse', patterns: [/\bdark horse\b/i] },
    { name: 'Vertigo', patterns: [/\bvertigo\b/i] },
    { name: 'Wildstorm', patterns: [/\bwildstorm\b/i] },
    { name: 'Valiant', patterns: [/\bvaliant\b/i] },
    { name: 'Dynamite', patterns: [/\bdynamite\b/i] },
    { name: 'IDW', patterns: [/\bidw\b/i] },
    { name: 'Boom', patterns: [/\bboom\b/i, /\bboom!\s*studios\b/i] },
    { name: 'Archie', patterns: [/\barchie\b/i] },
    { name: 'Charlton', patterns: [/\bcharlton\b/i] },
    // Major publishers last (with word boundaries to avoid "CDC" → "DC")
    { name: 'Image', patterns: [/\bimage comics\b/i, /\bimage\b/i] },
    { name: 'Marvel', patterns: [/\bmarvel comics\b/i, /\bmarvel\b/i] },
    { name: 'DC', patterns: [/\bdc comics\b/i, /\bdc\b(?!\s*\d)/i] }, // Avoid matching "CDC" or "DC 5"
  ];
  
  for (const pub of publishers) {
    for (const pattern of pub.patterns) {
      if (pattern.test(text)) {
        console.log('[SCAN-ITEM] Publisher detected:', pub.name, 'via pattern:', pattern.source);
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
  
// Newsstand vs Direct Edition detection (crucial for Bronze/Modern age comics)
  // Newsstand editions typically have UPC barcode, Direct editions have Spider-Man/DC bullet
  if (/\bNewsstand\b/i.test(ocrText) || /\bUPC\b/i.test(ocrText)) {
    result.isVariant = true;
    result.variantType = result.variantType || 'newsstand';
    result.variantDetails = result.variantDetails || 'Newsstand Edition (UPC)';
  }
  
  // Direct Edition detection
  if (/\bDirect\s*Edition\b/i.test(ocrText) || /\bDirect\s*Sales\b/i.test(ocrText)) {
    result.isVariant = true;
    result.variantType = result.variantType || 'direct';
    result.variantDetails = result.variantDetails || 'Direct Edition';
  }
  
  // Canadian Price Variant detection (important for collectors)
  if (/\b\d+\s*¢?\s*(?:CAN|CDN|CANADA)\b/i.test(ocrText) || /\bprice\s*variant\b/i.test(ocrText)) {
    result.isVariant = true;
    result.variantType = result.variantType || 'price_variant';
    result.variantDetails = result.variantDetails || 'Canadian Price Variant';
  }
  
  // UK Price Variant detection
  if (/\b\d+\s*(?:p|pence)\b/i.test(ocrText)) {
    result.isVariant = true;
    result.variantType = result.variantType || 'price_variant';
    result.variantDetails = result.variantDetails || 'UK Pence Variant';
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
  publisher: string | null,
  year: number | null = null // NEW: target year for vintage filtering
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
  
  console.log('[SCAN-ITEM] ComicVine search query:', searchQuery, 'target year:', year);
  
  // STRATEGY 1: Direct issue search
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
  
  // STRATEGY 2: For VINTAGE comics (pre-1980), do volume search with year priority
  // This helps find Silver/Bronze age comics that may not rank high in general search
  const isVintage = year && year < 1985;
  
  if (isVintage && issue) {
    console.log('[SCAN-ITEM] VINTAGE MODE: Searching for volumes from', year, '±5 years');
    
    // Search for volumes by title only (more likely to find vintage runs)
    const vintageVolumeUrl = `https://comicvine.gamespot.com/api/search/?api_key=${apiKey}&format=json&resources=volume&query=${encodeURIComponent(title)}&field_list=id,name,publisher,start_year,count_of_issues&limit=15`;
    
    try {
      const volResponse = await withTimeout(
        fetch(vintageVolumeUrl, {
          headers: { 'User-Agent': 'GrailSeeker-Scanner/1.0' }
        }),
        15000,
        'ComicVine vintage volume search'
      );
      
      if (volResponse.ok) {
        const volData = await volResponse.json();
        const volumes = volData.results || [];
        console.log('[SCAN-ITEM] Found', volumes.length, 'volumes for vintage search');
        
        // PRIORITIZE volumes that started near the target year
        const sortedVolumes = volumes.sort((a: any, b: any) => {
          const aYear = a.start_year || 2100;
          const bYear = b.start_year || 2100;
          const aDiff = Math.abs(aYear - (year || 1964));
          const bDiff = Math.abs(bYear - (year || 1964));
          return aDiff - bDiff; // Sort by closest to target year
        });
        
        console.log('[SCAN-ITEM] Vintage volumes sorted by year proximity:', 
          sortedVolumes.slice(0, 5).map((v: any) => `${v.name} (${v.start_year})`).join(', '));
        
        // Query top 5 volumes (sorted by year proximity) for the specific issue
        for (const vol of sortedVolumes.slice(0, 5)) {
          // Skip volumes that started way after our target year
          if (vol.start_year && vol.start_year > (year + 5)) {
            console.log('[SCAN-ITEM] Skipping volume', vol.name, 'start_year', vol.start_year, '> target+5');
            continue;
          }
          
          const issueUrl = `https://comicvine.gamespot.com/api/issues/?api_key=${apiKey}&format=json&filter=volume:${vol.id},issue_number:${issue}&field_list=id,name,issue_number,volume,cover_date,image&limit=3`;
          
          try {
            const issueResponse = await fetch(issueUrl, {
              headers: { 'User-Agent': 'GrailSeeker-Scanner/1.0' }
            });
            
            if (issueResponse.ok) {
              const issueData = await issueResponse.json();
              console.log('[SCAN-ITEM] Volume', vol.name, 'has', issueData.results?.length || 0, 'matching issues');
              
              for (const item of (issueData.results || [])) {
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
                    source: 'vintage_volume'
                  });
                }
              }
            }
          } catch (err: any) {
            console.warn('[SCAN-ITEM] Vintage issue fetch error for volume', vol.id, ':', err.message);
          }
        }
      }
    } catch (err: any) {
      console.warn('[SCAN-ITEM] Vintage volume search error:', err.message);
    }
  }
  
  // STRATEGY 3: Standard volume + issue approach (if we have an issue and need more results)
  if (issue && results.length < 5 && !isVintage) {
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
// NOW INCLUDES YEAR MATCHING for proper vintage comic selection
function scoreResults(
  results: any[], 
  searchTitle: string, 
  searchIssue: string | null,
  searchPublisher: string | null,
  searchYear: number | null = null // NEW: year from OCR
): any[] {
  const normalizedTitle = searchTitle.toLowerCase().replace(/[^a-z0-9\s]/g, '');
  const titleWords = normalizedTitle.split(/\s+/).filter(w => w.length > 2);
  
  console.log('[SCAN-ITEM] Scoring with year:', searchYear);
  
  return results.map(result => {
    let score = 0.30; // Base score
    const breakdown = { title: 0, issue: 0, publisher: 0, year: 0, fuzzy: 0 };
    
    // Title matching (35% weight - reduced from 40% to make room for year)
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
    
    breakdown.title = titleContains ? 0.35 : Math.max(wordMatchRatio * 0.30, titleSim * 0.25);
    breakdown.fuzzy = fuzzyRatio > wordMatchRatio ? (fuzzyRatio - wordMatchRatio) * 0.08 : 0;
    
    // Issue number matching (30% weight - reduced slightly)
    if (searchIssue && result.issue) {
      const searchNum = parseInt(searchIssue);
      const resultNum = parseInt(result.issue);
      if (result.issue === searchIssue || resultNum === searchNum) {
        breakdown.issue = 0.30;
      } else if (Math.abs(resultNum - searchNum) <= 1) {
        // Off by one (OCR error)
        breakdown.issue = 0.18;
      }
    } else if (!searchIssue) {
      breakdown.issue = 0.08;
    }
    
    // Publisher matching (15% weight)
    if (searchPublisher && result.publisher) {
      if (result.publisher.toLowerCase().includes(searchPublisher.toLowerCase())) {
        breakdown.publisher = 0.15;
      }
    } else if (!searchPublisher) {
      breakdown.publisher = 0.04;
    }
    
    // YEAR MATCHING (20% weight - CRITICAL for vintage comics!)
    // If year is visible on cover, strongly prefer matching year
    if (searchYear && result.year) {
      const resultYear = typeof result.year === 'number' ? result.year : parseInt(result.year);
      const yearDiff = Math.abs(resultYear - searchYear);
      
      if (yearDiff === 0) {
        // Exact year match - strong bonus!
        breakdown.year = 0.25;
        console.log('[SCAN-ITEM] Exact year match:', resultYear, 'for', result.title);
      } else if (yearDiff <= 1) {
        // Off by one year (OCR misread)
        breakdown.year = 0.18;
      } else if (yearDiff <= 3) {
        // Close enough
        breakdown.year = 0.08;
      } else if (yearDiff <= 10) {
        // Wrong era - significant penalty
        breakdown.year = -0.15;
        console.log('[SCAN-ITEM] Year mismatch:', resultYear, 'vs OCR', searchYear, 'for', result.title);
      } else {
        // Wrong decade entirely (e.g. 2008 vs 1964) - HEAVY penalty
        breakdown.year = -0.30;
        console.log('[SCAN-ITEM] Major year mismatch:', resultYear, 'vs OCR', searchYear, 'for', result.title);
      }
    }
    
    score = breakdown.title + breakdown.issue + breakdown.publisher + breakdown.year + breakdown.fuzzy;
    
    // Boost for strong multi-factor match
    if (breakdown.title >= 0.25 && breakdown.issue >= 0.25) {
      score = Math.min(0.98, score + 0.10);
    }
    
    // Extra boost for triple match (title + issue + year)
    if (breakdown.title >= 0.25 && breakdown.issue >= 0.25 && breakdown.year >= 0.15) {
      score = Math.min(0.99, score + 0.08);
      console.log('[SCAN-ITEM] Triple match bonus for:', result.title, '#', result.issue, result.year);
    }
    
    // Penalty for very low title match
    if (breakdown.title < 0.12) {
      score *= 0.6;
    }
    
    // REPRINT/TPB PENALTY: Reduce score for collected editions
    // This ensures single issues rank higher than TPBs, Omnibuses, etc.
    const resultTitleLower = resultTitle.toLowerCase();
    const volumeNameLower = (result.volumeName || '').toLowerCase();
    const combinedTitle = resultTitleLower + ' ' + volumeNameLower;
    
    let isReprint = false;
    for (const keyword of REPRINT_KEYWORDS) {
      if (combinedTitle.includes(keyword)) {
        isReprint = true;
        score = Math.max(0.20, score - 0.25); // Heavy penalty for reprints
        console.log('[SCAN-ITEM] Reprint penalty applied for:', result.title, 'keyword:', keyword);
        break;
      }
    }
    
    return {
      ...result,
      score: Math.round(score * 100) / 100,
      scoreBreakdown: breakdown,
      matchMode: 'search',
      _hasExactYear: breakdown.year >= 0.15,
      _hasExactIssue: breakdown.issue >= 0.25,
      isReprint, // Flag for UI to show/hide
    };
  })
  .filter(r => r.score >= 0.30) // Slightly lower threshold since we're more discriminating
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
    let correctionOverride: any = null;
    
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
    
    // KEY ISSUE DETECTION: Check for significant issue indicators in OCR text
    let keyIssueIndicator: string | null = null;
    for (const { pattern, tag } of KEY_ISSUE_PATTERNS) {
      if (pattern.test(ocrText)) {
        keyIssueIndicator = tag;
        console.log('[SCAN-ITEM] KEY ISSUE detected:', tag);
        break;
      }
    }
    
    // Build normalized input (the query used for matching)
    const normalizedInput = title 
      ? (issue ? `${title} #${issue}` : title) + (publisher ? ` (${publisher})` : '')
      : null;
    
    console.log('[SCAN-ITEM] Extracted:', { title, issue, publisher, year, isSlab, extractionMethod, variantInfo, keyIssueIndicator });

    let results: any[] = [];
    let searchStrategy = 'primary';
    
    if (title) {
      // SELF-LEARNING CORRECTION CACHE: Check scan_corrections table first
      // This returns user-verified matches instantly without API calls
      const correctionNormalized = (issue ? `${title.toLowerCase()} #${issue}` : title.toLowerCase()).trim();
      console.log('[SCAN-ITEM] Checking correction cache for:', correctionNormalized);
      
      try {
        const { data: correction, error: corrError } = await supabase
          .from('scan_corrections')
          .select('*')
          .eq('normalized_input', correctionNormalized)
          .order('created_at', { ascending: false })
          .limit(1);
        
        if (!corrError && correction && correction.length > 0) {
          const cached = correction[0];
          console.log('[SCAN-ITEM] CORRECTION CACHE HIT:', cached.selected_title, '#', cached.selected_issue);
          
          // Return cached correction as top result with high confidence
          correctionOverride = {
            id: cached.selected_comicvine_id,
            resource: 'issue',
            title: cached.selected_title,
            issue: cached.selected_issue || '',
            year: cached.selected_year,
            publisher: cached.selected_publisher || '',
            volumeName: cached.selected_title,
            volumeId: cached.selected_volume_id,
            thumbUrl: cached.selected_cover_url || '',
            coverUrl: cached.selected_cover_url || '',
            score: 0.98, // High confidence for correction override
            source: 'correction_override',
            matchMode: 'correction_cache',
          };
          
          results = [correctionOverride];
          searchStrategy = 'correction_cache';
        }
      } catch (err: any) {
        console.warn('[SCAN-ITEM] Correction cache lookup failed:', err.message);
      }
      
      // LOCAL HOT CACHE: Check comicvine_volumes table before API calls
      // Only if correction cache didn't hit
      if (results.length === 0) {
        console.log('[SCAN-ITEM] Checking local volume cache for:', title);
        
        try {
          const { data: cachedVolumes, error: volError } = await supabase
            .from('comicvine_volumes')
            .select('id, name, publisher, start_year')
            .ilike('name', `%${title}%`)
            .limit(5);
          
          if (!volError && cachedVolumes && cachedVolumes.length > 0) {
            console.log('[SCAN-ITEM] LOCAL CACHE: Found', cachedVolumes.length, 'cached volumes');
            
            // If we have an issue number, check comicvine_issues
            if (issue) {
              for (const vol of cachedVolumes) {
                const { data: cachedIssues } = await supabase
                  .from('comicvine_issues')
                  .select('id, name, issue_number, image_url, cover_date, writer, artist, key_notes')
                  .eq('volume_id', vol.id)
                  .eq('issue_number', issue)
                  .limit(1);
                
                if (cachedIssues && cachedIssues.length > 0) {
                  const cachedIssue = cachedIssues[0];
                  console.log('[SCAN-ITEM] LOCAL CACHE HIT:', vol.name, '#', cachedIssue.issue_number);
                  
                  results.push({
                    id: cachedIssue.id,
                    resource: 'issue',
                    title: vol.name,
                    issue: cachedIssue.issue_number || '',
                    year: cachedIssue.cover_date ? parseInt(cachedIssue.cover_date.slice(0, 4)) : vol.start_year,
                    publisher: vol.publisher || '',
                    volumeName: vol.name,
                    volumeId: vol.id,
                    thumbUrl: cachedIssue.image_url || '',
                    coverUrl: cachedIssue.image_url || '',
                    writer: cachedIssue.writer,
                    artist: cachedIssue.artist,
                    keyNotes: cachedIssue.key_notes,
                    score: 0.90, // High score for local cache hit
                    source: 'local_cache',
                    matchMode: 'local_cache',
                  });
                  searchStrategy = 'local_cache';
                }
              }
            }
          }
        } catch (err: any) {
          console.warn('[SCAN-ITEM] Local cache lookup failed:', err.message);
        }
      }
      
      // PASS 1: Primary search with extracted data (includes year for vintage mode)
      // Only if correction cache and local cache didn't produce results
      if (results.length === 0) {
        results = await searchComicVine(COMICVINE_API_KEY, title, issue, publisher, year);
        results = scoreResults(results, title, issue, publisher, year);
      }
      
      console.log('[SCAN-ITEM] Pass 1 results count:', results.length);
      if (results.length > 0) {
        console.log('[SCAN-ITEM] Pass 1 top result:', results[0].title, '#' + results[0].issue, 'score:', results[0].score);
      }
      
      // PASS 2: Multi-pass fallback if confidence < 60% or no results
      const topScore1 = results.length > 0 ? results[0].score : 0;
      if (topScore1 < 0.60 || results.length === 0) {
        console.log('[SCAN-ITEM] Triggering multi-pass fallback (score:', topScore1, ')');
        searchStrategy = 'multi_pass';
        
        // Try alternative queries:
        // 2a: Title only (no issue, no publisher)
        const titleOnlyResults = await searchComicVine(COMICVINE_API_KEY, title, null, null, year);
        const scoredTitleOnly = scoreResults(titleOnlyResults, title, issue, publisher, year);
        
        // 2b: If title has multiple words, try main word only
        const titleWords = title.split(/\s+/);
        let mainWordResults: any[] = [];
        if (titleWords.length >= 2) {
          // Find longest word as main title word
          const mainWord = titleWords.reduce((a, b) => a.length > b.length ? a : b);
          if (mainWord.length >= 4 && mainWord.toLowerCase() !== title.toLowerCase()) {
            console.log('[SCAN-ITEM] Pass 2b: trying main word:', mainWord);
            mainWordResults = await searchComicVine(COMICVINE_API_KEY, mainWord, issue, null, year);
            mainWordResults = scoreResults(mainWordResults, title, issue, publisher, year);
          }
        }
        
        // Merge and dedupe all results
        const allResults = [...results, ...scoredTitleOnly, ...mainWordResults];
        const seenIds = new Set<number>();
        results = allResults.filter(r => {
          if (seenIds.has(r.id)) return false;
          seenIds.add(r.id);
          return true;
        }).sort((a, b) => b.score - a.score);
        
        console.log('[SCAN-ITEM] Multi-pass combined results:', results.length);
        if (results.length > 0) {
          console.log('[SCAN-ITEM] Multi-pass top result:', results[0].title, '#' + results[0].issue, 'score:', results[0].score);
        }
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
          variantArtist: variantInfo.artistName,
          // Key issue detection
          keyIssueIndicator,
        },
        picks: results.slice(0, 10),
        ocrText,
        requestId, // Return request_id to frontend for correlation
        searchStrategy, // Include strategy used (correction_cache, local_cache, primary, multi_pass)
        timings: {
          vision: visionTime,
          total: totalTime
        },
        debug: {
          queryMode: searchStrategy,
          resultCount: results.length,
          extractionMethod,
          correctionOverride: !!correctionOverride,
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
