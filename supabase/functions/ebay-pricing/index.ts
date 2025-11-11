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

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { title, issueNumber, grade } = await req.json();
    
    if (!title) {
      return new Response(
        JSON.stringify({ error: "Title is required" }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const EBAY_CLIENT_ID = Deno.env.get('EBAY_CLIENT_ID_PROD');
    const EBAY_CLIENT_SECRET = Deno.env.get('EBAY_CLIENT_SECRET_PROD');
    const EBAY_ENV = Deno.env.get('EBAY_ENV') || 'PRODUCTION';

    if (!EBAY_CLIENT_ID || !EBAY_CLIENT_SECRET) {
      console.error('Missing eBay credentials');
      return new Response(
        JSON.stringify({ error: "eBay credentials not configured" }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get OAuth token
    const authString = btoa(`${EBAY_CLIENT_ID}:${EBAY_CLIENT_SECRET}`);
    const tokenResponse = await fetch(
      EBAY_ENV === 'SANDBOX' 
        ? 'https://api.sandbox.ebay.com/identity/v1/oauth2/token'
        : 'https://api.ebay.com/identity/v1/oauth2/token',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': `Basic ${authString}`,
        },
        body: 'grant_type=client_credentials&scope=https://api.ebay.com/oauth/api_scope',
      }
    );

    if (!tokenResponse.ok) {
      console.error('eBay OAuth failed:', await tokenResponse.text());
      return new Response(
        JSON.stringify({ error: "eBay authentication failed" }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { access_token } = await tokenResponse.json();

    // Build search query
    let searchQuery = title;
    if (issueNumber) searchQuery += ` ${issueNumber}`;
    if (grade) searchQuery += ` CGC ${grade}`;

    console.log('eBay search query:', searchQuery);

    // Search Browse API for sold listings
    const browseUrl = EBAY_ENV === 'SANDBOX'
      ? 'https://api.sandbox.ebay.com/buy/browse/v1/item_summary/search'
      : 'https://api.ebay.com/buy/browse/v1/item_summary/search';

    const searchParams = new URLSearchParams({
      q: searchQuery,
      filter: 'buyingOptions:{FIXED_PRICE|AUCTION},soldItemsOnly:{true}',
      fieldgroups: 'EXTENDED',
      limit: '5',
      sort: 'price', // Sort by price for better avg calculation
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
      console.error('eBay Browse API error:', errorText);
      return new Response(
        JSON.stringify({ error: "eBay search failed", details: errorText }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const browseData = await browseResponse.json();
    const items: EbaySoldItem[] = [];
    const prices: number[] = [];

    if (browseData.itemSummaries && browseData.itemSummaries.length > 0) {
      for (const item of browseData.itemSummaries) {
        const price = parseFloat(item.price?.value || '0');
        if (price > 0) {
          prices.push(price);
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

    // Calculate average price
    const avgPrice = prices.length > 0
      ? prices.reduce((sum, p) => sum + p, 0) / prices.length
      : null;

    const minPrice = prices.length > 0 ? Math.min(...prices) : null;
    const maxPrice = prices.length > 0 ? Math.max(...prices) : null;

    console.log(`Found ${items.length} items, avg price: ${avgPrice}`);

    return new Response(
      JSON.stringify({
        ok: true,
        items,
        avgPrice,
        minPrice,
        maxPrice,
        totalResults: browseData.total || 0,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('eBay pricing error:', error);
    return new Response(
      JSON.stringify({ 
        error: "Failed to fetch eBay pricing",
        details: error instanceof Error ? error.message : String(error)
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
