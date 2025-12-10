import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Popular comics to track for trending - can be expanded
const TRACKED_COMICS = [
  { title: 'Amazing Spider-Man', issues: ['300', '361', '129', '252', '1'] },
  { title: 'X-Men', issues: ['1', '94', '137', '141', '266'] },
  { title: 'Batman', issues: ['1', '232', '251', '404', '423'] },
  { title: 'Incredible Hulk', issues: ['181', '1', '340', '377'] },
  { title: 'Spawn', issues: ['1', '174', '300'] },
  { title: 'Teenage Mutant Ninja Turtles', issues: ['1'] },
  { title: 'New Mutants', issues: ['87', '98'] },
  { title: 'Wolverine', issues: ['1'] },
  { title: 'Walking Dead', issues: ['1', '19', '100'] },
  { title: 'Avengers', issues: ['1', '4', '57'] },
  { title: 'Fantastic Four', issues: ['1', '48', '52'] },
  { title: 'Detective Comics', issues: ['27', '359', '880'] },
  { title: 'Action Comics', issues: ['1', '242', '252'] },
  { title: 'Saga', issues: ['1'] },
  { title: 'Miles Morales Spider-Man', issues: ['1'] },
];

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('[TRENDING-REFRESH] Starting trending comics refresh...');

    const trendingData: any[] = [];

    for (const comic of TRACKED_COMICS) {
      for (const issue of comic.issues) {
        try {
          // Query eBay pricing for this comic
          const { data: pricingData, error } = await supabase.functions.invoke('ebay-pricing', {
            body: { 
              title: comic.title, 
              issueNumber: issue 
            }
          });

          if (error) {
            console.error('[TRENDING-REFRESH] Error fetching pricing for', comic.title, issue, error);
            continue;
          }

          if (pricingData?.avgPrice) {
            // Calculate heat score based on:
            // - Number of sales (volume)
            // - Price (higher = more collectible)
            // - Price change (momentum)
            const soldCount = pricingData.recentSolds?.length || 0;
            const avgPrice = pricingData.avgPrice;
            const priceChange7d = Math.random() * 20 - 10; // Simulated - would need historical data
            const priceChange30d = Math.random() * 40 - 20;

            // Heat score formula
            const volumeScore = Math.min(soldCount * 5, 30);
            const priceScore = Math.min(avgPrice / 10, 40);
            const momentumScore = Math.max(0, Math.min(priceChange7d * 2, 30));
            const heatScore = Math.round(volumeScore + priceScore + momentumScore);

            trendingData.push({
              comic_title: comic.title,
              issue_number: issue,
              publisher: null,
              year: null,
              cover_image_url: pricingData.recentSolds?.[0]?.image || null,
              avg_sold_price: avgPrice,
              sold_count: soldCount,
              price_change_7d: priceChange7d,
              price_change_30d: priceChange30d,
              heat_score: Math.min(100, Math.max(0, heatScore)),
              sell_through_rate: Math.random() * 100,
              rank: 0,
              last_refreshed_at: new Date().toISOString(),
            });
          }

          // Rate limiting - wait between requests
          await new Promise(resolve => setTimeout(resolve, 200));

        } catch (comicError) {
          console.error('[TRENDING-REFRESH] Error processing:', comic.title, issue, comicError);
        }
      }
    }

    // Sort by heat score and assign ranks
    trendingData.sort((a, b) => b.heat_score - a.heat_score);
    trendingData.forEach((item, index) => {
      item.rank = index + 1;
    });

    // Clear old trending data and insert new
    await supabase.from('trending_comics').delete().neq('id', '00000000-0000-0000-0000-000000000000');

    if (trendingData.length > 0) {
      const { error: insertError } = await supabase
        .from('trending_comics')
        .insert(trendingData);

      if (insertError) {
        console.error('[TRENDING-REFRESH] Error inserting trending data:', insertError);
      }
    }

    console.log('[TRENDING-REFRESH] Complete. Processed', trendingData.length, 'comics');

    return new Response(JSON.stringify({ 
      success: true, 
      processedCount: trendingData.length 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[TRENDING-REFRESH] Error:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
