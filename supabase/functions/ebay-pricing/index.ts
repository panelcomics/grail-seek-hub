import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-client-info, apikey',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

interface EbaySoldItem {
  title: string;
  price: number;
  currency: string;
  endDate: string;
  url: string;
  imageUrl?: string;
  isGraded?: boolean;
  detectedGrade?: string;
}

interface PricingResult {
  ok: boolean;
  items: EbaySoldItem[];
  avgPrice: number | null;
  minPrice: number | null;
  maxPrice: number | null;
  medianPrice: number | null;
  priceRange: { low: number; mid: number; high: number } | null;
  totalResults: number;
  confidence: { score: number; reasons: string[] };
  isBeta: boolean;
  warning?: string;
  searchQuery?: string;
  gradeAdjustedPrice?: number | null;
  isKeyIssue?: boolean;
  keyDetails?: string;
  rawVsGradedPricing?: {
    raw: { avg: number; count: number } | null;
    graded: { avg: number; count: number } | null;
  };
}

// In-memory cache (persists across warm function invocations)
const priceCache = new Map<string, { data: PricingResult; timestamp: number }>();
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

// Keywords to exclude - these indicate reprints/facsimiles, not originals
const EXCLUDE_KEYWORDS = [
  'reprint',
  'facsimile',
  'modern printing',
  'true believers',
  'marvel legends reprint',
  'replica',
  'reproduction',
  'reading copy',
  'coverless',
  'incomplete',
  'missing pages',
  'water damage',
  'digital',
  'pdf',
  'lot of',
  'bundle',
];

// Minimum price threshold - below this is likely mislabeled
const MIN_PRICE_THRESHOLD = 1.00;

// Grade multipliers for condition-based adjustments (base = NM 9.4)
const GRADE_MULTIPLIERS: Record<string, number> = {
  '10.0': 2.5,
  '9.9': 2.0,
  '9.8': 1.5,
  '9.6': 1.2,
  '9.4': 1.0,  // Base
  '9.2': 0.85,
  '9.0': 0.75,
  '8.5': 0.65,
  '8.0': 0.55,
  '7.5': 0.48,
  '7.0': 0.42,
  '6.5': 0.36,
  '6.0': 0.32,
  '5.5': 0.28,
  '5.0': 0.25,
  '4.5': 0.22,
  '4.0': 0.20,
  '3.5': 0.18,
  '3.0': 0.16,
  '2.5': 0.14,
  '2.0': 0.12,
  '1.8': 0.10,
  '1.5': 0.09,
  '1.0': 0.08,
  '0.5': 0.06,
};

// Condition to approximate grade mapping
const CONDITION_TO_GRADE: Record<string, string> = {
  'mint': '9.8',
  'near mint': '9.4',
  'nm': '9.4',
  'nm+': '9.6',
  'nm-': '9.2',
  'very fine': '8.0',
  'vf': '8.0',
  'vf+': '8.5',
  'vf-': '7.5',
  'fine': '6.0',
  'fn': '6.0',
  'fn+': '6.5',
  'fn-': '5.5',
  'very good': '4.0',
  'vg': '4.0',
  'vg+': '4.5',
  'vg-': '3.5',
  'good': '2.0',
  'gd': '2.0',
  'gd+': '2.5',
  'gd-': '1.8',
  'fair': '1.5',
  'fr': '1.5',
  'poor': '0.5',
  'pr': '0.5',
};

// Major publishers for search refinement
const PUBLISHER_MAP: Record<string, string[]> = {
  'marvel': ['marvel', 'marvel comics'],
  'dc': ['dc', 'dc comics'],
  'image': ['image', 'image comics'],
  'dark horse': ['dark horse'],
  'idw': ['idw'],
  'valiant': ['valiant'],
  'boom': ['boom', 'boom studios'],
  'dynamite': ['dynamite'],
  'archie': ['archie'],
};

// Detect publisher from title
function detectPublisher(title: string): string | null {
  const lowerTitle = title.toLowerCase();
  
  // Common Marvel titles
  const marvelTitles = ['spider-man', 'x-men', 'avengers', 'iron man', 'hulk', 'thor', 
    'captain america', 'fantastic four', 'daredevil', 'silver surfer', 'wolverine',
    'punisher', 'ghost rider', 'moon knight', 'venom', 'deadpool', 'amazing fantasy',
    'tales of suspense', 'journey into mystery', 'incredible hulk', 'uncanny x-men'];
  
  // Common DC titles
  const dcTitles = ['batman', 'superman', 'wonder woman', 'justice league', 'flash',
    'green lantern', 'aquaman', 'teen titans', 'nightwing', 'harley quinn', 'joker',
    'detective comics', 'action comics', 'brave and bold', 'swamp thing'];
  
  if (marvelTitles.some(t => lowerTitle.includes(t))) return 'marvel';
  if (dcTitles.some(t => lowerTitle.includes(t))) return 'dc';
  
  return null;
}

