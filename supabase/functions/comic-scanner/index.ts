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

// Volume-first Issue #1 rule constants
const ISSUE_1_YEAR_WINDOW = 3;    // ±3 years for volume filtering
const SCORE_VOLUME_EXACT_YEAR = 40;
const SCORE_VOLUME_YEAR_OFF_1 = 30;
const SCORE_VOLUME_YEAR_OFF_2_3 = 15;
const SCORE_VOLUME_HISTORICAL_BIAS = 5; // Bonus for older volumes when issue=1

// Sanity filtering constants
const STOPWORDS = new Set(['the', 'a', 'an', 'and', 'or', 'of', 'in', 'to', 'for', 'on', 'with']);
const FORMAT_KEYWORDS = ['tpb', 'trade', 'collection', 'omnibus', 'megazine', 'magazine', 'hardcover', 'digest', 'annual', 'special edition'];
const PENALTY_TOKEN_OVERLAP_FAIL = -60;
const PENALTY_FORMAT_FILTER = -80;
const PENALTY_PUBLISHER_MISMATCH = -40;
const SCORE_PUBLISHER_INFERRED = 20;

// Publisher inference map - common titles to expected publishers
const PUBLISHER_INFERENCE: Record<string, string[]> = {
  'batman': ['dc', 'dc comics'],
  'superman': ['dc', 'dc comics'],
  'wonder woman': ['dc', 'dc comics'],
  'justice league': ['dc', 'dc comics'],
  'flash': ['dc', 'dc comics'],
  'aquaman': ['dc', 'dc comics'],
  'green lantern': ['dc', 'dc comics'],
  'detective comics': ['dc', 'dc comics'],
  'action comics': ['dc', 'dc comics'],
  'spider-man': ['marvel', 'marvel comics'],
  'amazing spider-man': ['marvel', 'marvel comics'],
  'x-men': ['marvel', 'marvel comics'],
  'avengers': ['marvel', 'marvel comics'],
  'iron man': ['marvel', 'marvel comics'],
  'hulk': ['marvel', 'marvel comics'],
  'incredible hulk': ['marvel', 'marvel comics'],
  'fantastic four': ['marvel', 'marvel comics'],
  'captain america': ['marvel', 'marvel comics'],
  'thor': ['marvel', 'marvel comics'],
  'daredevil': ['marvel', 'marvel comics'],
  'wolverine': ['marvel', 'marvel comics'],
  'spawn': ['image', 'image comics'],
  'saga': ['image', 'image comics'],
  'walking dead': ['image', 'image comics'],
  'invincible': ['image', 'image comics'],
  'savage dragon': ['image', 'image comics'],
  'witchblade': ['image', 'image comics', 'top cow'],
  'teenage mutant ninja turtles': ['mirage', 'idw'],
  'tmnt': ['mirage', 'idw']
};

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
// SANITY FILTERING HELPERS
// ============================================================================

/**
 * Extract key tokens from a title, removing stopwords
 */
function extractTitleTokens(title: string): string[] {
  return normalizeTitle(title)
    .split(/\s+/)
    .filter(word => word.length > 1 && !STOPWORDS.has(word));
}

/**
 * Check token overlap between query title and candidate title
 * Returns { overlap, passes } where passes is true if minimum overlap met
 */
function checkTokenOverlap(queryTitle: string, candidateTitle: string): { overlap: number; passes: boolean; reason?: string } {
  const queryTokens = extractTitleTokens(queryTitle);
  const candidateTokens = extractTitleTokens(candidateTitle);
  
  if (queryTokens.length === 0 || candidateTokens.length === 0) {
    return { overlap: 0, passes: true }; // Can't validate, allow through
  }
  
  // Count overlapping tokens
  const overlap = queryTokens.filter(token => 
    candidateTokens.some(ct => ct === token || ct.includes(token) || token.includes(ct))
  ).length;
  
  // Minimum required overlap based on query length
  const minRequired = queryTokens.length >= 3 ? 2 : 1;
  const passes = overlap >= minRequired;
  
  return { 
    overlap, 
    passes,
    reason: passes ? undefined : `Token overlap ${overlap} < required ${minRequired} (query: ${queryTokens.join(',')} vs candidate: ${candidateTokens.join(',')})`
  };
}

