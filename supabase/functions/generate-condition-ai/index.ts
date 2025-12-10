import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ConditionAssessment {
  gradeRangeLow: number;
  gradeRangeHigh: number;
  conditionNotes: string;
  spineCondition: string;
  cornerCondition: string;
  surfaceCondition: string;
  glossCondition: string;
  pressingPotential: 'low' | 'medium' | 'high';
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

    if (!isElite) {
      return new Response(JSON.stringify({ 
        error: 'Elite subscription required',
        code: 'NOT_ELITE'
      }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { imageUrl, inventoryItemId } = await req.json();

    if (!imageUrl) {
      return new Response(JSON.stringify({ error: 'Image URL required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!lovableApiKey) {
      console.error('[CONDITION-AI] LOVABLE_API_KEY not configured');
      return new Response(JSON.stringify({ error: 'AI service not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('[CONDITION-AI] Analyzing comic condition for user:', user.id);

    // Call Lovable AI for condition assessment
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
            content: `You are an expert comic book grader with decades of experience. Analyze the provided comic book cover image and provide a detailed condition assessment. Be accurate and conservative in your estimates.

You must respond with a JSON object containing:
- gradeRangeLow: number (CGC scale 0.5-10.0, the lower bound of your estimate)
- gradeRangeHigh: number (CGC scale 0.5-10.0, the upper bound of your estimate)
- conditionNotes: string (brief overall condition summary)
- spineCondition: string (describe spine ticks, stress, breaks)
- cornerCondition: string (describe corner blunting, creases, wear)
- surfaceCondition: string (describe surface scuffs, scratches, soiling)
- glossCondition: string (describe gloss/sheen level)
- pressingPotential: "low" | "medium" | "high" (would pressing improve the grade?)

Only return valid JSON, no markdown or extra text.`
          },
          {
            role: 'user',
            content: [
              { type: 'text', text: 'Please analyze this comic book cover and provide a detailed condition assessment.' },
              { type: 'image_url', image_url: { url: imageUrl } }
            ]
          }
        ],
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('[CONDITION-AI] AI gateway error:', aiResponse.status, errorText);
      
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
      console.error('[CONDITION-AI] No content in AI response');
      return new Response(JSON.stringify({ error: 'AI analysis returned no content' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Parse AI response
    let assessment: ConditionAssessment;
    try {
      // Clean up potential markdown wrapping
      const cleanContent = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      assessment = JSON.parse(cleanContent);
    } catch (parseError) {
      console.error('[CONDITION-AI] Failed to parse AI response:', content);
      return new Response(JSON.stringify({ error: 'Failed to parse AI assessment' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Store assessment if inventory item provided
    if (inventoryItemId) {
      await supabase.from('ai_condition_assessments').insert({
        user_id: user.id,
        inventory_item_id: inventoryItemId,
        image_url: imageUrl,
        grade_range_low: assessment.gradeRangeLow,
        grade_range_high: assessment.gradeRangeHigh,
        condition_notes: assessment.conditionNotes,
        spine_condition: assessment.spineCondition,
        corner_condition: assessment.cornerCondition,
        surface_condition: assessment.surfaceCondition,
        gloss_condition: assessment.glossCondition,
        pressing_potential: assessment.pressingPotential,
      });
    }

    console.log('[CONDITION-AI] Assessment complete:', assessment.gradeRangeLow, '-', assessment.gradeRangeHigh);

    return new Response(JSON.stringify({ 
      success: true,
      assessment 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[CONDITION-AI] Error:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
