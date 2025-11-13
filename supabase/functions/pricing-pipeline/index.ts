import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * Pricing Pipeline - Aggregates pricing data from multiple sources
 * Activated by FEATURE_PRICING_PIPELINE flag
 */
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { title, issue, year, publisher, grade, comicvineId } = await req.json();
    
    console.log('[pricing-pipeline] Request:', { title, issue, year, publisher, grade, comicvineId });

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const pricingData: any = {
      floor: null,
      median: null,
      high: null,
      currency: 'USD',
      sources: []
    };

    // 1. ComicVine metadata (free, always available)
    if (comicvineId) {
      console.log('[pricing-pipeline] Fetching ComicVine metadata...');
      pricingData.sources.push({
        name: 'comicvine',
        type: 'metadata',
        available: true
      });
    }

    // 2. eBay sold listings (if FEATURE_EBAY_COMPS enabled)
    if (Deno.env.get('FEATURE_EBAY_COMPS') === 'true' && title && issue) {
      console.log('[pricing-pipeline] Fetching eBay comps...');
      try {
        const { data: ebayData, error: ebayError } = await supabase.functions.invoke('ebay-pricing', {
          body: { title, issueNumber: issue, grade }
        });

        if (!ebayError && ebayData?.ok && ebayData.avgPrice) {
          pricingData.floor = Math.round(ebayData.avgPrice * 0.7);
          pricingData.median = Math.round(ebayData.avgPrice);
          pricingData.high = Math.round(ebayData.avgPrice * 1.3);
          pricingData.sources.push({
            name: 'ebay',
            type: 'sold_listings',
            available: true,
            count: ebayData.items?.length || 0
          });
        }
      } catch (e) {
        console.warn('[pricing-pipeline] eBay fetch failed:', e);
        pricingData.sources.push({
          name: 'ebay',
          type: 'sold_listings',
          available: false,
          error: 'fetch_failed'
        });
      }
    }

    // 3. GCD/GoCollect fallback (if FEATURE_GCD_FALLBACK enabled)
    if (Deno.env.get('FEATURE_GCD_FALLBACK') === 'true' && !pricingData.median) {
      console.log('[pricing-pipeline] GCD fallback enabled but not yet implemented');
      pricingData.sources.push({
        name: 'gcd',
        type: 'market_data',
        available: false,
        error: 'not_implemented'
      });
    }

    // Calculate confidence based on sources
    const availableSources = pricingData.sources.filter((s: any) => s.available);
    pricingData.confidence = availableSources.length > 0 
      ? Math.min(95, 50 + (availableSources.length * 20))
      : 0;

    console.log('[pricing-pipeline] Complete:', {
      floor: pricingData.floor,
      median: pricingData.median,
      high: pricingData.high,
      confidence: pricingData.confidence,
      sourcesCount: availableSources.length
    });

    return new Response(
      JSON.stringify({ 
        ok: true, 
        pricing: pricingData 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('[pricing-pipeline] Error:', error);
    return new Response(
      JSON.stringify({ 
        ok: false, 
        error: error.message,
        pricing: null
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
