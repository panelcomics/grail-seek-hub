import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// SECURITY: Simple in-memory rate limiting (10 requests per minute per IP)
// For production, consider using Redis or Upstash for distributed rate limiting
const rateLimiter = new Map<string, number[]>();

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const requests = rateLimiter.get(ip) || [];
  const recentRequests = requests.filter(t => now - t < 60000); // Last minute
  
  if (recentRequests.length >= 10) {
    return false; // Rate limit exceeded
  }
  
  recentRequests.push(now);
  rateLimiter.set(ip, recentRequests);
  
  // Cleanup old entries periodically
  if (Math.random() < 0.01) {
    for (const [key, times] of rateLimiter.entries()) {
      const recent = times.filter(t => now - t < 60000);
      if (recent.length === 0) {
        rateLimiter.delete(key);
      } else {
        rateLimiter.set(key, recent);
      }
    }
  }
  
  return true;
}

// ============= HELPER: Get Comic Details by ID =============
async function getComicById(comicvineId: string, apiKey: string) {
  const response = await fetch(
    `https://comicvine.gamespot.com/api/issue/4000-${comicvineId}/?api_key=${apiKey}&format=json`,
    {
      headers: { 'User-Agent': 'GrailSeeker/1.0' }
    }
  );

  if (!response.ok) {
    throw new Error('ComicVine API error');
  }

  const data = await response.json();
  const result = data.results;
  
  if (!result) {
    return null;
  }

  return {
    series: result.volume?.name || 'Unknown Series',
    issue: result.issue_number || '?',
    year: result.cover_date ? result.cover_date.split('-')[0] : '?',
    publisher: result.volume?.publisher?.name || 'Unknown',
    creators: result.person_credits?.slice(0, 3).map((p: any) => p.name) || [],
    coverUrl: result.image?.medium_url || result.image?.small_url || '/placeholder.svg',
    altCandidates: []
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

  // SECURITY: Rate limiting to prevent API abuse
  const clientIP = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown';
  if (!checkRateLimit(clientIP)) {
    console.warn('Rate limit exceeded for IP:', clientIP);
    return new Response(
      JSON.stringify({ error: 'Too many requests. Please try again later.' }),
      { 
        status: 429, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }

  try {
    const { comicvineId } = await req.json();
    
    if (!comicvineId) {
      return new Response(
        JSON.stringify({ error: 'comicvineId is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const COMICVINE_API_KEY = Deno.env.get('COMICVINE_API_KEY');
    
    if (!COMICVINE_API_KEY) {
      throw new Error('COMICVINE_API_KEY not configured');
    }

    console.log('Fetching comic details for ID:', comicvineId);

    // Fetch comic details by ID
    const comicvineResult = await getComicById(comicvineId, COMICVINE_API_KEY);
    
    if (!comicvineResult) {
      return new Response(
        JSON.stringify({ 
          error: "Comic not found."
        }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get price estimate (stub for now)
    const pricing = getPriceEstimate();

    // Construct response
    const result = {
      vision: {
        rawText: '',
        titleGuess: comicvineResult.series,
        issueGuess: comicvineResult.issue,
        yearGuess: comicvineResult.year
      },
      comicvine: comicvineResult,
      pricing
    };

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    // SECURITY: Log full details server-side only
    console.error('Error in choose-candidate function:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      timestamp: new Date().toISOString()
    });
    
    // Return generic error message to client
    return new Response(
      JSON.stringify({ 
        error: 'Unable to fetch comic details. Please try again later.'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
