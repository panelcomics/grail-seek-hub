const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// SECURITY: Simple in-memory rate limiting (10 requests per minute per IP)
const rateLimiter = new Map<string, number[]>();

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const requests = rateLimiter.get(ip) || [];
  const recentRequests = requests.filter(t => now - t < 60000);
  
  if (recentRequests.length >= 10) {
    return false;
  }
  
  recentRequests.push(now);
  rateLimiter.set(ip, recentRequests);
  
  if (Math.random() < 0.01) {
    for (const [key, times] of rateLimiter.entries()) {
      const recent = times.filter(t => now - t < 60000);
      if (recent.length === 0) {
        rateLimiter.delete(key);
      } else {
        rateLimiter.set(key, recent);
      }
    }
  }
  
  return true;
}

// ============================================================================
// CACHING - 24hr in-memory cache for volume searches and issue lists
// ============================================================================
interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours
const volumeSearchCache = new Map<string, CacheEntry<any[]>>();
const volumeIssuesCache = new Map<number, CacheEntry<any[]>>();

function getCachedVolumeSearch(normalizedTitle: string): any[] | null {
  const entry = volumeSearchCache.get(normalizedTitle);
  if (!entry) return null;
  if (Date.now() - entry.timestamp > CACHE_TTL_MS) {
    volumeSearchCache.delete(normalizedTitle);
    return null;
  }
  return entry.data;
}

function setCachedVolumeSearch(normalizedTitle: string, data: any[]): void {
  volumeSearchCache.set(normalizedTitle, { data, timestamp: Date.now() });
}

function getCachedVolumeIssues(volumeId: number): any[] | null {
  const entry = volumeIssuesCache.get(volumeId);
  if (!entry) return null;
  if (Date.now() - entry.timestamp > CACHE_TTL_MS) {
    volumeIssuesCache.delete(volumeId);
    return null;
  }
  return entry.data;
}

function setCachedVolumeIssues(volumeId: number, data: any[]): void {
  volumeIssuesCache.set(volumeId, { data, timestamp: Date.now() });
}

// ============================================================================
// ENVIRONMENT & CONFIG
// ============================================================================
const COMICVINE_API_KEY = Deno.env.get('COMICVINE_API_KEY');
const EBAY_ENV = Deno.env.get('EBAY_ENV') || 'sandbox';
const EBAY_APP_ID = EBAY_ENV === 'production'
  ? Deno.env.get('EBAY_CLIENT_ID_PROD')
  : Deno.env.get('EBAY_APP_ID');
const EBAY_CERT_ID = EBAY_ENV === 'production'
  ? Deno.env.get('EBAY_CLIENT_SECRET_PROD')
  : Deno.env.get('EBAY_CERT_ID');

if (!COMICVINE_API_KEY) {
  console.error('CRITICAL: COMICVINE_API_KEY not configured!');
}

const IS_EBAY_SANDBOX = EBAY_APP_ID?.includes('SBX') || EBAY_CERT_ID?.includes('SBX');
const EBAY_AUTH_URL = IS_EBAY_SANDBOX 
  ? 'https://api.sandbox.ebay.com/identity/v1/oauth2/token'
  : 'https://api.ebay.com/identity/v1/oauth2/token';
const EBAY_API_URL = IS_EBAY_SANDBOX
  ? 'https://api.sandbox.ebay.com/buy/browse/v1/item_summary/search'
  : 'https://api.ebay.com/buy/browse/v1/item_summary/search';

// Thresholds for triggering volume-first fallback
const CONFIDENCE_THRESHOLD = 50;  // Score below this triggers fallback
const FALLBACK_TIMEOUT_MS = 2000; // 2 second timeout for fallback
const SHORT_TITLE_LENGTH = 8;     // Titles <= this are considered "common"
const COMMON_TITLES = ['x-men', 'batman', 'superman', 'spider-man', 'hulk', 'wolverine', 'avengers', 'flash', 'iron man'];

// ============================================================================
// TYPES
// ============================================================================
interface ComicVineIssue {
  id: number;
  name: string;
  issue_number: string;
  volume: {
    id: number;
    name: string;
  };
  image: {
    original_url: string;
    medium_url: string;
  };
  cover_date: string;
  description: string;
  character_credits: Array<{ name: string }>;
}

interface ComicVineVolume {
  id: number;
  name: string;
  start_year: string | number;
  publisher?: { name: string };
  count_of_issues: number;
  image?: { medium_url: string; original_url: string };
}

interface TopMatch {
  comicvine_issue_id: number;
  comicvine_volume_id: number;
  series: string;
  issue: string;
  year: number | null;
  publisher: string | null;
  coverUrl: string | null;
  confidence: number;
  fallbackPath?: string;
}

