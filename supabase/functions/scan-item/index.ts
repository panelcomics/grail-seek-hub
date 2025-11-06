// supabase/functions/scan-item/index.ts
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  console.log('Function invoked:', req.method, req.url);
  
  // Handle OPTIONS for CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    if (req.method !== "POST") {
      console.log('Method not POST');
      return new Response(JSON.stringify({ ok: false, error: "Method not allowed" }), {
        status: 405,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    console.log('Body received:', { hasImage: !!body.imageBase64, length: body.imageBase64?.length });
    const { imageBase64 } = body;
    if (!imageBase64 || typeof imageBase64 !== "string") {
      console.log('Invalid imageBase64');
      return new Response(JSON.stringify({ ok: false, error: "Missing or invalid imageBase64" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const GOOGLE_VISION_API_KEY = Deno.env.get("GOOGLE_VISION_API_KEY");
    const COMICVINE_API_KEY = Deno.env.get("COMICVINE_API_KEY");
    console.log('Keys check:', { vision: !!GOOGLE_VISION_API_KEY, comicvine: !!COMICVINE_API_KEY });

    if (!GOOGLE_VISION_API_KEY || !COMICVINE_API_KEY) {
      console.log('Missing secrets');
      return new Response(JSON.stringify({ ok: false, error: "Missing API secrets – check Cloud → Secrets" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ---------- Google Vision OCR ----------
    console.log('Calling Google Vision...');
    const visionRes = await fetch(
      `https://vision.googleapis.com/v1/images:annotate?key=${GOOGLE_VISION_API_KEY}`,
      {
        method: "POST",
        body: JSON.stringify({
          requests: [{
            image: { content: imageBase64 },
            features: [{ type: "TEXT_DETECTION" }],
          }],
        }),
        headers: { "Content-Type": "application/json" },
      },
    );

    console.log('Vision response status:', visionRes.status);
    const visionData = await visionRes.json();
    if (!visionRes.ok || visionData.error) {
      console.error('Vision error:', visionData.error);
      throw new Error(visionData.error?.message ?? "Vision API failed");
    }

    const ocrText = visionData.responses?.[0]?.fullTextAnnotation?.text ?? "";
    console.log('OCR text preview:', ocrText.substring(0, 50));
    const cleaned = ocrText.replace(/[^\w\s]/g, "").replace(/\s+/g, " ").trim();

    // ---------- ComicVine Search ----------
    console.log('Calling ComicVine with query:', cleaned);
    const cvRes = await fetch(
      `https://comicvine.gamespot.com/api/search/?api_key=${COMICVINE_API_KEY}&format=json&query=${encodeURIComponent(cleaned)}&resources=issue&limit=10`,
      {
        headers: {
          "User-Agent": "GrailSeeker/1.0 (panelcomics.com)",
        },
      }
    );

    console.log('ComicVine response status:', cvRes.status);
    const cvData = await cvRes.json();
    console.log('ComicVine data:', JSON.stringify(cvData).substring(0, 200));
    
    // ComicVine uses status_code: 1 for success (not error field)
    if (!cvRes.ok || cvData.status_code !== 1) {
      console.error('ComicVine failed:', { status_code: cvData.status_code, error: cvData.error });
      throw new Error(cvData.error ?? "ComicVine API failed");
    }

    const results = (cvData.results ?? []).map((i: any) => ({
      id: i.id ?? null,
      name: i.name ?? "Unknown",
      issue_number: i.issue_number ?? "",
      volume: i.volume?.name ?? "Unknown",
      cover_date: i.cover_date ?? "",
      image: i.image?.small_url ?? i.image?.thumb_url ?? null,
    }));

    console.log('Success – results count:', results.length);
    return new Response(
      JSON.stringify({
        ok: true,
        ocrPreview: ocrText.slice(0, 120) + (ocrText.length > 120 ? "..." : ""),
        comicvineResults: results,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error('Function error:', err);
    return new Response(
      JSON.stringify({ ok: false, error: err instanceof Error ? err.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
