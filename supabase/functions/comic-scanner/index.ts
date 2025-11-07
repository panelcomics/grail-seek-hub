const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const COMICVINE_API_KEY = Deno.env.get('COMICVINE_API_KEY');
const EBAY_APP_ID = Deno.env.get('EBAY_APP_ID');
const EBAY_CERT_ID = Deno.env.get('EBAY_CERT_ID');

interface ComicVineIssue {
  id: number;
  name: string;
  issue_number: string;
  volume: {
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

interface EbaySoldItem {
  price?: { value: string };
}

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

async function getEbayAccessToken(): Promise<string> {
  console.log('Getting eBay OAuth token...');
  
  const credentials = btoa(`${EBAY_APP_ID}:${EBAY_CERT_ID}`);
  
  const response = await fetch('https://api.ebay.com/identity/v1/oauth2/token', {
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

async function searchComicVine(query: string): Promise<ComicVineIssue | null> {
  console.log('Searching Comic Vine for:', query);
  
  const params = new URLSearchParams({
    api_key: COMICVINE_API_KEY!,
    format: 'json',
    query: query,
    resources: 'issue',
    limit: '1',
  });

  const response = await fetch(
    `https://comicvine.gamespot.com/api/search/?${params}`,
    {
      headers: {
        'User-Agent': 'GrailSeeker/1.0',
      },
    }
  );

  if (!response.ok) {
    console.error('Comic Vine error:', response.status);
    throw new Error(`Comic Vine API error: ${response.status}`);
  }

  const data = await response.json();
  console.log('Comic Vine results:', data.number_of_total_results);
  
  if (!data.results || data.results.length === 0) {
    return null;
  }

  return data.results[0];
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
    `https://api.ebay.com/buy/browse/v1/item_summary/search?${params}`,
    {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'X-EBAY-C-MARKETPLACE-ID': 'EBAY_US',
      },
    }
  );

  if (!response.ok) {
    console.error('eBay search error:', response.status);
    const errorText = await response.text();
    console.error('eBay error details:', errorText);
    // Don't throw, just return null
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

  const average = prices.reduce((sum: number, price: number) => sum + price, 0) / prices.length;
  console.log('Average eBay price:', average);
  
  return average;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (!COMICVINE_API_KEY || !EBAY_APP_ID || !EBAY_CERT_ID) {
      throw new Error('Missing required API credentials');
    }

    const { query } = await req.json();

    if (!query || typeof query !== 'string') {
      return new Response(
        JSON.stringify({ error: 'Query parameter is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Search Comic Vine
    const comicData = await searchComicVine(query);
    
    if (!comicData) {
      return new Response(
        JSON.stringify({ error: 'No comic found', found: false }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get eBay access token
    const ebayToken = await getEbayAccessToken();

    // Search eBay for sold prices
    const avgPrice = await getEbaySoldPrices(
      ebayToken,
      comicData.volume.name,
      comicData.issue_number
    );

    // Calculate trade fee based on double the price (two-way trade)
    const estimatedValue = avgPrice || 0;
    const tradeFee = calculateTradeFee(estimatedValue * 2);

    // Extract year from cover_date
    const year = comicData.cover_date ? new Date(comicData.cover_date).getFullYear() : null;

    // Extract characters
    const characters = comicData.character_credits?.slice(0, 5).map(c => c.name) || [];

    const result = {
      found: true,
      comic: {
        comicvine_id: comicData.id,
        title: comicData.volume.name,
        issue_number: comicData.issue_number,
        full_title: comicData.name || `${comicData.volume.name} #${comicData.issue_number}`,
        publisher: 'Comic', // Comic Vine doesn't always provide publisher in search
        year: year,
        cover_image: comicData.image.original_url,
        cover_thumb: comicData.image.medium_url,
        description: comicData.description,
        characters: characters,
        ebay_avg_price: estimatedValue,
        trade_fee_total: tradeFee.total_fee,
        trade_fee_each: tradeFee.each_user_fee,
        fee_tier: tradeFee.tier_info,
      }
    };

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in comic-scanner function:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(
      JSON.stringify({ error: errorMessage, found: false }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
