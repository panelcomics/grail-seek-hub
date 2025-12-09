/**
 * DEAL FINDER SCAN
 * ==========================================================================
 * Scans eBay for undervalued comics matching Elite users' saved searches.
 * Finds listings priced >= 15% below fair market value (median of recent solds).
 * 
 * IMPORTANT: This is an Elite-only feature. It does NOT affect:
 * - Marketplace fees
 * - Trade eligibility
 * - Any existing Stripe payment flows
 * ==========================================================================
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SavedSearch {
  id: string;
  user_id: string;
  query: {
    q?: string;
    category?: string;
    minPrice?: number;
    maxPrice?: number;
  };
}

interface DealAlert {
  id: string;
  user_id: string;
  search_id: string;
  last_checked_at: string | null;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  console.log('[DEAL_FINDER] Starting scan...');

  try {
    // Step 1: Get all Elite users with active subscriptions
    const { data: eliteUsers, error: eliteError } = await supabase
      .from('profiles')
      .select('user_id')
      .eq('subscription_tier', 'elite')
      .or('subscription_expires_at.is.null,subscription_expires_at.gt.now()');

    if (eliteError) {
      console.error('[DEAL_FINDER] Error fetching elite users:', eliteError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch elite users' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!eliteUsers || eliteUsers.length === 0) {
      console.log('[DEAL_FINDER] No elite users found');
      return new Response(
        JSON.stringify({ message: 'No elite users to process', dealsFound: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[DEAL_FINDER] Found ${eliteUsers.length} elite users`);
    const eliteUserIds = eliteUsers.map(u => u.user_id);

    // Step 2: Get deal alerts for elite users
    const { data: alerts, error: alertsError } = await supabase
      .from('elite_deal_alerts')
      .select(`
        id,
        user_id,
        search_id,
        last_checked_at,
        saved_searches!inner(id, query)
      `)
      .in('user_id', eliteUserIds);

    if (alertsError) {
      console.error('[DEAL_FINDER] Error fetching alerts:', alertsError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch alerts' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!alerts || alerts.length === 0) {
      console.log('[DEAL_FINDER] No deal alerts configured');
      return new Response(
        JSON.stringify({ message: 'No deal alerts configured', dealsFound: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[DEAL_FINDER] Processing ${alerts.length} alerts`);

    let totalDealsFound = 0;

    // Step 3: Process each alert
    for (const alert of alerts) {
      const searchQuery = (alert as any).saved_searches?.query;
      if (!searchQuery?.q) {
        console.log(`[DEAL_FINDER] Skipping alert ${alert.id} - no search query`);
        continue;
      }

      console.log(`[DEAL_FINDER] Processing alert for query: "${searchQuery.q}"`);

      try {
        // Call eBay pricing to get sold data
        const ebayResponse = await fetch(`${supabaseUrl}/functions/v1/ebay-pricing`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${supabaseServiceKey}`,
          },
          body: JSON.stringify({
            query: searchQuery.q,
            condition: searchQuery.category || 'comics',
          }),
        });

        if (!ebayResponse.ok) {
          console.error(`[DEAL_FINDER] eBay pricing failed for alert ${alert.id}`);
          continue;
        }

        const pricingData = await ebayResponse.json();
        
        // Calculate fair market value (median of solds)
        const fairMarketValue = pricingData?.medianPrice || pricingData?.averagePrice;
        
        if (!fairMarketValue || fairMarketValue <= 0) {
          console.log(`[DEAL_FINDER] No pricing data for "${searchQuery.q}"`);
          continue;
        }

        // Calculate 15% discount threshold
        const discountThreshold = fairMarketValue * 0.85;

        // Search for active listings below threshold
        const activeResponse = await fetch(`${supabaseUrl}/functions/v1/ebay-search`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${supabaseServiceKey}`,
          },
          body: JSON.stringify({
            query: searchQuery.q,
            maxPrice: discountThreshold,
            limit: 10,
          }),
        });

        if (!activeResponse.ok) {
          console.error(`[DEAL_FINDER] eBay search failed for alert ${alert.id}`);
          continue;
        }

        const activeListings = await activeResponse.json();
        const listings = activeListings?.items || activeListings || [];

        // Insert deal results
        for (const listing of listings) {
          const listingPrice = parseFloat(listing.price?.value || listing.price || 0);
          if (listingPrice <= 0 || listingPrice >= discountThreshold) continue;

          const discountPercent = ((fairMarketValue - listingPrice) / fairMarketValue) * 100;

          // Check if we already have this deal
          const { data: existing } = await supabase
            .from('deal_finder_results')
            .select('id')
            .eq('user_id', alert.user_id)
            .eq('source_url', listing.itemWebUrl || listing.url)
            .maybeSingle();

          if (existing) continue;

          // Insert new deal
          const { error: insertError } = await supabase
            .from('deal_finder_results')
            .insert({
              user_id: alert.user_id,
              alert_id: alert.id,
              title: listing.title,
              listing_price: listingPrice,
              fair_market_value: fairMarketValue,
              discount_percent: discountPercent,
              source: 'ebay',
              source_url: listing.itemWebUrl || listing.url,
              image_url: listing.image?.imageUrl || listing.imageUrl,
            });

          if (insertError) {
            console.error('[DEAL_FINDER] Error inserting deal:', insertError);
          } else {
            totalDealsFound++;
            console.log(`[DEAL_FINDER] Found deal: ${listing.title} at $${listingPrice} (${discountPercent.toFixed(1)}% off)`);
          }
        }

        // Update last_checked_at
        await supabase
          .from('elite_deal_alerts')
          .update({ last_checked_at: new Date().toISOString() })
          .eq('id', alert.id);

      } catch (err) {
        console.error(`[DEAL_FINDER] Error processing alert ${alert.id}:`, err);
      }
    }

    console.log(`[DEAL_FINDER] Scan complete. Found ${totalDealsFound} new deals.`);

    return new Response(
      JSON.stringify({ 
        message: 'Deal scan complete', 
        dealsFound: totalDealsFound,
        alertsProcessed: alerts.length 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[DEAL_FINDER] Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
