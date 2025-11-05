import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ============= HELPER: Google Cloud Vision =============
async function extractTextFromImage(imageBase64: string, apiKey: string) {
  let base64Content = imageBase64;
  if (imageBase64.includes(',')) {
    base64Content = imageBase64.split(',')[1];
  }

  const response = await fetch(
    `https://vision.googleapis.com/v1/images:annotate?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        requests: [{
          image: { content: base64Content },
          features: [
            { type: 'TEXT_DETECTION' },
            { type: 'LABEL_DETECTION' }
          ]
        }]
      })
    }
  );

  if (!response.ok) {
    throw new Error('Google Vision API error');
  }

  const data = await response.json();
  const textAnnotations = data.responses[0]?.textAnnotations || [];
  const rawText = textAnnotations[0]?.description || '';
  
  return rawText;
}

// ============= HELPER: Parse Comic Details =============
function parseComicDetails(text: string) {
  const lines = text.split('\n').map((l: string) => l.trim()).filter(Boolean);
  let titleGuess = '';
  let issueGuess = '';
  let yearGuess = '';
  
  // Look for issue numbers (e.g., #159, No. 159, Issue 159)
  const issuePattern = /#?\s*(\d+)|No\.\s*(\d+)|Issue\s*(\d+)/i;
  for (const line of lines) {
    const match = line.match(issuePattern);
    if (match) {
      issueGuess = match[1] || match[2] || match[3];
      const titleMatch = line.replace(issuePattern, '').trim();
      if (titleMatch.length > 2) {
        titleGuess = titleMatch;
      }
    }
  }

  // If no title found, use first significant line
  if (!titleGuess && lines.length > 0) {
    titleGuess = lines[0];
  }

  // Look for year (4 digits)
  const yearPattern = /\b(19\d{2}|20\d{2})\b/;
  for (const line of lines) {
    const match = line.match(yearPattern);
    if (match) {
      yearGuess = match[1];
      break;
    }
  }

  return { titleGuess, issueGuess, yearGuess };
}

// ============= HELPER: ComicVine API =============
async function queryComicVine(title: string, issue: string, apiKey: string) {
  const searchQuery = encodeURIComponent(title + (issue ? ` ${issue}` : ''));
  const response = await fetch(
    `https://comicvine.gamespot.com/api/search/?api_key=${apiKey}&format=json&query=${searchQuery}&resources=issue&limit=5`,
    {
      headers: { 'User-Agent': 'GrailSeeker/1.0' }
    }
  );

  if (!response.ok) {
    throw new Error('ComicVine API error');
  }

  const data = await response.json();
  const results = data.results || [];
  
  if (results.length === 0) {
    return null;
  }

  const topResult = results[0];
  const altCandidates = results.slice(1, 4).map((r: any) => ({
    id: r.id,
    label: `${r.volume?.name || 'Unknown'} #${r.issue_number || '?'} (${r.cover_date ? r.cover_date.split('-')[0] : '?'})`
  }));

  return {
    series: topResult.volume?.name || 'Unknown Series',
    issue: topResult.issue_number || '?',
    year: topResult.cover_date ? topResult.cover_date.split('-')[0] : '?',
    publisher: topResult.volume?.publisher?.name || 'Unknown',
    creators: topResult.person_credits?.slice(0, 3).map((p: any) => p.name) || [],
    coverUrl: topResult.image?.medium_url || topResult.image?.small_url || '/placeholder.svg',
    altCandidates
  };
}

// ============= HELPER: Price Estimator (STUB) =============
function getPriceEstimate() {
  return {
    estimate: null,
    status: 'pending',
    message: 'Market value estimates coming soon.'
  };
}

// ============= MAIN HANDLER =============
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

    const GOOGLE_VISION_API_KEY = Deno.env.get('GOOGLE_VISION_API_KEY');
    const COMICVINE_API_KEY = Deno.env.get('COMICVINE_API_KEY');
    
    if (!GOOGLE_VISION_API_KEY || !COMICVINE_API_KEY) {
      throw new Error('API keys not configured');
    }

    console.log('Starting comic scan...');

    // Step 1: Extract text using Google Vision
    const rawText = await extractTextFromImage(imageBase64, GOOGLE_VISION_API_KEY);
    
    if (!rawText || rawText.trim().length === 0) {
      return new Response(
        JSON.stringify({ 
          error: "Couldn't read the cover text. Try a clearer photo or different angle."
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Extracted text:', rawText);

    // Step 2: Parse comic details
    const { titleGuess, issueGuess, yearGuess } = parseComicDetails(rawText);
    console.log('Parsed:', { titleGuess, issueGuess, yearGuess });

    // Step 3: Query ComicVine
    const comicvineResult = await queryComicVine(titleGuess, issueGuess, COMICVINE_API_KEY);
    
    if (!comicvineResult) {
      return new Response(
        JSON.stringify({ 
          error: "No matching comics found. Try adjusting the image or search manually."
        }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Step 4: Get price estimate (stub for now)
    const pricing = getPriceEstimate();

    // Construct final response
    const scanResult = {
      vision: {
        rawText,
        titleGuess,
        issueGuess,
        yearGuess
      },
      comicvine: comicvineResult,
      pricing
    };

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