/**
 * Check if a candidate contains format keywords that weren't in the query
 */
function checkFormatFilter(queryTitle: string, candidateName: string, candidateVolumeName: string): { passes: boolean; reason?: string } {
  const queryLower = queryTitle.toLowerCase();
  const candidateLower = (candidateName + ' ' + candidateVolumeName).toLowerCase();
  
  // Check each format keyword
  for (const format of FORMAT_KEYWORDS) {
    // If candidate has format keyword but query doesn't, it's a mismatch
    if (candidateLower.includes(format) && !queryLower.includes(format)) {
      return { passes: false, reason: `Format mismatch: candidate contains '${format}' but query doesn't` };
    }
  }
  
  return { passes: true };
}

/**
 * Infer expected publisher from title
 */
function inferPublisher(title: string): string[] | null {
  const normalizedTitle = normalizeTitle(title);
  
  for (const [key, publishers] of Object.entries(PUBLISHER_INFERENCE)) {
    if (normalizedTitle.includes(key)) {
      return publishers;
    }
  }
  
  return null;
}

/**
 * Check publisher match and apply bonus/penalty
 */
function scorePublisherMatch(
  queryTitle: string, 
  explicitPublisher: string | null, 
  candidatePublisher: string | null
): { score: number; reason?: string } {
  if (!candidatePublisher) {
    return { score: 0 }; // No publisher to check
  }
  
  const candidatePubLower = candidatePublisher.toLowerCase();
  
  // Check explicit publisher first
  if (explicitPublisher) {
    const queryPubLower = explicitPublisher.toLowerCase();
    if (candidatePubLower.includes(queryPubLower) || queryPubLower.includes(candidatePubLower)) {
      return { score: SCORE_PUBLISHER_INFERRED, reason: 'Explicit publisher match' };
    } else {
      return { score: PENALTY_PUBLISHER_MISMATCH, reason: `Publisher mismatch: expected ${explicitPublisher}, got ${candidatePublisher}` };
    }
  }
  
  // Try inferred publisher
  const inferredPublishers = inferPublisher(queryTitle);
  if (inferredPublishers) {
    const matches = inferredPublishers.some(pub => 
      candidatePubLower.includes(pub) || pub.includes(candidatePubLower.split(' ')[0])
    );
    if (matches) {
      return { score: SCORE_PUBLISHER_INFERRED, reason: 'Inferred publisher match' };
    } else {
      return { score: PENALTY_PUBLISHER_MISMATCH, reason: `Inferred publisher mismatch: expected ${inferredPublishers.join('/')}, got ${candidatePublisher}` };
    }
  }
  
  return { score: 0 };
}

