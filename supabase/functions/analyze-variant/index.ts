import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface VariantAnalysis {
  printNumber: string | null;
  variantName: string | null;
  rarityScore: number; // 1-100
  detectionReasons: string[];
  isReprint: boolean;
  coverType: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get auth header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Verify user
    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check Elite subscription
    const { data: profile } = await supabase
      .from('profiles')
      .select('subscription_tier, subscription_expires_at')
      .eq('user_id', user.id)
      .single();

    const isElite = profile?.subscription_tier === 'elite' && 
      (!profile.subscription_expires_at || new Date(profile.subscription_expires_at) > new Date());

    const { imageUrl, title, issueNumber } = await req.json();

    if (!imageUrl) {
      return new Response(JSON.stringify({ error: 'Image URL required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Basic analysis for free users
    if (!isElite) {
      console.log('[VARIANT-ANALYZE] Basic analysis for free user:', user.id);
      return new Response(JSON.stringify({
        success: true,
        isElite: false,
        basicAnalysis: {
          isVariant: false,
          coverType: 'Standard',
          message: 'Upgrade to Elite for detailed variant analysis'
        }
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!lovableApiKey) {
      console.error('[VARIANT-ANALYZE] LOVABLE_API_KEY not configured');
      return new Response(JSON.stringify({ error: 'AI service not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('[VARIANT-ANALYZE] Elite variant analysis for:', title, issueNumber);

    // Call Lovable AI for variant analysis
    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${lovableApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'system',
            content: `You are an expert comic book variant and print edition identifier. Analyze the provided comic cover image and identify:

1. Print number (1st, 2nd, 3rd printing, etc.) - look for print indicators, price box differences, logo changes
2. Variant name if applicable (Variant cover, Newsstand, Direct, etc.)
3. Rarity score (1-100 based on how rare/valuable this version is)
4. Detection reasons - what visual cues you used to identify the variant/print

Look for these indicators:
- Price box changes between printings
- Logo color/design differences
- UPC barcode differences (newsstand vs direct)
- Cover art variations
- Interior preview differences
- Bar code placement
- Special edition markers

Respond with JSON only:
{
  "printNumber": "1st" | "2nd" | "3rd" | null,
  "variantName": string | null,
  "rarityScore": number (1-100),
  "detectionReasons": string[],
  "isReprint": boolean,
  "coverType": "Direct" | "Newsstand" | "Variant" | "Standard" | "Incentive" | "Convention Exclusive"
}`
          },
          {
            role: 'user',
            content: [
              { 
                type: 'text', 
                text: `Analyze this comic cover for variant/print edition details. Title: ${title || 'Unknown'}, Issue: ${issueNumber || 'Unknown'}` 
              },
              { type: 'image_url', image_url: { url: imageUrl } }
            ]
          }
        ],
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('[VARIANT-ANALYZE] AI gateway error:', aiResponse.status, errorText);
      
      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ error: 'Rate limit exceeded, please try again later' }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      
      return new Response(JSON.stringify({ error: 'AI analysis failed' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const aiData = await aiResponse.json();
    const content = aiData.choices?.[0]?.message?.content;

    if (!content) {
      console.error('[VARIANT-ANALYZE] No content in AI response');
      return new Response(JSON.stringify({ error: 'AI analysis returned no content' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Parse AI response
    let analysis: VariantAnalysis;
    try {
      const cleanContent = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      analysis = JSON.parse(cleanContent);
    } catch (parseError) {
      console.error('[VARIANT-ANALYZE] Failed to parse AI response:', content);
      return new Response(JSON.stringify({ error: 'Failed to parse variant analysis' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('[VARIANT-ANALYZE] Analysis complete:', analysis.printNumber, analysis.variantName, 'Rarity:', analysis.rarityScore);

    return new Response(JSON.stringify({ 
      success: true,
      isElite: true,
      analysis 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[VARIANT-ANALYZE] Error:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