interface EbaySoldItem {
  price?: { value: string };
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================
function normalizeTitle(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function levenshteinDistance(a: string, b: string): number {
  const matrix: number[][] = [];
  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }
  return matrix[b.length][a.length];
}

function stringSimilarity(a: string, b: string): number {
  const normA = normalizeTitle(a);
  const normB = normalizeTitle(b);
  
  if (normA === normB) return 1;
  if (!normA || !normB) return 0;
  
  const maxLen = Math.max(normA.length, normB.length);
  const distance = levenshteinDistance(normA, normB);
  return 1 - distance / maxLen;
}

function isAmbiguousQuery(title: string, issueNumber: string | null): boolean {
  const normalizedTitle = normalizeTitle(title);
  
  // Issue #1 is always ambiguous (multiple volumes)
  if (issueNumber === '1') return true;
  
  // Short titles are ambiguous
  if (normalizedTitle.length <= SHORT_TITLE_LENGTH) return true;
  
  // Common titles are ambiguous
  if (COMMON_TITLES.some(common => normalizedTitle.includes(common))) return true;
  
  return false;
}

// ============================================================================
// TRADE FEE CALCULATION
// ============================================================================
const TRADE_FEE_TIERS = [
  { min: 0, max: 50, total: 2, each: 1 },
  { min: 50, max: 100, total: 5, each: 2.5 },
  { min: 101, max: 250, total: 12, each: 6 },
  { min: 251, max: 500, total: 22, each: 11 },
  { min: 501, max: 1000, total: 35, each: 17.5 },
  { min: 1001, max: 2000, total: 45, each: 22.5 },
  { min: 2001, max: 4000, total: 55, each: 27.5 },
  { min: 4001, max: 5000, total: 60, each: 30 },
  { min: 5001, max: 10000, total: 200, each: 100 },
  { min: 10001, max: null, total: 200, each: 100 },
];

function calculateTradeFee(totalTradeValue: number) {
  const tier = TRADE_FEE_TIERS.find(
    t => totalTradeValue >= t.min && (t.max === null || totalTradeValue <= t.max)
  );

  if (!tier) {
    const highestTier = TRADE_FEE_TIERS[TRADE_FEE_TIERS.length - 1];
    return {
      total_fee: highestTier.total,
      each_user_fee: highestTier.each,
      tier_info: `$${highestTier.min.toLocaleString()}+`
    };
  }

  return {
    total_fee: tier.total,
    each_user_fee: tier.each,
    tier_info: tier.max 
      ? `$${tier.min.toLocaleString()}–$${tier.max.toLocaleString()}` 
      : `$${tier.min.toLocaleString()}+`
  };
}

// ============================================================================
// EBAY FUNCTIONS
// ============================================================================
async function getEbayAccessToken(): Promise<string> {
  console.log(`Getting eBay OAuth token... (${IS_EBAY_SANDBOX ? 'SANDBOX' : 'PRODUCTION'})`);
  
  const credentials = btoa(`${EBAY_APP_ID}:${EBAY_CERT_ID}`);
  
  const response = await fetch(EBAY_AUTH_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Authorization': `Basic ${credentials}`,
    },
    body: 'grant_type=client_credentials&scope=https://api.ebay.com/oauth/api_scope',
  });

  if (!response.ok) {
    const error = await response.text();
    console.error('eBay OAuth error:', error);
    throw new Error(`Failed to get eBay access token: ${response.status}`);
  }

  const data = await response.json();
  return data.access_token;
}

async function getEbaySoldPrices(accessToken: string, title: string, issueNumber: string): Promise<number | null> {
  console.log('Searching eBay sold items for:', `${title} #${issueNumber} comic`);
  
  const searchQuery = `${title} #${issueNumber} comic`;
  const params = new URLSearchParams({
    q: searchQuery,
    limit: '5',
    filter: 'buyingOptions:{FIXED_PRICE},priceCurrency:USD,deliveryCountry:US',
    sort: 'price',
  });

  const response = await fetch(
    `${EBAY_API_URL}?${params}`,
    {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'X-EBAY-C-MARKETPLACE-ID': 'EBAY_US',
      },
    }
  );

  if (!response.ok) {
    console.error('eBay search error:', response.status);
    await response.text();
    return null;
  }

  const data = await response.json();
  console.log('eBay results count:', data.total || 0);
  
  if (!data.itemSummaries || data.itemSummaries.length === 0) {
    return null;
  }

  const prices = data.itemSummaries
    .map((item: EbaySoldItem) => parseFloat(item.price?.value || '0'))
    .filter((price: number) => price > 0);

  if (prices.length === 0) {
    return null;
  }

  return prices.reduce((sum: number, price: number) => sum + price, 0) / prices.length;
}

// ============================================================================
// QUERY PARSING - Improved to distinguish year vs issue correctly
// ============================================================================
const CURRENT_YEAR = new Date().getFullYear();

function isValidYear(num: number): boolean {
  // Valid comic years: 1900 to current year + 1
  return num >= 1900 && num <= CURRENT_YEAR + 1;
}

