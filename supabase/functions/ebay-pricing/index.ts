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
}

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
];

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
    'punisher', 'ghost rider', 'moon knight', 'venom', 'deadpool'];
  
  // Common DC titles
  const dcTitles = ['batman', 'superman', 'wonder woman', 'justice league', 'flash',
    'green lantern', 'aquaman', 'teen titans', 'nightwing', 'harley quinn', 'joker'];
  
  if (marvelTitles.some(t => lowerTitle.includes(t))) return 'marvel';
  if (dcTitles.some(t => lowerTitle.includes(t))) return 'dc';
  
  return null;
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
  }
  
  // Check if results match the title
  const titleWords = originalTitle.toLowerCase().split(/\s+/).filter(w => w.length > 2);
  const matchingItems = items.filter(item => {
    const itemTitle = item.title.toLowerCase();
    return titleWords.every(word => itemTitle.includes(word));
  });
  
  if (matchingItems.length < items.length / 2) {
    score -= 25;
    reasons.push('Results may not match exact title');
  }
  
  // Check if issue number is in results
  if (issueNumber) {
    const issueMatches = items.filter(item => 
      item.title.includes(`#${issueNumber}`) || 
      item.title.includes(` ${issueNumber} `) ||
      item.title.toLowerCase().includes(`issue ${issueNumber}`)
    );
    if (issueMatches.length < items.length / 2) {
      score -= 20;
      reasons.push('Issue number may not match');
    }
  }
  
  // Large price variance = lower confidence
  if (items.length >= 2) {
    const prices = items.map(i => i.price);
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);
    const variance = maxPrice / minPrice;
    
    if (variance > 5) {
      score -= 25;
      reasons.push('High price variance in results');
    } else if (variance > 3) {
      score -= 15;
      reasons.push('Moderate price variance');
    }
  }
  
  // Very low prices for comics might indicate wrong results
  const avgPrice = items.reduce((sum, i) => sum + i.price, 0) / items.length;
  if (avgPrice < 5) {
    score -= 20;
    reasons.push('Unusually low prices - may be wrong edition');
  }
  
  return { score: Math.max(0, score), reasons };
}

// Filter out reprints and facsimiles from results
function filterResults(items: EbaySoldItem[]): EbaySoldItem[] {
  return items.filter(item => {
    const lowerTitle = item.title.toLowerCase();
    return !EXCLUDE_KEYWORDS.some(keyword => lowerTitle.includes(keyword));
  });
}

