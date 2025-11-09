

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const EBAY_ENV = Deno.env.get('EBAY_ENV') || 'sandbox';
const EBAY_APP_ID = EBAY_ENV === 'production' 
  ? Deno.env.get('EBAY_CLIENT_ID_PROD')
  : Deno.env.get('EBAY_APP_ID');
const EBAY_CERT_ID = EBAY_ENV === 'production'
  ? Deno.env.get('EBAY_CLIENT_SECRET_PROD')
  : Deno.env.get('EBAY_CERT_ID');

if (EBAY_ENV === 'production') {
  console.log('eBay LIVE – Production mode active');
}

interface EbayItemSummary {
  itemId: string;
  title: string;
  price?: {
    value: string;
    currency: string;
  };
  image?: {
    imageUrl: string;
  };
  itemWebUrl: string;
  condition?: string;
  seller?: {
    username: string;
    feedbackPercentage: string;
    feedbackScore: number;
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
  console.log('Successfully obtained eBay access token');
  return data.access_token;
}

async function searchEbayItems(accessToken: string, keyword: string): Promise<EbayItemSummary[]> {
  console.log(`Searching eBay for: ${keyword}`);
  
  const params = new URLSearchParams({
    q: keyword,
    limit: '20',
    category_ids: '267', // Books category
    filter: 'deliveryCountry:US',
  });

  const response = await fetch(
    `https://api.ebay.com/buy/browse/v1/item_summary/search?${params}`,
    {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'X-EBAY-C-MARKETPLACE-ID': 'EBAY_US',
        'X-EBAY-C-ENDUSERCTX': 'affiliateCampaignId=<ePNCampaignId>,affiliateReferenceId=<referenceId>',
      },
    }
  );

  if (!response.ok) {
    const error = await response.text();
    console.error('eBay search error:', error);
    throw new Error(`Failed to search eBay: ${response.status}`);
  }

  const data = await response.json();
  console.log(`Found ${data.total || 0} results`);
  
  return data.itemSummaries || [];
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (!EBAY_APP_ID || !EBAY_CERT_ID) {
      throw new Error('eBay API credentials not configured');
    }

    const { keyword } = await req.json();

    if (!keyword || typeof keyword !== 'string') {
      return new Response(
        JSON.stringify({ error: 'Keyword parameter is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get OAuth token
    const accessToken = await getEbayAccessToken();

    // Search for items
    const items = await searchEbayItems(accessToken, keyword);

    return new Response(
      JSON.stringify({ items, count: items.length }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in ebay-search function:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