function parseQuery(query: string): { title: string; issue: string | null; year: number | null; publisher: string | null } {
  let cleanQuery = query;
  
  // Remove creator names first
  cleanQuery = cleanQuery.replace(/\b(jim lee|todd mcfarlane|frank miller|alex ross|rob liefeld|mark bagley|john romita|stan lee|jack kirby|steve ditko)\b/gi, '').trim();
  
  // Extract publisher hints
  let publisher: string | null = null;
  const publisherMatch = cleanQuery.match(/\b(marvel|dc|image|dark horse|valiant|idw|dynamite|boom|mirage|archie|dell|gold key|charlton|fawcett)\b/i);
  if (publisherMatch) {
    publisher = publisherMatch[1];
    cleanQuery = cleanQuery.replace(new RegExp(`\\b${publisher}\\b`, 'i'), '').trim();
  }
  
  // Step 1: Extract explicit issue number (# prefix)
  // This always takes priority - "#1938" means issue 1938, not year
  let issue: string | null = null;
  const hashMatch = cleanQuery.match(/#\s*(\d{1,4})\b/);
  if (hashMatch) {
    issue = hashMatch[1];
    cleanQuery = cleanQuery.replace(/#\s*\d{1,4}\b/, '').trim();
  }
  
  // Step 2: Find all remaining numbers
  const numberMatches = [...cleanQuery.matchAll(/\b(\d{1,4})\b/g)];
  const numbers = numberMatches.map(m => ({
    value: parseInt(m[1]),
    str: m[1],
    index: m.index!
  }));
  
  let year: number | null = null;
  
  // Step 3: Identify year from 4-digit numbers
  // A 4-digit number is a year if it's in valid range and wasn't preceded by #
  const fourDigitNumbers = numbers.filter(n => n.str.length === 4 && isValidYear(n.value));
  
  if (fourDigitNumbers.length > 0) {
    // Take the first valid 4-digit year
    year = fourDigitNumbers[0].value;
    // Remove year from query
    cleanQuery = cleanQuery.replace(new RegExp(`\\b${year}\\b`), '').trim();
  }
  
  // Step 4: If we don't have an issue yet, look for standalone numbers
  if (!issue) {
    // Refresh number matches after removing year
    const remainingMatches = [...cleanQuery.matchAll(/\b(\d{1,4})\b/g)];
    
    for (const match of remainingMatches) {
      const num = parseInt(match[1]);
      const numStr = match[1];
      
      // Skip if this looks like another year (4-digit in valid range)
      if (numStr.length === 4 && isValidYear(num)) {
        continue;
      }
      
      // 1-3 digit numbers or 4-digit numbers outside year range are issue numbers
      if (numStr.length <= 3 || !isValidYear(num)) {
        issue = numStr;
        cleanQuery = cleanQuery.replace(new RegExp(`\\b${numStr}\\b`), '').trim();
        break;
      }
    }
  }
  
  // Step 5: Handle edge case where issue is 4-digits but clearly not a year
  // e.g., "Action Comics 1938" where 1938 could be year OR issue
  // If we have a 4-digit issue that's ALSO a valid year and no year detected,
  // check context: if title suggests old series, treat as year
  if (issue && issue.length === 4 && isValidYear(parseInt(issue)) && !year) {
    const issueNum = parseInt(issue);
    // If the number is in Golden/Silver age range (1938-1975) and title doesn't 
    // suggest a high-numbered series, it's probably a year
    const titleLower = cleanQuery.toLowerCase();
    const likelyLongRunning = titleLower.includes('action') || 
                              titleLower.includes('detective') || 
                              titleLower.includes('superman') ||
                              titleLower.includes('batman') ||
                              titleLower.includes('amazing spider') ||
                              titleLower.includes('fantastic four');
    
    // For "Action Comics #1 1938" - issue was already extracted via #
    // For "Action Comics 1 1938" - we need to be smart
    // If no explicit # and number is a valid year, prefer treating as year
    if (!hashMatch && issueNum >= 1938 && issueNum <= 2000) {
      year = issueNum;
      issue = null;
      // Don't remove from cleanQuery again, it was already removed
    }
  }
  
  // Step 6: Check for "No." or "Issue" patterns
  if (!issue) {
    const noMatch = cleanQuery.match(/\bno\.?\s*(\d{1,4})\b/i);
    const issueMatch = cleanQuery.match(/\bissue\s*(\d{1,4})\b/i);
    
    if (noMatch) {
      issue = noMatch[1];
      cleanQuery = cleanQuery.replace(/\bno\.?\s*\d{1,4}\b/i, '').trim();
    } else if (issueMatch) {
      issue = issueMatch[1];
      cleanQuery = cleanQuery.replace(/\bissue\s*\d{1,4}\b/i, '').trim();
    }
  }
  
  // Clean up extra whitespace and parentheses
  cleanQuery = cleanQuery.replace(/\(\s*\)/g, '').replace(/\s+/g, ' ').trim();
  
  console.log('[PARSER] Input:', query);
  console.log('[PARSER] Result:', { title: cleanQuery, issue, year, publisher });
  
  return { title: cleanQuery, issue, year, publisher };
}

// ============================================================================
// SCORING FUNCTIONS - Enhanced with strong year weighting
// ============================================================================

// Scoring weights
const SCORE_TITLE_MAX = 40;
const SCORE_ISSUE_EXACT = 35;
const SCORE_ISSUE_NORMALIZED = 30;
const SCORE_PUBLISHER_MATCH = 10;
const SCORE_YEAR_EXACT = 35;
const SCORE_YEAR_OFF_1 = 25;
const SCORE_YEAR_OFF_2_3 = 15;
const SCORE_YEAR_OFF_4_7 = 5;
const PENALTY_YEAR_OFF_GT_7 = -20;
const PENALTY_YEAR_MISSING = -15;
const PENALTY_TPB_COLLECTION = -30;

function scoreResult(result: ComicVineIssue, parsedQuery: { title: string; issue: string | null; year: number | null; publisher?: string | null }): number {
  let score = 0;
  let yearScore = 0;
  let hasExactYear = false;
  let hasExactIssue = false;
  
  const volumeName = result.volume?.name?.toLowerCase() || '';
  const queryTitle = parsedQuery.title.toLowerCase();
  
  // === Title similarity (0-40 points) ===
  if (volumeName === queryTitle) {
    score += SCORE_TITLE_MAX;
  } else if (volumeName.includes(queryTitle) || queryTitle.includes(volumeName)) {
    score += 30;
  } else {
    // Word overlap scoring
    const queryWords = queryTitle.split(/\s+/).filter(w => w.length > 2);
    const volumeWords = volumeName.split(/\s+/).filter(w => w.length > 2);
    const overlap = queryWords.filter(w => volumeWords.includes(w)).length;
    const overlapRatio = queryWords.length > 0 ? overlap / queryWords.length : 0;
    score += Math.round(overlapRatio * SCORE_TITLE_MAX);
  }
  
  // === Issue number matching (+35 exact, +30 normalized) ===
  if (parsedQuery.issue && result.issue_number) {
    const resultIssue = result.issue_number.toString().replace(/^0+/, '');
    const queryIssue = parsedQuery.issue.replace(/^0+/, '');
    
    if (resultIssue === queryIssue) {
      score += SCORE_ISSUE_EXACT;
      hasExactIssue = true;
    } else if (resultIssue.toLowerCase() === queryIssue.toLowerCase()) {
      score += SCORE_ISSUE_NORMALIZED;
    }
  }
  
  // === Year scoring (strong signal when provided) ===
  if (parsedQuery.year) {
    if (result.cover_date) {
      const resultYear = new Date(result.cover_date).getFullYear();
      const yearDiff = Math.abs(resultYear - parsedQuery.year);
      
      if (yearDiff === 0) {
        yearScore = SCORE_YEAR_EXACT;
        hasExactYear = true;
      } else if (yearDiff === 1) {
        yearScore = SCORE_YEAR_OFF_1;
      } else if (yearDiff <= 3) {
        yearScore = SCORE_YEAR_OFF_2_3;
      } else if (yearDiff <= 7) {
        yearScore = SCORE_YEAR_OFF_4_7;
      } else {
        yearScore = PENALTY_YEAR_OFF_GT_7;
      }
    } else {
      // Year provided but candidate has no year = penalty
      yearScore = PENALTY_YEAR_MISSING;
    }
    score += yearScore;
  }
  
  // === Publisher match (if available) ===
  // Note: First-pass results don't include publisher, but volume-first does
  // We'll track this for tie-breaking
  
  // === Penalize collections, trades, reprints, foreign editions ===
  const name = (result.name || '').toLowerCase();
  const desc = (result.description || '').toLowerCase();
  const volName = volumeName;
  
  const isTPBOrCollection = 
    name.includes('tpb') || 
    name.includes('trade paperback') || 
    name.includes('collection') ||
    name.includes('omnibus') ||
    name.includes('graphic novel') ||
    volName.includes('tpb') ||
    volName.includes('collection') ||
    desc.includes('collects issues') ||
    desc.includes('reprints');
    
  const isForeignEdition =
    name.includes('spanish') ||
    name.includes('french') ||
    name.includes('german') ||
    name.includes('italian') ||
    name.includes('portuguese') ||
    name.includes('edición') ||
    name.includes('edition') && (name.includes('foreign') || name.includes('international')) ||
    volName.includes('spanish') ||
    volName.includes('french');
  
  if (isTPBOrCollection) {
    score += PENALTY_TPB_COLLECTION;
  }
  if (isForeignEdition) {
    score += PENALTY_TPB_COLLECTION;
  }
  
  // Store metadata for tie-breaking
  (result as any)._hasExactYear = hasExactYear;
  (result as any)._hasExactIssue = hasExactIssue;
  (result as any)._yearScore = yearScore;
  
  return score;
}

function scoreVolume(volume: ComicVineVolume, parsedQuery: { title: string; year: number | null; publisher: string | null }): number {
  let score = 0;
  
  // Title similarity (0-40 points)
  const similarity = stringSimilarity(parsedQuery.title, volume.name);
  score += similarity * SCORE_TITLE_MAX;
  
  // Year proximity (strong signal when provided)
  if (parsedQuery.year && volume.start_year) {
    const volumeYear = typeof volume.start_year === 'string' ? parseInt(volume.start_year) : volume.start_year;
    const yearDiff = Math.abs(volumeYear - parsedQuery.year);
    
    if (yearDiff === 0) score += SCORE_YEAR_EXACT;
    else if (yearDiff === 1) score += SCORE_YEAR_OFF_1;
    else if (yearDiff <= 3) score += SCORE_YEAR_OFF_2_3;
    else if (yearDiff <= 7) score += SCORE_YEAR_OFF_4_7;
    else score += PENALTY_YEAR_OFF_GT_7;
  } else if (parsedQuery.year && !volume.start_year) {
    score += PENALTY_YEAR_MISSING;
  }
  
  // Publisher match (0-10 points)
  if (parsedQuery.publisher && volume.publisher?.name) {
    const pubName = volume.publisher.name.toLowerCase();
    const queryPub = parsedQuery.publisher.toLowerCase();
    if (pubName === queryPub || pubName.includes(queryPub) || queryPub.includes(pubName)) {
      score += SCORE_PUBLISHER_MATCH;
    }
  }
  
  // Prefer volumes with more issues (more likely to be main series)
  if (volume.count_of_issues > 50) score += 8;
  else if (volume.count_of_issues > 20) score += 4;
  
  // Penalize volumes that look like collections
  const volName = volume.name.toLowerCase();
  if (volName.includes('tpb') || volName.includes('collection') || volName.includes('omnibus')) {
    score += PENALTY_TPB_COLLECTION;
  }
  
  return score;
}

// ============================================================================
// FIRST-PASS: ISSUE SEARCH
// ============================================================================
async function searchComicVineIssues(query: string): Promise<{ results: ComicVineIssue[]; parsedQuery: ReturnType<typeof parseQuery> }> {
  console.log('[FIRST-PASS] Searching Comic Vine issues for:', query);
  
  const parsedQuery = parseQuery(query);
  console.log('[FIRST-PASS] Parsed query:', parsedQuery);
  
  let searchQuery = parsedQuery.title;
  if (parsedQuery.issue) searchQuery += ` ${parsedQuery.issue}`;
  if (parsedQuery.year) searchQuery += ` ${parsedQuery.year}`;
  
  const params = new URLSearchParams({
    api_key: COMICVINE_API_KEY!,
    format: 'json',
    query: searchQuery,
    resources: 'issue',
    limit: '25',
  });

  const response = await fetch(
    `https://comicvine.gamespot.com/api/search/?${params}`,
    { headers: { 'User-Agent': 'GrailSeeker/1.0' } }
  );

  if (!response.ok) {
    throw new Error(`Comic Vine API error: ${response.status}`);
  }

  const data = await response.json();
  console.log('[FIRST-PASS] Comic Vine results:', data.number_of_total_results);
  
  return { results: data.results || [], parsedQuery };
}

// ============================================================================
// VOLUME-FIRST FALLBACK
// ============================================================================
async function searchVolumes(title: string): Promise<ComicVineVolume[]> {
  const normalizedTitle = normalizeTitle(title);
  
  // Check cache first
  const cached = getCachedVolumeSearch(normalizedTitle);
  if (cached) {
    console.log('[VOLUME-FIRST] Cache hit for volumes:', normalizedTitle);
    return cached;
  }
  
  console.log('[VOLUME-FIRST] Searching volumes for:', title);
  
  const params = new URLSearchParams({
    api_key: COMICVINE_API_KEY!,
    format: 'json',
    query: title,
    resources: 'volume',
    limit: '25',
    field_list: 'id,name,start_year,publisher,count_of_issues,image'
  });

  const response = await fetch(
    `https://comicvine.gamespot.com/api/search/?${params}`,
    { headers: { 'User-Agent': 'GrailSeeker/1.0' } }
  );

  if (!response.ok) {
    throw new Error(`Comic Vine volume search error: ${response.status}`);
  }

  const data = await response.json();
  const results = data.results || [];
  
  // Cache results
  setCachedVolumeSearch(normalizedTitle, results);
  console.log('[VOLUME-FIRST] Found', results.length, 'volumes');
  
  return results;
}

async function fetchVolumeIssues(volumeId: number): Promise<any[]> {
  // Check cache first
  const cached = getCachedVolumeIssues(volumeId);
  if (cached) {
    console.log('[VOLUME-FIRST] Cache hit for issues, volume:', volumeId);
    return cached;
  }
  
  console.log('[VOLUME-FIRST] Fetching issues for volume:', volumeId);
  
  const params = new URLSearchParams({
    api_key: COMICVINE_API_KEY!,
    format: 'json',
    filter: `volume:${volumeId}`,
    limit: '50',
    field_list: 'id,name,issue_number,cover_date,image'
  });

  const response = await fetch(
    `https://comicvine.gamespot.com/api/issues/?${params}`,
    { headers: { 'User-Agent': 'GrailSeeker/1.0' } }
  );

  if (!response.ok) {
    throw new Error(`Comic Vine issues fetch error: ${response.status}`);
  }

  const data = await response.json();
  const results = data.results || [];
  
  // Cache results
  setCachedVolumeIssues(volumeId, results);
  console.log('[VOLUME-FIRST] Found', results.length, 'issues for volume', volumeId);
  
  return results;
}

async function volumeFirstFallback(
  parsedQuery: { title: string; issue: string | null; year: number | null; publisher: string | null }
): Promise<TopMatch[]> {
  console.log('[VOLUME-FIRST] Starting fallback search...');
  
  // Step 1: Search for volumes
  const volumes = await searchVolumes(parsedQuery.title);
  if (volumes.length === 0) {
    console.log('[VOLUME-FIRST] No volumes found');
    return [];
  }
  
  // Step 2: Score and sort volumes
  const scoredVolumes = volumes.map(v => ({
    volume: v,
    score: scoreVolume(v, parsedQuery)
  })).sort((a, b) => b.score - a.score);
  
  console.log('[VOLUME-FIRST] Top 3 volumes:', scoredVolumes.slice(0, 3).map(sv => ({
    name: sv.volume.name,
    year: sv.volume.start_year,
    score: sv.score
  })));
  
  // Step 3: Take top 3 volumes and fetch their issues
  const topVolumes = scoredVolumes.slice(0, 3);
  const matchPromises = topVolumes.map(async ({ volume, score: volumeScore }) => {
    try {
      const issues = await fetchVolumeIssues(volume.id);
      
      // Find exact issue number match
      if (parsedQuery.issue) {
        const exactMatch = issues.find(issue => {
          const issueNum = issue.issue_number?.toString().replace(/^0+/, '');
          const searchNum = parsedQuery.issue?.replace(/^0+/, '');
          return issueNum === searchNum;
        });
        
        if (exactMatch) {
          const coverDate = exactMatch.cover_date;
          const year = coverDate ? new Date(coverDate).getFullYear() : null;
          
          // Calculate confidence using consistent year scoring
          let confidence = volumeScore;
          let hasExactYear = false;
          
          // Add issue match bonus
          confidence += SCORE_ISSUE_EXACT;
          
          // Add year score (using same weights as scoreResult)
          if (parsedQuery.year) {
            if (year) {
              const yearDiff = Math.abs(year - parsedQuery.year);
              if (yearDiff === 0) {
                confidence += SCORE_YEAR_EXACT;
                hasExactYear = true;
              } else if (yearDiff === 1) {
                confidence += SCORE_YEAR_OFF_1;
              } else if (yearDiff <= 3) {
                confidence += SCORE_YEAR_OFF_2_3;
              } else if (yearDiff <= 7) {
                confidence += SCORE_YEAR_OFF_4_7;
              } else {
                confidence += PENALTY_YEAR_OFF_GT_7;
              }
            } else {
              confidence += PENALTY_YEAR_MISSING;
            }
          }
          
          // Cap confidence at 120 for exceptional matches (exact title + issue + year)
          confidence = Math.min(120, Math.max(0, confidence));
          
          return {
            comicvine_issue_id: exactMatch.id,
            comicvine_volume_id: volume.id,
            series: volume.name,
            issue: exactMatch.issue_number,
            year,
            publisher: volume.publisher?.name || null,
            coverUrl: exactMatch.image?.medium_url || volume.image?.medium_url || null,
            confidence,
            fallbackPath: 'volume-first',
            _hasExactYear: hasExactYear,
            _hasExactIssue: true
          } as TopMatch;
        }
      }
      
      return null;
    } catch (err) {
      console.error('[VOLUME-FIRST] Error fetching issues for volume', volume.id, err);
      return null;
    }
  });
  
  const matches = (await Promise.all(matchPromises)).filter((m): m is TopMatch => m !== null);
  
  // Sort by confidence
  matches.sort((a, b) => b.confidence - a.confidence);
  
  console.log('[VOLUME-FIRST] Final matches:', matches.length);
  return matches;
}

// ============================================================================
// TIMEOUT WRAPPER
// ============================================================================
async function withTimeout<T>(promise: Promise<T>, timeoutMs: number, fallbackValue: T): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((resolve) => setTimeout(() => resolve(fallbackValue), timeoutMs))
  ]);
}

