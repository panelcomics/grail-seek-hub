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
 * Geocodes a US postal code using Nominatim (OpenStreetMap)
 * Free, no API key required, specifically supports ZIP code lookups
 */
async function geocodeUSPostalCode(postal_code: string, state?: string): Promise<GeocodeResponse | null> {
  try {
    // Normalize state to uppercase if provided
    const normalizedState = state?.toUpperCase().trim();
    
    console.log('[GEOCODE] Input:', { postal_code, state: normalizedState });
    
    // Try with state first if provided
    if (normalizedState) {
      const stateUrl = `https://nominatim.openstreetmap.org/search?postalcode=${encodeURIComponent(postal_code)}&state=${encodeURIComponent(normalizedState)}&country=US&format=json&limit=1`;
      console.log('[GEOCODE] Querying with state:', stateUrl);
      
      const stateResponse = await fetch(stateUrl, {
        headers: {
          'User-Agent': 'GrailSeeker-Marketplace/1.0'
        }
      });
      
      if (stateResponse.ok) {
        const stateData = await stateResponse.json();
        if (stateData && stateData.length > 0) {
          const match = stateData[0];
          const lat = parseFloat(match.lat);
          const lng = parseFloat(match.lon);
          
          console.log('[GEOCODE] Success with state:', {
            lat,
            lng,
            display_name: match.display_name
          });
          
          return {
            lat,
            lng,
            formatted_address: match.display_name
          };
        }
      }
      
      console.log('[GEOCODE] No match with state, falling back to ZIP-only');
    }
    
    // Fallback: Try ZIP-only
    const zipUrl = `https://nominatim.openstreetmap.org/search?postalcode=${encodeURIComponent(postal_code)}&country=US&format=json&limit=1`;
    console.log('[GEOCODE] Querying ZIP-only:', zipUrl);
    
    const response = await fetch(zipUrl, {
      headers: {
        'User-Agent': 'GrailSeeker-Marketplace/1.0'
      }
    });
    
    if (!response.ok) {
      console.error('[GEOCODE] Nominatim API error:', response.status, response.statusText);
      return null;
    }

    const data = await response.json();
    console.log('[GEOCODE] ZIP-only response:', JSON.stringify(data, null, 2));
    
    if (data && data.length > 0) {
      const match = data[0];
      const lat = parseFloat(match.lat);
      const lng = parseFloat(match.lon);
      
      console.log('[GEOCODE] Success with ZIP-only:', {
        lat,
        lng,
        display_name: match.display_name
      });
      
      return {
        lat,
        lng,
        formatted_address: match.display_name
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

    // Currently only support US geocoding
    if (country.toUpperCase() === 'US' || country.toUpperCase() === 'UNITED STATES') {
      // Normalize state to uppercase
      const normalizedState = state?.toUpperCase().trim() || undefined;
      geocodeResult = await geocodeUSPostalCode(postal_code, normalizedState);
    } else {
      console.warn('[GEOCODE] Country not supported yet:', country);
      // Still update profile with location fields even if we can't geocode
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          city: city || null,
          state: state?.toUpperCase().trim() || null,
          country: country.toUpperCase(),
          postal_code: postal_code
        })
        .eq('user_id', user.id);
        
      if (updateError) {
        console.error('[GEOCODE] Error updating profile:', updateError);
        return new Response(
          JSON.stringify({ error: 'Failed to update profile' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      return new Response(
        JSON.stringify({ 
          success: true,
          geocoded: false,
          message: 'Location saved without coordinates (country not supported)'
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Update user's profile - always save location fields even if geocoding failed
    const updateData: any = {
      city: city || null,
      state: state?.toUpperCase().trim() || null,
      country: country.toUpperCase(),
      postal_code: postal_code
    };
    
    if (geocodeResult) {
      updateData.lat = geocodeResult.lat;
      updateData.lng = geocodeResult.lng;
    }
    
    const { error: updateError } = await supabase
      .from('profiles')
      .update(updateData)
      .eq('user_id', user.id);

    if (updateError) {
      console.error('[GEOCODE] Error updating profile:', updateError);
      return new Response(
        JSON.stringify({ error: 'Failed to update profile with location data' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[GEOCODE] Profile updated successfully for user:', user.id, { geocoded: !!geocodeResult });

    // Return success even if geocoding failed - non-blocking
    return new Response(
      JSON.stringify({ 
        success: true,
        geocoded: !!geocodeResult,
        lat: geocodeResult?.lat,
        lng: geocodeResult?.lng,
        formatted_address: geocodeResult?.formatted_address,
        message: geocodeResult 
          ? 'Location saved with coordinates'
          : 'Location saved without coordinates (geocoding failed)'
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
