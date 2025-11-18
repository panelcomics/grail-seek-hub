import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { password } = await req.json();

    // Validate input type and presence
    if (!password || typeof password !== 'string') {
      return new Response(
        JSON.stringify({ valid: false, message: "Password is required" }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // Prevent DoS attacks with extremely long passwords
    if (password.length > 128) {
      return new Response(
        JSON.stringify({ valid: false, message: "Password too long (max 128 characters)" }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // Check length >= 8
    if (password.length < 8) {
      return new Response(
        JSON.stringify({ 
          valid: false, 
          message: "Password must be at least 8 characters long",
          strength: 'weak'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check for digit OR symbol
    const hasDigit = /\d/.test(password);
    const hasSymbol = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password);

    if (!hasDigit && !hasSymbol) {
      return new Response(
        JSON.stringify({ 
          valid: false, 
          message: "Add a number or symbol (e.g., SpaceCowboy1!)",
          strength: 'medium'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Calculate strength
    let strength = 'medium';
    if (password.length >= 12 && hasDigit && hasSymbol) {
      strength = 'strong';
    } else if (password.length >= 10 && (hasDigit || hasSymbol)) {
      strength = 'strong';
    }

    return new Response(
      JSON.stringify({ 
        valid: true, 
        message: "Password is strong",
        strength
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error validating password:', error);
    return new Response(
      JSON.stringify({ valid: false, message: "Internal server error" }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