// ============================================================================
// MAIN SEARCH FUNCTION
// ============================================================================
async function searchComicVine(query: string): Promise<{
  topMatch: ComicVineIssue | null;
  topMatches: TopMatch[];
  confidence: number;
  fallbackUsed: boolean;
  fallbackPath: string | null;
}> {
  // First pass: Issue search
  const { results, parsedQuery } = await searchComicVineIssues(query);
  
  if (results.length === 0) {
    // No results from first pass, try volume-first fallback
    console.log('[SCANNER] No issue results, trying volume-first fallback');
    const fallbackMatches = await withTimeout(
      volumeFirstFallback(parsedQuery),
      FALLBACK_TIMEOUT_MS,
      []
    );
    
    return {
      topMatch: null,
      topMatches: fallbackMatches.slice(0, 3),
      confidence: fallbackMatches[0]?.confidence || 0,
      fallbackUsed: true,
      fallbackPath: 'volume-first'
    };
  }
  
  // Score first-pass results
  const scored = results.map(result => ({
    result,
    score: scoreResult(result, parsedQuery)
  })).sort((a, b) => b.score - a.score);
  
  console.log('[FIRST-PASS] Top 3 scored:', scored.slice(0, 3).map(s => ({
    title: s.result.volume?.name,
    issue: s.result.issue_number,
    year: s.result.cover_date,
    score: s.score
  })));
  
  const topScore = scored[0]?.score || 0;
  const topResult = scored[0]?.result;
  
  // Check if we need fallback
  const needsFallback = 
    topScore < CONFIDENCE_THRESHOLD ||
    isAmbiguousQuery(parsedQuery.title, parsedQuery.issue);
  
  if (needsFallback) {
    console.log('[SCANNER] Low confidence or ambiguous query, trying volume-first fallback');
    console.log('[SCANNER] Reason: score=', topScore, 'threshold=', CONFIDENCE_THRESHOLD, 'isAmbiguous=', isAmbiguousQuery(parsedQuery.title, parsedQuery.issue));
    
    // Run fallback with timeout
    const fallbackMatches = await withTimeout(
      volumeFirstFallback(parsedQuery),
      FALLBACK_TIMEOUT_MS,
      []
    );
    
    // Convert first-pass results to TopMatch format with tie-breaking metadata
    const firstPassMatches: TopMatch[] = scored.slice(0, 3).map(s => {
      const year = s.result.cover_date ? new Date(s.result.cover_date).getFullYear() : null;
      const hasExactYear = (s.result as any)._hasExactYear || false;
      const hasExactIssue = (s.result as any)._hasExactIssue || false;
      
      return {
        comicvine_issue_id: s.result.id,
        comicvine_volume_id: s.result.volume?.id || 0,
        series: s.result.volume?.name || '',
        issue: s.result.issue_number,
        year,
        publisher: null, // First pass doesn't include publisher
        coverUrl: s.result.image?.medium_url || null,
        confidence: s.score,
        fallbackPath: 'issue-search',
        _hasExactYear: hasExactYear,
        _hasExactIssue: hasExactIssue
      };
    });
    
    // Merge and dedupe results
    const allMatches = [...fallbackMatches, ...firstPassMatches];
    const seenIds = new Set<number>();
    const uniqueMatches: TopMatch[] = [];
    
    // Enhanced sorting with tie-breaking
    const sortedMatches = allMatches.sort((a, b) => {
      const scoreDiff = b.confidence - a.confidence;
      
      // If scores are close (within 5 points), apply tie-breakers
      if (Math.abs(scoreDiff) <= 5) {
        const aExactYear = (a as any)._hasExactYear || false;
        const bExactYear = (b as any)._hasExactYear || false;
        const aExactIssue = (a as any)._hasExactIssue || false;
        const bExactIssue = (b as any)._hasExactIssue || false;
        
        // Tie-breaker 1: Prefer exact year match
        if (bExactYear && !aExactYear) return 1;
        if (aExactYear && !bExactYear) return -1;
        
        // Tie-breaker 2: Prefer exact issue match
        if (bExactIssue && !aExactIssue) return 1;
        if (aExactIssue && !bExactIssue) return -1;
        
        // Tie-breaker 3: Prefer publisher present
        if (b.publisher && !a.publisher) return 1;
        if (a.publisher && !b.publisher) return -1;
        
        // Tie-breaker 4: For issue #1, prefer older "first run" volumes
        if (parsedQuery.issue === '1' && a.year && b.year) {
          if (parsedQuery.year) {
            // If year provided, prefer closer to that year
            const aDiff = Math.abs(a.year - parsedQuery.year);
            const bDiff = Math.abs(b.year - parsedQuery.year);
            if (aDiff !== bDiff) return aDiff - bDiff;
          } else {
            // No year provided, prefer older volume for classic series
            return a.year - b.year;
          }
        }
        
        // Tie-breaker 5: Prefer complete metadata
        const aComplete = (a.year ? 1 : 0) + (a.publisher ? 1 : 0);
        const bComplete = (b.year ? 1 : 0) + (b.publisher ? 1 : 0);
        if (bComplete !== aComplete) return bComplete - aComplete;
      }
      
      return scoreDiff;
    });
    
    for (const match of sortedMatches) {
      if (!seenIds.has(match.comicvine_issue_id)) {
        seenIds.add(match.comicvine_issue_id);
        uniqueMatches.push(match);
      }
    }
    
    // If any candidate has BOTH exact issue AND exact year match, ensure it's #1
    const exactMatchIndex = uniqueMatches.findIndex(m => 
      (m as any)._hasExactYear && (m as any)._hasExactIssue
    );
    if (exactMatchIndex > 0) {
      const exactMatch = uniqueMatches[exactMatchIndex];
      uniqueMatches.splice(exactMatchIndex, 1);
      uniqueMatches.unshift(exactMatch);
      console.log('[SCANNER] Promoted exact year+issue match to #1:', exactMatch.series, '#', exactMatch.issue, exactMatch.year);
    }
    
    // Get the best match
    const bestMatch = uniqueMatches[0];
    let bestTopMatch: ComicVineIssue | null = null;
    
    if (bestMatch) {
      const matchingFirstPass = results.find(r => r.id === bestMatch.comicvine_issue_id);
      if (matchingFirstPass) {
        bestTopMatch = matchingFirstPass;
      } else if (topResult && bestMatch.comicvine_issue_id === topResult.id) {
        bestTopMatch = topResult;
      } else {
        bestTopMatch = topResult || null;
      }
    }
    
    console.log('[SCANNER] Best match selected:', bestMatch?.series, '#', bestMatch?.issue, 'year:', bestMatch?.year, 'confidence:', bestMatch?.confidence);
    console.log('[SCANNER] Top 3 final:', uniqueMatches.slice(0, 3).map(m => ({
      series: m.series, issue: m.issue, year: m.year, confidence: m.confidence, 
      exactYear: (m as any)._hasExactYear, exactIssue: (m as any)._hasExactIssue
    })));
    
    return {
      topMatch: bestTopMatch,
      topMatches: uniqueMatches.slice(0, 3),
      confidence: bestMatch?.confidence || topScore,
      fallbackUsed: fallbackMatches.length > 0,
      fallbackPath: bestMatch?.fallbackPath || (fallbackMatches.length > 0 ? 'volume-first' : 'issue-search')
    };
  }
  
  // High confidence first-pass result
  const topMatches: TopMatch[] = scored.slice(0, 3).map(s => {
    const year = s.result.cover_date ? new Date(s.result.cover_date).getFullYear() : null;
    return {
      comicvine_issue_id: s.result.id,
      comicvine_volume_id: s.result.volume?.id || 0,
      series: s.result.volume?.name || '',
      issue: s.result.issue_number,
      year,
      publisher: null,
      coverUrl: s.result.image?.medium_url || null,
      confidence: s.score,
      fallbackPath: 'issue-search'
    };
  });
  
  return {
    topMatch: topResult || null,
    topMatches,
    confidence: topScore,
    fallbackUsed: false,
    fallbackPath: 'issue-search'
  };
}

