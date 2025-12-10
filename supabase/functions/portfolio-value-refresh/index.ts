import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const ebayAppId = Deno.env.get('EBAY_APP_ID');

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('[PORTFOLIO-REFRESH] Starting portfolio value refresh...');

    // Get all Elite users with collection items
    const { data: eliteUsers } = await supabase
      .from('profiles')
      .select('user_id')
      .eq('subscription_tier', 'elite')
      .or('subscription_expires_at.is.null,subscription_expires_at.gt.now()');

    if (!eliteUsers || eliteUsers.length === 0) {
      console.log('[PORTFOLIO-REFRESH] No Elite users found');
      return new Response(JSON.stringify({ success: true, message: 'No Elite users to process' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('[PORTFOLIO-REFRESH] Processing', eliteUsers.length, 'Elite users');

    let totalUpdated = 0;

    for (const user of eliteUsers) {
      // Get user's collection items that haven't been refreshed in 24 hours
      const { data: collectionItems } = await supabase
        .from('user_collection')
        .select('*')
        .eq('user_id', user.user_id)
        .or('last_value_refresh.is.null,last_value_refresh.lt.' + new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

      if (!collectionItems || collectionItems.length === 0) continue;

      for (const item of collectionItems) {
        try {
          // Build search query
          const searchQuery = `${item.comic_title} ${item.issue_number || ''} ${item.grade_estimate || ''} comic`.trim();

          // Query eBay sold listings (simplified - in production use full eBay API)
          let estimatedValue = item.current_value;
          
          if (ebayAppId) {
            // Call eBay pricing function
            const { data: pricingData } = await supabase.functions.invoke('ebay-pricing', {
              body: { 
                title: item.comic_title, 
                issueNumber: item.issue_number,
                grade: item.grade_estimate
              }
            });

            if (pricingData?.avgPrice) {
              const previousValue = item.current_value;
              estimatedValue = pricingData.avgPrice;

              // Calculate changes
              const value7dChange = previousValue ? estimatedValue - previousValue : 0;
              const value30dChange = item.value_30d_change 
                ? (item.value_7d_change || 0) + value7dChange 
                : value7dChange;

              // Update collection item
              await supabase
                .from('user_collection')
                .update({
                  current_value: estimatedValue,
                  value_7d_change: value7dChange,
                  value_30d_change: value30dChange,
                  last_value_refresh: new Date().toISOString(),
                })
                .eq('id', item.id);

              totalUpdated++;
            }
          } else {
            // No eBay API - just update refresh timestamp
            await supabase
              .from('user_collection')
              .update({
                last_value_refresh: new Date().toISOString(),
              })
              .eq('id', item.id);
          }
        } catch (itemError) {
          console.error('[PORTFOLIO-REFRESH] Error updating item:', item.id, itemError);
        }
      }
    }

    console.log('[PORTFOLIO-REFRESH] Complete. Updated', totalUpdated, 'items');

    return new Response(JSON.stringify({ 
      success: true, 
      updatedItems: totalUpdated 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[PORTFOLIO-REFRESH] Error:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