// Detect if item is CGC/CBCS graded from title
function detectGradedStatus(itemTitle: string): { isGraded: boolean; grade?: string } {
  const lowerTitle = itemTitle.toLowerCase();
  const gradingCompanies = ['cgc', 'cbcs', 'pgx'];
  
  const isGraded = gradingCompanies.some(company => lowerTitle.includes(company));
  
  if (isGraded) {
    // Try to extract grade number
    const gradeMatch = itemTitle.match(/(?:cgc|cbcs|pgx)\s*(\d+\.?\d*)/i);
    if (gradeMatch) {
      return { isGraded: true, grade: gradeMatch[1] };
    }
  }
  
  return { isGraded, grade: undefined };
}

// Calculate median price (more robust than average)
function calculateMedian(prices: number[]): number {
  if (prices.length === 0) return 0;
  const sorted = [...prices].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

// Remove outliers using IQR method
function removeOutliers(prices: number[]): number[] {
  if (prices.length < 4) return prices;
  
  const sorted = [...prices].sort((a, b) => a - b);
  const q1Index = Math.floor(sorted.length * 0.25);
  const q3Index = Math.floor(sorted.length * 0.75);
  const q1 = sorted[q1Index];
  const q3 = sorted[q3Index];
  const iqr = q3 - q1;
  const lowerBound = q1 - 1.5 * iqr;
  const upperBound = q3 + 1.5 * iqr;
  
  return prices.filter(p => p >= lowerBound && p <= upperBound);
}

// Calculate confidence score based on result quality
function calculateConfidence(
  items: EbaySoldItem[], 
  searchQuery: string,
  originalTitle: string,
  issueNumber?: string
): { score: number; reasons: string[] } {
  const reasons: string[] = [];
  let score = 100;
  
  // No results = very low confidence
  if (items.length === 0) {
    return { score: 0, reasons: ['No sold listings found'] };
  }
  
  // Few results = lower confidence
  if (items.length < 3) {
    score -= 30;
    reasons.push(`Only ${items.length} comparable sales found`);
  } else if (items.length >= 5) {
    score += 5; // Bonus for good sample size
    reasons.push(`Good sample size (${items.length} sales)`);
  }
  
  // Check if results match the title
  const titleWords = originalTitle.toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .split(/\s+/)
    .filter(w => w.length > 2);
  
  const matchingItems = items.filter(item => {
    const itemTitle = item.title.toLowerCase();
    const matchCount = titleWords.filter(word => itemTitle.includes(word)).length;
    return matchCount >= titleWords.length * 0.6; // 60% word match
  });
  
  if (matchingItems.length < items.length / 2) {
    score -= 25;
    reasons.push('Results may not match exact title');
  }
  
  // Check if issue number is in results
  if (issueNumber) {
    const issueMatches = items.filter(item => {
      const lowerTitle = item.title.toLowerCase();
      return lowerTitle.includes(`#${issueNumber}`) || 
        lowerTitle.includes(` ${issueNumber} `) ||
        lowerTitle.includes(`issue ${issueNumber}`) ||
        lowerTitle.includes(`no. ${issueNumber}`) ||
        lowerTitle.includes(`number ${issueNumber}`);
    });
    if (issueMatches.length < items.length / 2) {
      score -= 20;
      reasons.push('Issue number may not match');
    }
  }
  
  // Price variance analysis
  const prices = items.map(i => i.price);
  const cleanedPrices = removeOutliers(prices);
  
  if (cleanedPrices.length >= 2) {
    const minPrice = Math.min(...cleanedPrices);
    const maxPrice = Math.max(...cleanedPrices);
    const variance = maxPrice / minPrice;
    
    if (variance > 5) {
      score -= 25;
      reasons.push('High price variance in results');
    } else if (variance > 3) {
      score -= 15;
      reasons.push('Moderate price variance');
    } else if (variance < 2) {
      score += 5; // Bonus for consistent pricing
      reasons.push('Consistent pricing across results');
    }
  }
  
  // Very low prices for comics might indicate wrong results
  const avgPrice = prices.reduce((sum, p) => sum + p, 0) / prices.length;
  if (avgPrice < 5) {
    score -= 20;
    reasons.push('Unusually low prices - may be wrong edition');
  }
  
  // Recent sales bonus
  const recentSales = items.filter(item => {
    if (!item.endDate) return false;
    const saleDate = new Date(item.endDate);
    const daysSinceSale = (Date.now() - saleDate.getTime()) / (1000 * 60 * 60 * 24);
    return daysSinceSale <= 30;
  });
  
  if (recentSales.length >= items.length / 2) {
    score += 5;
    reasons.push('Recent sales data available');
  }
  
  return { score: Math.max(0, Math.min(100, score)), reasons };
}

// Filter out reprints, facsimiles, and low-quality listings
function filterResults(items: EbaySoldItem[]): EbaySoldItem[] {
  return items.filter(item => {
    const lowerTitle = item.title.toLowerCase();
    
    // Exclude by keywords
    if (EXCLUDE_KEYWORDS.some(keyword => lowerTitle.includes(keyword))) {
      return false;
    }
    
    // Exclude below minimum price threshold
    if (item.price < MIN_PRICE_THRESHOLD) {
      return false;
    }
    
    return true;
  });
}

// Build multiple search query variations
function buildSearchQueries(
  title: string, 
  issueNumber?: string, 
  grade?: string,
  publisher?: string,
  year?: number
): string[] {
  const queries: string[] = [];
  const baseTitle = title.replace(/[^\w\s-]/g, '').trim();
  
  // Primary query: title + issue + exclusions
  let primaryQuery = baseTitle;
  if (issueNumber) {
    primaryQuery += ` #${issueNumber}`;
  }
  primaryQuery += ' -reprint -facsimile';
  queries.push(primaryQuery);
  
  // Secondary: with publisher
  if (publisher) {
    let pubQuery = `${publisher} ${baseTitle}`;
    if (issueNumber) pubQuery += ` #${issueNumber}`;
    pubQuery += ' -reprint -facsimile';
    queries.push(pubQuery);
  }
  
  // Tertiary: simplified for vintage
  if (year && year < 1985) {
    let vintageQuery = `${baseTitle} ${issueNumber || ''} vintage original comic`;
    queries.push(vintageQuery.trim());
  }
  
  return queries;
}

// Get grade multiplier for price adjustment
function getGradeMultiplier(grade?: string, condition?: string): number {
  if (grade && GRADE_MULTIPLIERS[grade]) {
    return GRADE_MULTIPLIERS[grade];
  }
  
  if (condition) {
    const normalizedCondition = condition.toLowerCase().trim();
    const mappedGrade = CONDITION_TO_GRADE[normalizedCondition];
    if (mappedGrade && GRADE_MULTIPLIERS[mappedGrade]) {
      return GRADE_MULTIPLIERS[mappedGrade];
    }
  }
  
  return 1.0; // Default: assume NM
}

// Generate cache key
function getCacheKey(title: string, issueNumber?: string, grade?: string, publisher?: string, year?: number): string {
  return `${title}|${issueNumber || ''}|${grade || ''}|${publisher || ''}|${year || ''}`.toLowerCase();
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { title, issueNumber, grade, publisher, year, condition, keyNotes } = await req.json();
    
    if (!title) {
      return new Response(
        JSON.stringify({ error: "Title is required" }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check cache first
    const cacheKey = getCacheKey(title, issueNumber, grade, publisher, year);
    const cached = priceCache.get(cacheKey);
    if (cached && (Date.now() - cached.timestamp) < CACHE_TTL_MS) {
      console.log(`[eBay Pricing] Cache hit for: "${title}" #${issueNumber || 'N/A'}`);
      
      // Apply grade adjustment to cached data if condition provided
      const result = { ...cached.data };
      if (condition && result.avgPrice) {
        const multiplier = getGradeMultiplier(grade, condition);
        result.gradeAdjustedPrice = Math.round(result.avgPrice * multiplier * 100) / 100;
      }
      
      return new Response(
        JSON.stringify(result),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const EBAY_CLIENT_ID = Deno.env.get('EBAY_CLIENT_ID_PROD');
    const EBAY_CLIENT_SECRET = Deno.env.get('EBAY_CLIENT_SECRET_PROD');
    const EBAY_ENV = Deno.env.get('EBAY_ENV') || 'PRODUCTION';

    // Graceful fallback if credentials missing
    if (!EBAY_CLIENT_ID || !EBAY_CLIENT_SECRET) {
      console.warn('[eBay Pricing] Credentials not configured - returning empty pricing');
      return new Response(
        JSON.stringify({ 
          ok: true, 
          items: [], 
          avgPrice: null, 
          minPrice: null, 
          maxPrice: null,
          medianPrice: null,
          priceRange: null,
          totalResults: 0,
          confidence: { score: 0, reasons: ['eBay credentials not configured'] },
          isBeta: true,
          warning: "eBay pricing unavailable - credentials not configured"
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Detect publisher if not provided
    const detectedPublisher = publisher || detectPublisher(title);
    const isKeyIssue = !!keyNotes;
    
    console.log(`[eBay Pricing] Fetching for: "${title}" #${issueNumber || 'N/A'}, publisher: ${detectedPublisher || 'unknown'}, year: ${year || 'unknown'}, isKey: ${isKeyIssue}`);

    // Get OAuth token
    const authString = btoa(`${EBAY_CLIENT_ID}:${EBAY_CLIENT_SECRET}`);
    const tokenUrl = EBAY_ENV === 'SANDBOX' 
      ? 'https://api.sandbox.ebay.com/identity/v1/oauth2/token'
      : 'https://api.ebay.com/identity/v1/oauth2/token';
    
    const tokenResponse = await fetch(tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${authString}`,
      },
      body: 'grant_type=client_credentials&scope=https://api.ebay.com/oauth/api_scope',
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error(`[eBay Pricing] OAuth failed (${tokenResponse.status}): ${errorText}`);
      
      return new Response(
        JSON.stringify({ 
          ok: true, 
          items: [], 
          avgPrice: null, 
          minPrice: null, 
          maxPrice: null,
          medianPrice: null,
          priceRange: null,
          totalResults: 0,
          confidence: { score: 0, reasons: ['eBay authentication failed'] },
          isBeta: true,
          warning: `eBay auth failed`
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { access_token } = await tokenResponse.json();

    // Build multiple search queries
    const searchQueries = buildSearchQueries(title, issueNumber, grade, detectedPublisher, year);
    console.log('[eBay Pricing] Search queries:', searchQueries);

    const browseUrl = EBAY_ENV === 'SANDBOX'
      ? 'https://api.sandbox.ebay.com/buy/browse/v1/item_summary/search'
      : 'https://api.ebay.com/buy/browse/v1/item_summary/search';

    // Try multiple queries and combine results
    let allItems: EbaySoldItem[] = [];
    const seenUrls = new Set<string>();

    for (const query of searchQueries) {
      try {
        const searchParams = new URLSearchParams({
          q: query,
          filter: 'buyingOptions:{FIXED_PRICE|AUCTION},soldItemsOnly:{true}',
          fieldgroups: 'EXTENDED',
          limit: '15',
          sort: 'endTimeNewest',
        });

        const browseResponse = await fetch(`${browseUrl}?${searchParams}`, {
          headers: {
            'Authorization': `Bearer ${access_token}`,
            'X-EBAY-C-MARKETPLACE-ID': 'EBAY_US',
            'X-EBAY-C-ENDUSERCTX': 'contextualLocation=country=US',
          },
        });

        if (browseResponse.ok) {
          const browseData = await browseResponse.json();
          
          if (browseData.itemSummaries) {
            for (const item of browseData.itemSummaries) {
              // Skip duplicates
              if (seenUrls.has(item.itemWebUrl)) continue;
              seenUrls.add(item.itemWebUrl);
              
              const price = parseFloat(item.price?.value || '0');
              if (price > 0) {
                const gradedInfo = detectGradedStatus(item.title || '');
                allItems.push({
                  title: item.title || '',
                  price,
                  currency: item.price?.currency || 'USD',
                  endDate: item.itemEndDate || '',
                  url: item.itemWebUrl || '',
                  imageUrl: item.image?.imageUrl || item.thumbnailImages?.[0]?.imageUrl,
                  isGraded: gradedInfo.isGraded,
                  detectedGrade: gradedInfo.grade,
                });
              }
            }
          }
        }
      } catch (queryError) {
        console.warn(`[eBay Pricing] Query failed: ${query}`, queryError);
      }
      
      // Stop if we have enough results
      if (allItems.length >= 20) break;
    }

    // Filter out reprints and low-quality
    const originalCount = allItems.length;
    allItems = filterResults(allItems);
    const filteredCount = originalCount - allItems.length;
    
    if (filteredCount > 0) {
      console.log(`[eBay Pricing] Filtered out ${filteredCount} reprints/low-quality listings`);
    }

    // Separate raw vs graded items
    const rawItems = allItems.filter(i => !i.isGraded);
    const gradedItems = allItems.filter(i => i.isGraded);
    
    // Take top 10 after filtering
    allItems = allItems.slice(0, 10);

    // Calculate prices with outlier removal
    const prices = allItems.map(i => i.price);
    const cleanedPrices = removeOutliers(prices);
    
    const avgPrice = cleanedPrices.length > 0
      ? Math.round((cleanedPrices.reduce((sum, p) => sum + p, 0) / cleanedPrices.length) * 100) / 100
      : null;
    const medianPrice = cleanedPrices.length > 0 
      ? Math.round(calculateMedian(cleanedPrices) * 100) / 100 
      : null;
    const minPrice = cleanedPrices.length > 0 ? Math.min(...cleanedPrices) : null;
    const maxPrice = cleanedPrices.length > 0 ? Math.max(...cleanedPrices) : null;

    // Calculate price range (low/mid/high)
    const priceRange = cleanedPrices.length >= 3 ? {
      low: Math.round(cleanedPrices[Math.floor(cleanedPrices.length * 0.25)] * 100) / 100,
      mid: medianPrice!,
      high: Math.round(cleanedPrices[Math.floor(cleanedPrices.length * 0.75)] * 100) / 100,
    } : null;

    // Calculate raw vs graded pricing
    const rawPrices = rawItems.map(i => i.price);
    const gradedPrices = gradedItems.map(i => i.price);
    const rawVsGradedPricing = {
      raw: rawPrices.length >= 2 ? {
        avg: Math.round((rawPrices.reduce((s, p) => s + p, 0) / rawPrices.length) * 100) / 100,
        count: rawPrices.length
      } : null,
      graded: gradedPrices.length >= 2 ? {
        avg: Math.round((gradedPrices.reduce((s, p) => s + p, 0) / gradedPrices.length) * 100) / 100,
        count: gradedPrices.length
      } : null,
    };

    // Calculate confidence score
    const confidence = calculateConfidence(allItems, searchQueries[0], title, issueNumber);
    
    // Grade-adjusted price
    let gradeAdjustedPrice: number | null = null;
    if (avgPrice && (condition || grade)) {
      const multiplier = getGradeMultiplier(grade, condition);
      gradeAdjustedPrice = Math.round(avgPrice * multiplier * 100) / 100;
    }

    console.log(`[eBay Pricing] Found ${allItems.length} items, avg: $${avgPrice?.toFixed(2)}, median: $${medianPrice?.toFixed(2)}, confidence: ${confidence.score}%`);

    // Build result
    const isLowConfidence = confidence.score < 50;
    
    const result: PricingResult = {
      ok: true,
      items: allItems,
      avgPrice: isLowConfidence ? null : avgPrice,
      minPrice: isLowConfidence ? null : minPrice,
      maxPrice: isLowConfidence ? null : maxPrice,
      medianPrice: isLowConfidence ? null : medianPrice,
      priceRange: isLowConfidence ? null : priceRange,
      totalResults: seenUrls.size,
      confidence,
      isBeta: true,
      warning: isLowConfidence ? 'Market estimate unavailable — refine details' : undefined,
      searchQuery: searchQueries[0],
      gradeAdjustedPrice: isLowConfidence ? null : gradeAdjustedPrice,
      isKeyIssue,
      keyDetails: isKeyIssue ? keyNotes : undefined,
      rawVsGradedPricing: isLowConfidence ? undefined : rawVsGradedPricing,
    };

    // Cache successful results
    if (!isLowConfidence && allItems.length > 0) {
      priceCache.set(cacheKey, { data: result, timestamp: Date.now() });
      console.log(`[eBay Pricing] Cached result for: "${title}" #${issueNumber || 'N/A'}`);
    }
    
    return new Response(
      JSON.stringify(result),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[eBay Pricing] Error:', error);
    return new Response(
      JSON.stringify({ 
        ok: true,
        items: [],
        avgPrice: null,
        minPrice: null,
        maxPrice: null,
        medianPrice: null,
        priceRange: null,
        totalResults: 0,
        confidence: { score: 0, reasons: ['Internal error'] },
        isBeta: true,
        warning: 'Market estimate unavailable — refine details'
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
