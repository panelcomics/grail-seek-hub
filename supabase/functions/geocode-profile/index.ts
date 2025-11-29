import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface GeocodeRequest {
  postal_code: string;
  country: string;
  city?: string;
  state?: string;
}

interface GeocodeResponse {
  lat: number;
  lng: number;
  formatted_address?: string;
}

/**
 * Geocodes a US postal code using the US Census Bureau Geocoding API
 * Free, no API key required, accurate for US addresses
 */
async function geocodeUSPostalCode(postal_code: string, state?: string): Promise<GeocodeResponse | null> {
  try {
    // US Census Bureau Geocoding API - free, no API key
    // Format: https://geocoding.geo.census.gov/geocoder/locations/onelineaddress?address=20001&benchmark=2020&format=json
    const address = state ? `${postal_code}, ${state}` : postal_code;
    const url = `https://geocoding.geo.census.gov/geocoder/locations/onelineaddress?address=${encodeURIComponent(address)}&benchmark=2020&format=json`;
    
    console.log('[GEOCODE] Querying US Census Bureau:', url);
    
    const response = await fetch(url);
    if (!response.ok) {
      console.error('[GEOCODE] US Census API error:', response.status, response.statusText);
      return null;
    }

    const data = await response.json();
    
    if (data.result?.addressMatches && data.result.addressMatches.length > 0) {
      const match = data.result.addressMatches[0];
      const coords = match.coordinates;
      
      console.log('[GEOCODE] Success:', {
        lat: coords.y,
        lng: coords.x,
        address: match.matchedAddress
      });
      
      return {
        lat: coords.y,
        lng: coords.x,
        formatted_address: match.matchedAddress
      };
    }
    
    console.log('[GEOCODE] No matches found for:', postal_code);
    return null;
  } catch (error) {
    console.error('[GEOCODE] Error geocoding postal code:', error);
    return null;
  }
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Verify authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const body: GeocodeRequest = await req.json();
    const { postal_code, country, city, state } = body;

    if (!postal_code || !country) {
      return new Response(
        JSON.stringify({ error: 'postal_code and country are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let geocodeResult: GeocodeResponse | null = null;

    // Currently only support US geocoding via Census Bureau API
    if (country.toUpperCase() === 'US') {
      geocodeResult = await geocodeUSPostalCode(postal_code, state);
    } else {
      console.log('[GEOCODE] Country not supported yet:', country);
      return new Response(
        JSON.stringify({ 
          error: 'Only US geocoding is currently supported',
          country_requested: country 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!geocodeResult) {
      console.log('[GEOCODE] Geocoding failed for:', postal_code, state);
      return new Response(
        JSON.stringify({ 
          error: 'Could not geocode postal code',
          postal_code,
          state 
        }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Update user's profile with lat/lng
    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        lat: geocodeResult.lat,
        lng: geocodeResult.lng,
        city: city || null,
        state: state || null,
        country: country.toUpperCase(),
        postal_code: postal_code
      })
      .eq('user_id', user.id);

    if (updateError) {
      console.error('[GEOCODE] Error updating profile:', updateError);
      return new Response(
        JSON.stringify({ error: 'Failed to update profile with location data' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[GEOCODE] Profile updated successfully for user:', user.id);

    return new Response(
      JSON.stringify({ 
        success: true,
        lat: geocodeResult.lat,
        lng: geocodeResult.lng,
        formatted_address: geocodeResult.formatted_address
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('[GEOCODE] Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