// ============================================================================
// MAIN HANDLER
// ============================================================================
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const clientIP = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown';
  if (!checkRateLimit(clientIP)) {
    console.warn('Rate limit exceeded for IP:', clientIP);
    return new Response(
      JSON.stringify({ error: 'Too many requests. Please try again later.' }),
      { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  try {
    if (!COMICVINE_API_KEY) {
      throw new Error('Missing Comic Vine API credentials');
    }

    const { query } = await req.json();

    if (!query || typeof query !== 'string') {
      return new Response(
        JSON.stringify({ error: 'Query parameter is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Search Comic Vine with volume-first fallback
    const searchResult = await searchComicVine(query);
    
    // Log for analytics
    console.log('[SCANNER-ANALYTICS]', {
      query,
      confidence: searchResult.confidence,
      fallbackUsed: searchResult.fallbackUsed,
      fallbackPath: searchResult.fallbackPath,
      matchCount: searchResult.topMatches.length,
      timestamp: new Date().toISOString()
    });
    
    if (!searchResult.topMatch && searchResult.topMatches.length === 0) {
      return new Response(
        JSON.stringify({ error: 'No comic found', found: false, topMatches: [] }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const comicData = searchResult.topMatch;
    
    // Try to get eBay pricing
    let avgPrice = 0;
    if (comicData && EBAY_APP_ID && EBAY_CERT_ID) {
      try {
        const ebayToken = await getEbayAccessToken();
        const price = await getEbaySoldPrices(
          ebayToken,
          comicData.volume.name,
          comicData.issue_number
        );
        avgPrice = price || 0;
      } catch (ebayError) {
        console.error('eBay pricing unavailable:', ebayError instanceof Error ? ebayError.message : 'Unknown error');
      }
    }

    const estimatedValue = avgPrice || 0;
    const tradeFee = calculateTradeFee(estimatedValue * 2);

    const year = comicData?.cover_date ? new Date(comicData.cover_date).getFullYear() : null;
    const characters = comicData?.character_credits?.slice(0, 5).map(c => c.name) || [];

    const result = {
      found: true,
      comic: comicData ? {
        comicvine_id: comicData.id,
        title: comicData.volume.name,
        issue_number: comicData.issue_number,
        full_title: comicData.name || `${comicData.volume.name} #${comicData.issue_number}`,
        publisher: searchResult.topMatches[0]?.publisher || 'Comic',
        year,
        cover_image: comicData.image.original_url,
        cover_thumb: comicData.image.medium_url,
        description: comicData.description,
        characters,
        ebay_avg_price: estimatedValue,
        trade_fee_total: tradeFee.total_fee,
        trade_fee_each: tradeFee.each_user_fee,
        fee_tier: tradeFee.tier_info,
      } : null,
      // New fields for UI chooser
      topMatches: searchResult.topMatches,
      confidence: searchResult.confidence,
      fallbackUsed: searchResult.fallbackUsed,
      fallbackPath: searchResult.fallbackPath,
      needsUserConfirmation: searchResult.confidence < CONFIDENCE_THRESHOLD || searchResult.topMatches.length > 1,
    };

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in comic-scanner function:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      timestamp: new Date().toISOString()
    });
    
    return new Response(
      JSON.stringify({ 
        error: 'Unable to search for comic. Please try again later.',
        found: false,
        topMatches: []
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
