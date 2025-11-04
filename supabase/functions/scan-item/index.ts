import "https://deno.land/x/xhr@0.1.0/mod.ts";
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
    const { imageBase64 } = await req.json();
    
    if (!imageBase64) {
      return new Response(
        JSON.stringify({ error: 'Image is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    console.log('Scanning item with AI...');

    // Use GPT-5-mini for vision analysis - best balance of speed and accuracy
    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'openai/gpt-5-mini',
        messages: [
          {
            role: 'system',
            content: `You are an expert comic book and trading card grader with decades of experience. 
            Analyze the image and provide accurate identification, grading, and market value estimation.
            Be precise with titles, issue numbers, and conditions.
            IMPORTANT: Use category "comic" for comics and "card" for trading cards.`
          },
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: `Analyze this comic or trading card image and provide:
                1. Exact title and issue number (e.g., "Supergirl #159")
                2. Category: ONLY use "comic" or "card" (no other values allowed)
                3. Grade using industry standard (NM+, NM, VF+, etc.)
                4. Condition details (any visible defects, centering, corners)
                5. Estimated market value in USD (be realistic based on current market)
                6. 3-5 comparable recent sales with prices
                
                Return ONLY valid JSON with this structure:
                {
                  "title": "exact title with issue number",
                  "category": "comic OR card (exactly these words only)",
                  "grade": "grade like NM+, NM, VF+",
                  "condition": "detailed condition description",
                  "estimatedValue": 195.00,
                  "comparableSales": [
                    {"source": "eBay", "price": 185.00, "date": "2024-01", "condition": "NM"},
                    {"source": "TCGPlayer", "price": 205.00, "date": "2024-02", "condition": "NM+"}
                  ]
                }`
              },
              {
                type: 'image_url',
                image_url: {
                  url: imageBase64
                }
              }
            ]
          }
        ],
        max_completion_tokens: 1000
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI gateway error:', response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: 'AI credits depleted. Please add credits to continue.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices[0]?.message?.content;
    
    if (!content) {
      throw new Error('No content in AI response');
    }

    console.log('AI Response:', content);

    // Parse the JSON response from AI
    let scanResult;
    try {
      // Try to extract JSON if wrapped in markdown
      const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/) || 
                       content.match(/\{[\s\S]*\}/);
      const jsonStr = jsonMatch ? (jsonMatch[1] || jsonMatch[0]) : content;
      scanResult = JSON.parse(jsonStr);
    } catch (e) {
      console.error('Failed to parse AI response:', e);
      throw new Error('Failed to parse AI analysis results');
    }

    return new Response(
      JSON.stringify(scanResult),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in scan-item function:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to scan item';
    const errorDetails = error instanceof Error ? error.toString() : String(error);
    
    return new Response(
      JSON.stringify({ 
        error: errorMessage,
        details: errorDetails
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