// Build optimized search query
function buildSearchQuery(
  title: string, 
  issueNumber?: string, 
  grade?: string,
  publisher?: string,
  year?: number
): string {
  let query = title;
  
  // Add issue number
  if (issueNumber) {
    query += ` #${issueNumber}`;
  }
  
  // Add grade for slabbed comics
  if (grade) {
    query += ` CGC ${grade}`;
  }
  
  // Add publisher if detected
  if (publisher) {
    query += ` ${publisher}`;
  }
  
  // For vintage comics, add era hint
  if (year && year < 1980) {
    query += ' vintage original';
  } else if (year && year < 2000) {
    query += ' original';
  }
  
  // Exclude common reprint keywords in query
  query += ' -reprint -facsimile -"true believers"';
  
  return query;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { title, issueNumber, grade, publisher, year } = await req.json();
    
    if (!title) {
      return new Response(
        JSON.stringify({ error: "Title is required" }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
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
    
    console.log(`[eBay Pricing] Fetching for: "${title}" #${issueNumber || 'N/A'}, publisher: ${detectedPublisher || 'unknown'}, year: ${year || 'unknown'}, ENV: ${EBAY_ENV}`);
    console.log(`[eBay Pricing] Client ID prefix: ${EBAY_CLIENT_ID.substring(0, 10)}...`);

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
          totalResults: 0,
          confidence: { score: 0, reasons: ['eBay authentication failed'] },
          isBeta: true,
          warning: `eBay auth failed: ${errorText.substring(0, 100)}`
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { access_token } = await tokenResponse.json();

    // Build optimized search query
    const searchQuery = buildSearchQuery(title, issueNumber, grade, detectedPublisher, year);
    console.log('[eBay Pricing] Search query:', searchQuery);

    // Search Browse API for sold listings
    const browseUrl = EBAY_ENV === 'SANDBOX'
      ? 'https://api.sandbox.ebay.com/buy/browse/v1/item_summary/search'
      : 'https://api.ebay.com/buy/browse/v1/item_summary/search';

    // Request more items to filter and get better confidence
    const searchParams = new URLSearchParams({
      q: searchQuery,
      filter: 'buyingOptions:{FIXED_PRICE|AUCTION},soldItemsOnly:{true}',
      fieldgroups: 'EXTENDED',
      limit: '10', // Get more results for better filtering
      sort: 'endTimeNewest', // Most recent sales first for better relevance
    });

    const browseResponse = await fetch(`${browseUrl}?${searchParams}`, {
      headers: {
        'Authorization': `Bearer ${access_token}`,
        'X-EBAY-C-MARKETPLACE-ID': 'EBAY_US',
        'X-EBAY-C-ENDUSERCTX': 'contextualLocation=country=US',
      },
    });

    if (!browseResponse.ok) {
      const errorText = await browseResponse.text();
      console.error('[eBay Pricing] Browse API error:', errorText);
      return new Response(
        JSON.stringify({ 
          ok: true,
          items: [],
          avgPrice: null,
          minPrice: null,
          maxPrice: null,
          totalResults: 0,
          confidence: { score: 0, reasons: ['eBay search failed'] },
          isBeta: true,
          warning: 'Market estimate unavailable — refine details'
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const browseData = await browseResponse.json();
    let items: EbaySoldItem[] = [];

    if (browseData.itemSummaries && browseData.itemSummaries.length > 0) {
      for (const item of browseData.itemSummaries) {
        const price = parseFloat(item.price?.value || '0');
        if (price > 0) {
          items.push({
            title: item.title || '',
            price,
            currency: item.price?.currency || 'USD',
            endDate: item.itemEndDate || '',
            url: item.itemWebUrl || '',
            imageUrl: item.image?.imageUrl || item.thumbnailImages?.[0]?.imageUrl,
          });
        }
      }
    }

    // Filter out reprints and facsimiles
    const originalItemCount = items.length;
    items = filterResults(items);
    const filteredCount = originalItemCount - items.length;
    
    if (filteredCount > 0) {
      console.log(`[eBay Pricing] Filtered out ${filteredCount} reprints/facsimiles`);
    }

    // Take top 5 most relevant after filtering
    items = items.slice(0, 5);

    // Calculate prices
    const prices = items.map(i => i.price);
    const avgPrice = prices.length > 0
      ? prices.reduce((sum, p) => sum + p, 0) / prices.length
      : null;
    const minPrice = prices.length > 0 ? Math.min(...prices) : null;
    const maxPrice = prices.length > 0 ? Math.max(...prices) : null;

    // Calculate confidence score
    const confidence = calculateConfidence(items, searchQuery, title, issueNumber);
    
    console.log(`[eBay Pricing] Found ${items.length} items after filtering, avg: $${avgPrice?.toFixed(2)}, confidence: ${confidence.score}%`);
    console.log(`[eBay Pricing] Confidence reasons:`, confidence.reasons);

    // Low confidence response
    const isLowConfidence = confidence.score < 50;
    
    return new Response(
      JSON.stringify({
        ok: true,
        items,
        avgPrice: isLowConfidence ? null : avgPrice,
        minPrice: isLowConfidence ? null : minPrice,
        maxPrice: isLowConfidence ? null : maxPrice,
        totalResults: browseData.total || 0,
        confidence,
        isBeta: true,
        warning: isLowConfidence ? 'Market estimate unavailable — refine details' : undefined,
        searchQuery, // Include for debugging
      }),
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
        totalResults: 0,
        confidence: { score: 0, reasons: ['Internal error'] },
        isBeta: true,
        warning: 'Market estimate unavailable — refine details'
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
