import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    const {
      data: { user },
    } = await supabaseClient.auth.getUser();

    if (!user) {
      return new Response(
        JSON.stringify({ success: false, error: 'Unauthorized' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { listingId, offerAmount, message } = await req.json();

    if (!listingId || !offerAmount || offerAmount <= 0) {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid offer data' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get listing to find seller
    const { data: listing, error: listingError } = await supabaseClient
      .from('inventory_items')
      .select('user_id')
      .eq('id', listingId)
      .single();

    if (listingError || !listing) {
      return new Response(
        JSON.stringify({ success: false, error: 'Listing not found' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (listing.user_id === user.id) {
      return new Response(
        JSON.stringify({ success: false, error: 'Cannot make offer on your own listing' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Insert offer
    const { error: insertError } = await supabaseClient.from('offers').insert({
      listing_id: listingId,
      buyer_id: user.id,
      seller_id: listing.user_id,
      offer_amount: offerAmount,
      message: message || null,
      status: 'pending',
    });

    if (insertError) {
      console.error('Error inserting offer:', insertError);
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to submit offer' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create notification for seller
    await supabaseClient.from('notifications').insert({
      user_id: listing.user_id,
      type: 'new_offer',
      message: `New offer of $${offerAmount} on your listing`,
      link: `/listing/${listingId}`,
    });

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in submit-offer function:', error);
    return new Response(
      JSON.stringify({ success: false, error: 'Internal error' }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
