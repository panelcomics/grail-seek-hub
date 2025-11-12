import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * eBay Comps Endpoint (Scaffold for future implementation)
 * Currently logs requests only - actual eBay fetching to be implemented later
 */
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Check feature flag
    if (Deno.env.get('FEATURE_EBAY_COMPS') !== 'true') {
      return new Response(
        JSON.stringify({ ok: false, error: 'eBay comps feature not enabled' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const body = await req.json();
    const { title, issue, publisher } = body;

    console.log('[ebay-comps] Request received:', { title, issue, publisher });

    // TODO: Implement actual eBay API integration
    // For now, return placeholder
    return new Response(
      JSON.stringify({
        ok: true,
        comps: [],
        message: 'eBay comps feature coming soon'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Error in ebay-comps:', error);
    return new Response(
      JSON.stringify({ ok: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