// ============================================================================
// ISSUE #1 VOLUME-FIRST RULE - Detect when to use priority volume search
// ============================================================================
function shouldUseIssue1VolumeFirst(parsedQuery: { issue: string | null; year: number | null }): boolean {
  // Only trigger for Issue #1 WITH a year provided
  if (parsedQuery.issue !== '1') return false;
  if (!parsedQuery.year) return false;
  if (!isValidYear(parsedQuery.year)) return false;
  
  return true;
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
const SCORE_YEAR_OFF_4_10 = 5;
const PENALTY_YEAR_OFF_GT_10 = -25;
const PENALTY_YEAR_MISSING = -10;
const PENALTY_TPB_COLLECTION = -30;

function scoreResult(result: ComicVineIssue, parsedQuery: { title: string; issue: string | null; year: number | null; publisher?: string | null }): { score: number; rejected: boolean; rejectReason?: string } {
  let score = 0;
  let yearScore = 0;
  let hasExactYear = false;
  let hasExactIssue = false;
  let rejected = false;
  let rejectReason: string | undefined;
  
  const volumeName = result.volume?.name || '';
  const issueName = result.name || '';
  const queryTitle = parsedQuery.title;
  
  // =========================================================================
  // SANITY FILTER 1: Token Overlap Check
  // =========================================================================
  const tokenCheck = checkTokenOverlap(queryTitle, volumeName);
  if (!tokenCheck.passes) {
    // Also check against issue name as fallback
    const issueTokenCheck = checkTokenOverlap(queryTitle, issueName);
    if (!issueTokenCheck.passes) {
      console.log('[SANITY-FILTER] Rejected due to token overlap:', volumeName, '|', tokenCheck.reason);
      score += PENALTY_TOKEN_OVERLAP_FAIL;
      // Don't fully reject, just heavily penalize to allow tie-breaking
    }
  }
  
  // =========================================================================
  // SANITY FILTER 2: Format Filter
  // =========================================================================
  const formatCheck = checkFormatFilter(queryTitle, issueName, volumeName);
  if (!formatCheck.passes) {
    console.log('[SANITY-FILTER] Rejected due to format filter:', volumeName, '|', formatCheck.reason);
    score += PENALTY_FORMAT_FILTER;
    rejected = true;
    rejectReason = formatCheck.reason;
  }
  
  // =========================================================================
  // Title similarity (0-40 points)
  // =========================================================================
  const volNameLower = volumeName.toLowerCase();
  const queryTitleLower = queryTitle.toLowerCase();
  
  if (volNameLower === queryTitleLower) {
    score += SCORE_TITLE_MAX;
  } else if (volNameLower.includes(queryTitleLower) || queryTitleLower.includes(volNameLower)) {
    score += 30;
  } else {
    // Word overlap scoring
    const queryWords = queryTitleLower.split(/\s+/).filter(w => w.length > 2);
    const volumeWords = volNameLower.split(/\s+/).filter(w => w.length > 2);
    const overlap = queryWords.filter(w => volumeWords.includes(w)).length;
    const overlapRatio = queryWords.length > 0 ? overlap / queryWords.length : 0;
    score += Math.round(overlapRatio * SCORE_TITLE_MAX);
  }
  
  // =========================================================================
  // Issue number matching (+35 exact, +30 normalized)
  // =========================================================================
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
  
  // =========================================================================
  // Year scoring - Enhanced with stronger weights for non-#1 queries too
  // =========================================================================
  if (parsedQuery.year) {
    if (result.cover_date) {
      const resultYear = new Date(result.cover_date).getFullYear();
      const yearDiff = Math.abs(resultYear - parsedQuery.year);
      
      if (yearDiff === 0) {
        yearScore = SCORE_YEAR_EXACT;  // +35
        hasExactYear = true;
      } else if (yearDiff === 1) {
        yearScore = SCORE_YEAR_OFF_1;  // +25
      } else if (yearDiff <= 3) {
        yearScore = SCORE_YEAR_OFF_2_3; // +15
      } else if (yearDiff <= 10) {
        yearScore = SCORE_YEAR_OFF_4_10; // +5
      } else {
        yearScore = PENALTY_YEAR_OFF_GT_10; // -25 (stronger penalty)
      }
    } else {
      // Year provided but candidate has no year = penalty
      yearScore = PENALTY_YEAR_MISSING; // -10
    }
    score += yearScore;
  }
  
  // =========================================================================
  // SANITY FILTER 3: Publisher Match/Mismatch
  // This happens only in volume-first path where we have publisher info
  // For first-pass, we'll add this in tie-breaking
  // =========================================================================
  // Publisher scoring is handled separately in the main flow
  
  // =========================================================================
  // Penalize collections, trades, reprints, foreign editions
  // =========================================================================
  const name = issueName.toLowerCase();
  const desc = (result.description || '').toLowerCase();
  const volNameCheck = volNameLower;
  
  const isTPBOrCollection = 
    name.includes('tpb') || 
    name.includes('trade paperback') || 
    name.includes('collection') ||
    name.includes('omnibus') ||
    name.includes('graphic novel') ||
    name.includes('megazine') ||
    name.includes('magazine') ||
    volNameCheck.includes('tpb') ||
    volNameCheck.includes('collection') ||
    volNameCheck.includes('megazine') ||
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
    volNameCheck.includes('spanish') ||
    volNameCheck.includes('french');
  
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
  (result as any)._rejected = rejected;
  (result as any)._rejectReason = rejectReason;
  
  return { score, rejected, rejectReason };
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
    else if (yearDiff <= 10) score += SCORE_YEAR_OFF_4_10;
    else score += PENALTY_YEAR_OFF_GT_10;
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

/**
 * Fetch a SPECIFIC issue from a volume by issue number
 * First tries direct API filter; if that fails, uses paginated search
 */
async function fetchSpecificIssue(volumeId: number, issueNumber: string): Promise<any | null> {
  console.log('[VOLUME-FIRST] Fetching specific issue:', issueNumber, 'from volume:', volumeId);
  
  // Normalize issue number for filter
  const normalizedIssue = issueNumber.replace(/^0+/, '');
  
  // First try direct filter (works for many series)
  const params = new URLSearchParams({
    api_key: COMICVINE_API_KEY!,
    format: 'json',
    filter: `volume:${volumeId},issue_number:${normalizedIssue}`,
    limit: '5',
    field_list: 'id,name,issue_number,cover_date,image,volume'
  });

  const response = await fetch(
    `https://comicvine.gamespot.com/api/issues/?${params}`,
    { headers: { 'User-Agent': 'GrailSeeker/1.0' } }
  );

  if (response.ok) {
    const data = await response.json();
    const results = data.results || [];
    
    const exactMatch = results.find((issue: any) => {
      const resultIssue = issue.issue_number?.toString().replace(/^0+/, '');
      return resultIssue === normalizedIssue;
    });
    
    if (exactMatch) {
      console.log('[VOLUME-FIRST] Found exact issue via direct filter:', exactMatch.id);
      return exactMatch;
    }
  }
  
  // Direct filter failed - use paginated search
  console.log('[VOLUME-FIRST] Direct filter failed, using paginated search for issue', issueNumber);
  
  const targetIssueNum = parseInt(normalizedIssue, 10);
  if (isNaN(targetIssueNum)) {
    console.log('[VOLUME-FIRST] Non-numeric issue number:', issueNumber);
    return null;
  }
  
  // Calculate approximate offset - issues are roughly chronological
  // For issue #423, start around offset 400
  const estimatedOffset = Math.max(0, targetIssueNum - 25);
  const maxPages = 3; // Search up to 3 pages (150 issues)
  
  for (let page = 0; page < maxPages; page++) {
    const offset = estimatedOffset + (page * 50);
    
    const paginatedParams = new URLSearchParams({
      api_key: COMICVINE_API_KEY!,
      format: 'json',
      filter: `volume:${volumeId}`,
      offset: offset.toString(),
      limit: '50',
      sort: 'issue_number:asc',
      field_list: 'id,name,issue_number,cover_date,image,volume'
    });

    try {
      const pageResponse = await fetch(
        `https://comicvine.gamespot.com/api/issues/?${paginatedParams}`,
        { headers: { 'User-Agent': 'GrailSeeker/1.0' } }
      );

      if (!pageResponse.ok) {
        console.error('[VOLUME-FIRST] Paginated fetch error:', pageResponse.status);
        continue;
      }

      const pageData = await pageResponse.json();
      const pageResults = pageData.results || [];
      
      if (pageResults.length === 0) {
        console.log('[VOLUME-FIRST] No more issues at offset', offset);
        break;
      }
      
      // Search for exact match
      const exactMatch = pageResults.find((issue: any) => {
        const resultIssue = issue.issue_number?.toString().replace(/^0+/, '');
        return resultIssue === normalizedIssue;
      });
      
      if (exactMatch) {
        console.log('[VOLUME-FIRST] Found issue via pagination at offset', offset, ':', exactMatch.id);
        return exactMatch;
      }
      
      // Check if we've passed the target issue number
      const lastIssue = pageResults[pageResults.length - 1];
      const lastIssueNum = parseInt(lastIssue.issue_number?.toString().replace(/^0+/, '') || '0', 10);
      if (lastIssueNum > targetIssueNum + 10) {
        console.log('[VOLUME-FIRST] Passed target issue, stopping search');
        break;
      }
    } catch (err) {
      console.error('[VOLUME-FIRST] Pagination error:', err);
    }
  }
  
  console.log('[VOLUME-FIRST] Issue', issueNumber, 'not found in volume', volumeId);
  return null;
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
  
  // Step 2: Filter volumes by issue count if looking for high issue numbers
  const requestedIssueNum = parsedQuery.issue ? parseInt(parsedQuery.issue.replace(/^0+/, ''), 10) : 0;
  const filteredVolumes = volumes.filter(v => {
    // If looking for a high issue number, filter out volumes that can't have it
    if (requestedIssueNum > 0 && v.count_of_issues) {
      // Allow some buffer - ComicVine issue counts aren't always accurate
      if (v.count_of_issues < requestedIssueNum * 0.8) {
        console.log('[VOLUME-FIRST] Filtering out volume', v.name, 'year:', v.start_year, 
          '- only has', v.count_of_issues, 'issues, need issue #', requestedIssueNum);
        return false;
      }
    }
    return true;
  });
  
  console.log('[VOLUME-FIRST] Volumes after issue-count filter:', filteredVolumes.length, 'of', volumes.length);
  
  // If no volumes pass the filter, fall back to top volumes by issue count
  const volumesToScore = filteredVolumes.length > 0 
    ? filteredVolumes 
    : volumes.sort((a, b) => (b.count_of_issues || 0) - (a.count_of_issues || 0)).slice(0, 5);
  
  // Step 3: Score and sort volumes
  const scoredVolumes = volumesToScore.map(v => ({
    volume: v,
    score: scoreVolume(v, parsedQuery)
  })).sort((a, b) => b.score - a.score);
  
  console.log('[VOLUME-FIRST] Top 3 volumes:', scoredVolumes.slice(0, 3).map(sv => ({
    name: sv.volume.name,
    year: sv.volume.start_year,
    issueCount: sv.volume.count_of_issues,
    score: sv.score
  })));
  
  // Step 4: Take top 3 volumes and find specific issue in each
  const topVolumes = scoredVolumes.slice(0, 3);
  const matchPromises = topVolumes.map(async ({ volume, score: volumeScore }) => {
    try {
      // Use targeted issue fetch for efficiency (handles large volumes like Batman)
      if (parsedQuery.issue) {
        const exactMatch = await fetchSpecificIssue(volume.id, parsedQuery.issue);
        
        if (exactMatch) {
          const coverDate = exactMatch.cover_date;
          const year = coverDate ? new Date(coverDate).getFullYear() : null;
          
          // Calculate confidence
          let confidence = volumeScore;
          let hasExactYear = false;
          
          confidence += SCORE_ISSUE_EXACT;
          
          if (parsedQuery.year) {
            if (year) {
              const yearDiff = Math.abs(year - parsedQuery.year);
              if (yearDiff === 0) { confidence += SCORE_YEAR_EXACT; hasExactYear = true; }
              else if (yearDiff === 1) { confidence += SCORE_YEAR_OFF_1; }
              else if (yearDiff <= 3) { confidence += SCORE_YEAR_OFF_2_3; }
              else if (yearDiff <= 10) { confidence += SCORE_YEAR_OFF_4_10; }
              else { confidence += PENALTY_YEAR_OFF_GT_10; }
            } else {
              confidence += PENALTY_YEAR_MISSING;
            }
          }
          
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
      console.error('[VOLUME-FIRST] Error fetching issue for volume', volume.id, err);
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
// ISSUE #1 VOLUME-FIRST PRIORITY SEARCH
// This runs BEFORE general search when issue=1 AND year is provided
// Uses stricter year filtering (±3 years) and historical bias
// ============================================================================
async function issue1VolumeFirstSearch(
  parsedQuery: { title: string; issue: string | null; year: number | null; publisher: string | null }
): Promise<TopMatch[]> {
  console.log('[ISSUE-1-RULE] Volume-first rule triggered for Issue #1 with year:', parsedQuery.year);
  
  // Step 1: Search for volumes
  const volumes = await searchVolumes(parsedQuery.title);
  if (volumes.length === 0) {
    console.log('[ISSUE-1-RULE] No volumes found');
    return [];
  }
  
  console.log('[ISSUE-1-RULE] Found', volumes.length, 'total volumes');
  
  // Step 2: Filter volumes by year proximity (±3 years only)
  const targetYear = parsedQuery.year!;
  const filteredVolumes = volumes.filter(v => {
    if (!v.start_year) return false;
    const volumeYear = typeof v.start_year === 'string' ? parseInt(v.start_year) : v.start_year;
    if (isNaN(volumeYear)) return false;
    const yearDiff = Math.abs(volumeYear - targetYear);
    return yearDiff <= ISSUE_1_YEAR_WINDOW;
  });
  
  console.log('[ISSUE-1-RULE] Volumes within ±' + ISSUE_1_YEAR_WINDOW + ' years:', filteredVolumes.length);
  
  // If no volumes in year window, fall back to all volumes but with lower confidence
  const volumesToScore = filteredVolumes.length > 0 ? filteredVolumes : volumes.slice(0, 10);
  const isYearFiltered = filteredVolumes.length > 0;
  
  // Step 3: Score volumes with enhanced Issue #1 ranking
  const scoredVolumes = volumesToScore.map(v => {
    let score = 0;
    const volumeYear = typeof v.start_year === 'string' ? parseInt(v.start_year) : v.start_year;
    
    // Title similarity (0-40 points)
    const similarity = stringSimilarity(parsedQuery.title, v.name);
    score += similarity * SCORE_TITLE_MAX;
    
    // Year proximity scoring (stronger weights for Issue #1)
    if (volumeYear && !isNaN(volumeYear)) {
      const yearDiff = Math.abs(volumeYear - targetYear);
      
      if (yearDiff === 0) {
        score += SCORE_VOLUME_EXACT_YEAR; // +40 for exact year
      } else if (yearDiff === 1) {
        score += SCORE_VOLUME_YEAR_OFF_1; // +30 for ±1 year
      } else if (yearDiff <= 3) {
        score += SCORE_VOLUME_YEAR_OFF_2_3; // +15 for ±2-3 years
      } else {
        score += PENALTY_YEAR_OFF_GT_10; // -25 for >3 years (shouldn't happen if filtered)
      }
      
      // Historical bias: prefer older "first run" volumes for issue #1
      // Earlier volumes are more likely to be original runs
      if (volumeYear < targetYear + 2) {
        score += SCORE_VOLUME_HISTORICAL_BIAS;
      }
    } else {
      score += PENALTY_YEAR_MISSING;
    }
    
    // Publisher match
    if (parsedQuery.publisher && v.publisher?.name) {
      const pubName = v.publisher.name.toLowerCase();
      const queryPub = parsedQuery.publisher.toLowerCase();
      if (pubName === queryPub || pubName.includes(queryPub) || queryPub.includes(pubName)) {
        score += SCORE_PUBLISHER_MATCH;
      }
    }
    
    // Prefer volumes with more issues (more likely to be main series, not one-shots)
    if (v.count_of_issues > 50) score += 10;
    else if (v.count_of_issues > 20) score += 6;
    else if (v.count_of_issues > 5) score += 3;
    
    // Penalize collections
    const volName = v.name.toLowerCase();
    if (volName.includes('tpb') || volName.includes('collection') || volName.includes('omnibus')) {
      score += PENALTY_TPB_COLLECTION;
    }
    
    return { volume: v, score, volumeYear };
  }).sort((a, b) => b.score - a.score);
  
  console.log('[ISSUE-1-RULE] Top 3 scored volumes:', scoredVolumes.slice(0, 3).map(sv => ({
    name: sv.volume.name,
    year: sv.volumeYear,
    publisher: sv.volume.publisher?.name,
    score: sv.score,
    issues: sv.volume.count_of_issues
  })));
  
  // Step 4: Take top 3 volumes and fetch issue #1 from each
  const topVolumes = scoredVolumes.slice(0, 3);
  const matchPromises = topVolumes.map(async ({ volume, score: volumeScore, volumeYear }) => {
    try {
      const issues = await fetchVolumeIssues(volume.id);
      
      // Find issue #1
      const issue1 = issues.find(issue => {
        const issueNum = issue.issue_number?.toString().replace(/^0+/, '');
        return issueNum === '1';
      });
      
      if (!issue1) {
        console.log('[ISSUE-1-RULE] No issue #1 found in volume:', volume.name);
        return null;
      }
      
      const coverDate = issue1.cover_date;
      const issueYear = coverDate ? new Date(coverDate).getFullYear() : volumeYear;
      
      // Calculate final confidence
      let confidence = volumeScore;
      let hasExactYear = false;
      
      // Add issue match bonus (we found issue #1)
      confidence += SCORE_ISSUE_EXACT;
      
      // Check issue year against target year
      if (issueYear) {
        const yearDiff = Math.abs(issueYear - targetYear);
        if (yearDiff === 0) {
          confidence += SCORE_YEAR_EXACT;
          hasExactYear = true;
        } else if (yearDiff === 1) {
          confidence += SCORE_YEAR_OFF_1;
          hasExactYear = true; // Close enough for tie-breaking
        } else if (yearDiff <= 3) {
          confidence += SCORE_YEAR_OFF_2_3;
        } else {
          confidence += PENALTY_YEAR_OFF_GT_10;
        }
      } else {
        confidence += PENALTY_YEAR_MISSING;
      }
      
      // If we used year-filtered volumes, this is higher confidence
      if (isYearFiltered) {
        confidence += 5; // Small bonus for being in the year window
      }
      
      // Cap at 130 for Issue #1 volume-first matches (slightly higher than regular)
      confidence = Math.min(130, Math.max(0, confidence));
      
      console.log('[ISSUE-1-RULE] Found issue #1:', volume.name, 'year:', issueYear, 'confidence:', confidence);
      
      return {
        comicvine_issue_id: issue1.id,
        comicvine_volume_id: volume.id,
        series: volume.name,
        issue: '1',
        year: issueYear,
        publisher: volume.publisher?.name || null,
        coverUrl: issue1.image?.medium_url || volume.image?.medium_url || null,
        confidence,
        fallbackPath: 'issue-1-volume-first',
        _hasExactYear: hasExactYear,
        _hasExactIssue: true
      } as TopMatch;
    } catch (err) {
      console.error('[ISSUE-1-RULE] Error fetching issues for volume', volume.id, err);
      return null;
    }
  });
  
  const matches = (await Promise.all(matchPromises)).filter((m): m is TopMatch => m !== null);
  
  // Sort by confidence, then by year proximity for tie-breaking
  matches.sort((a, b) => {
    const scoreDiff = b.confidence - a.confidence;
    if (Math.abs(scoreDiff) > 5) return scoreDiff;
    
    // Tie-break: prefer exact year match
    const aExactYear = (a as any)._hasExactYear || false;
    const bExactYear = (b as any)._hasExactYear || false;
    if (bExactYear && !aExactYear) return 1;
    if (aExactYear && !bExactYear) return -1;
    
    // Tie-break: prefer year closer to target
    if (a.year && b.year) {
      const aDiff = Math.abs(a.year - targetYear);
      const bDiff = Math.abs(b.year - targetYear);
      if (aDiff !== bDiff) return aDiff - bDiff;
    }
    
    return scoreDiff;
  });
  
  console.log('[ISSUE-1-RULE] Final matches:', matches.length, matches.slice(0, 3).map(m => ({
    series: m.series,
    year: m.year,
    publisher: m.publisher,
    confidence: m.confidence
  })));
  
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
  // Parse query first to check for Issue #1 rule
  const parsedQuery = parseQuery(query);
  
  // =========================================================================
  // ISSUE #1 VOLUME-FIRST RULE
  // When issue=1 AND year is provided, use volume-first search FIRST
  // This ensures we find the correct original run (e.g., Saga #1 2012)
  // =========================================================================
  if (shouldUseIssue1VolumeFirst(parsedQuery)) {
    console.log('[SCANNER] Issue #1 + year detected, using volume-first priority search');
    
    const issue1Matches = await withTimeout(
      issue1VolumeFirstSearch(parsedQuery),
      FALLBACK_TIMEOUT_MS * 1.5, // Slightly longer timeout for this path
      []
    );
    
    if (issue1Matches.length > 0) {
      const bestMatch = issue1Matches[0];
      
      console.log('[SCANNER] Issue #1 rule found match:', bestMatch.series, '#1', bestMatch.year, 'confidence:', bestMatch.confidence);
      
      // If we got a high-confidence match from Issue #1 rule, use it directly
      if (bestMatch.confidence >= CONFIDENCE_THRESHOLD) {
        return {
          topMatch: null, // Will be populated by caller if needed
          topMatches: issue1Matches.slice(0, 3),
          confidence: bestMatch.confidence,
          fallbackUsed: true,
          fallbackPath: 'issue-1-volume-first'
        };
      }
    }
    
    // If Issue #1 rule didn't find good matches, fall through to regular search
    console.log('[SCANNER] Issue #1 rule found no high-confidence matches, falling back to regular search');
  }
  
  // First pass: Issue search (for non-Issue #1 queries or Issue #1 without year)
  const { results } = await searchComicVineIssues(query);
  
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
  const scored = results.map(result => {
    const scoreResult_result = scoreResult(result, parsedQuery);
    return {
      result,
      score: scoreResult_result.score,
      rejected: scoreResult_result.rejected,
      rejectReason: scoreResult_result.rejectReason
    };
  }).sort((a, b) => b.score - a.score);
  
  console.log('[FIRST-PASS] Top 3 scored:', scored.slice(0, 3).map(s => ({
    title: s.result.volume?.name,
    issue: s.result.issue_number,
    year: s.result.cover_date,
    score: s.score,
    rejected: s.rejected
  })));
  
  const topScore = scored[0]?.score || 0;
  const topResult = scored[0]?.result;
  
  // =========================================================================
  // GENERALIZED VOLUME-FIRST FALLBACK
  // Trigger when:
  // (a) No candidates survive sanity filtering (all rejected)
  // (b) Best score < 60
  // (c) No candidates have title token overlap  
  // =========================================================================
  
  // Count candidates that survived sanity filtering
  const nonRejectedCandidates = scored.filter(s => !s.rejected);
  const candidatesWithTokenOverlap = scored.filter(s => {
    const volumeName = s.result.volume?.name || '';
    const tokenCheck = checkTokenOverlap(parsedQuery.title, volumeName);
    return tokenCheck.passes;
  });
  
  const sanityFallbackNeeded = 
    nonRejectedCandidates.length === 0 ||
    topScore < 60 ||
    candidatesWithTokenOverlap.length === 0;
  
  // Original ambiguity check still applies
  const needsFallback = 
    sanityFallbackNeeded ||
    topScore < CONFIDENCE_THRESHOLD ||
    isAmbiguousQuery(parsedQuery.title, parsedQuery.issue);
  
  if (needsFallback) {
    const fallbackReason = sanityFallbackNeeded
      ? `Sanity fallback: nonRejected=${nonRejectedCandidates.length}, tokenOverlap=${candidatesWithTokenOverlap.length}, topScore=${topScore}`
      : `Low confidence or ambiguous: score=${topScore}, threshold=${CONFIDENCE_THRESHOLD}`;
    console.log('[SCANNER] Volume-first fallback triggered:', fallbackReason);
    
    // Run generalized volume-first fallback
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
