import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Secrets from Cloud → Secrets
const VISION_KEY = Deno.env.get("GOOGLE_VISION_API_KEY") || "";
const COMICVINE_KEY = Deno.env.get("COMICVINE_API_KEY") || "";

// Check for missing secrets
function assertSecrets() {
  const missing = [];
  if (!VISION_KEY) missing.push("GOOGLE_VISION_API_KEY");
  if (!COMICVINE_KEY) missing.push("COMICVINE_API_KEY");
  if (missing.length) {
    return new Response(
      JSON.stringify({ ok: false, error: "Missing secrets", missing }), 
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
  return null;
}

// Clean OCR text for search query
function cleanText(text: string): string {
  return text
    .replace(/[^\w\s]/g, ' ') // Remove punctuation
    .replace(/\s+/g, ' ')      // Collapse spaces
    .trim();
}

type ScanRequest = { imageBase64: string };

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (req.method !== "POST") {
      return new Response(
        JSON.stringify({ ok: false, error: "Method not allowed" }), 
        {
          status: 405,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const secretError = assertSecrets();
    if (secretError) return secretError;

    const { imageBase64 } = (await req.json()) as ScanRequest;
    
    if (!imageBase64 || typeof imageBase64 !== "string") {
      return new Response(
        JSON.stringify({ ok: false, error: "Invalid request: imageBase64 string required" }), 
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    console.log("Processing scan request...");

    // 1) OCR via Google Vision
    const visionUrl = `https://vision.googleapis.com/v1/images:annotate?key=${VISION_KEY}`;
    const visionBody = {
      requests: [
        {
          image: { content: imageBase64 },
          features: [{ type: "TEXT_DETECTION" }],
        },
      ],
    };

    const vRes = await fetch(visionUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(visionBody),
    });

    if (!vRes.ok) {
      throw new Error(`Google Vision API error: ${vRes.status} ${vRes.statusText}`);
    }

    const vJson = await vRes.json();
    const rawText = vJson?.responses?.[0]?.fullTextAnnotation?.text || "";

    if (!rawText) {
      console.log("No text detected in image");
      return new Response(
        JSON.stringify({ 
          ok: false, 
          error: "No text detected. Try a straight-on, well-lit cover photo." 
        }), 
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    console.log(`OCR extracted: ${rawText.substring(0, 100)}...`);

    // 2) Clean and search ComicVine
    const cleanedQuery = cleanText(rawText);
    const encodedQuery = encodeURIComponent(cleanedQuery);
    const cvUrl = `https://comicvine.gamespot.com/api/search/?api_key=${COMICVINE_KEY}&format=json&query=${encodedQuery}&resources=issue&limit=10`;

    const cvRes = await fetch(cvUrl, { 
      headers: { "Accept": "application/json" } 
    });

    if (!cvRes.ok) {
      throw new Error(`ComicVine API error: ${cvRes.status} ${cvRes.statusText}`);
    }

    const cvJson = await cvRes.json();
    const results = (cvJson?.results || []).map((item: any) => ({
      name: item.name || item.volume?.name || "Unknown",
      issue_number: item.issue_number,
      volume: item.volume ? { name: item.volume.name } : null,
      cover_date: item.cover_date,
      image: item.image?.small_url,
    }));

    console.log(`Found ${results.length} ComicVine results`);

    return new Response(
      JSON.stringify({
        ok: true,
        ocrPreview: rawText.substring(0, 120) + (rawText.length > 120 ? "..." : ""),
        comicvineResults: results,
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );

  } catch (error) {
    console.error("Scan error:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    return new Response(
      JSON.stringify({ 
        ok: false, 
        error: `Scan failed: ${errorMessage}` 
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
