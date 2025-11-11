// Test function to verify scan-item OCR processing logic
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-client-info, apikey',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { ocrText } = await req.json();
    
    if (!ocrText) {
      return new Response(
        JSON.stringify({ ok: false, error: "No ocrText provided" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const COMICVINE_API_KEY = Deno.env.get("COMICVINE_API_KEY");
    if (!COMICVINE_API_KEY) {
      return new Response(
        JSON.stringify({ ok: false, error: "Missing ComicVine API key" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Apply the same cleaning logic as scan-item
    let cleanText = ocrText
      .replace(/\d{1,2}:\d{2}/g, "") // remove timestamps
      .replace(/[^a-zA-Z0-9#:\-\s]/g, "") // keep title words, numbers, and #
      .trim();
    
    // If sanitization empties the text, fall back to original OCR
    if (cleanText.length < 5) cleanText = ocrText.trim();

    // Extract issue number
    const issueMatch = cleanText.match(/#?\s*(\d+)/) || cleanText.match(/No\.?\s*(\d+)/i);
    const issue_number = issueMatch ? issueMatch[1] : "";
    
    // Extract year
    const yearMatch = cleanText.match(/\b(19\d{2}|20\d{2})\b/);
    const year = yearMatch ? parseInt(yearMatch[1]) : null;
    
    // Extract series title
    let series_title = cleanText
      .replace(/#?\s*\d+/g, '')
      .replace(/\b(19\d{2}|20\d{2})\b/g, '')
      .replace(/[^\w\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    
    // Build query
    const queryParts = [];
    if (series_title) queryParts.push(series_title);
    if (issue_number) queryParts.push(`#${issue_number}`);
    const cleanQuery = queryParts.join(' ');

    console.log('Test OCR Processing:', {
      original: ocrText,
      cleanText,
      series_title,
      issue_number,
      year,
      cleanQuery
    });

    // Query ComicVine
    const cvRes = await fetch(
      `https://comicvine.gamespot.com/api/search/?api_key=${COMICVINE_API_KEY}&format=json&query=${encodeURIComponent(cleanQuery)}&resources=issue&limit=5`,
      {
        headers: {
          "User-Agent": "GrailSeeker/1.0 (panelcomics.com)",
        },
      }
    );

    const cvData = await cvRes.json();
    
    if (!cvRes.ok || cvData.status_code !== 1) {
      return new Response(
        JSON.stringify({
          ok: false,
          error: "ComicVine API failed",
          cleanText,
          cleanQuery,
          extracted: { series_title, issue_number, year }
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const results = (cvData.results ?? [])
      .filter((i: any) => i.volume?.name && i.id)
      .map((i: any) => ({
        id: i.id,
        name: i.name || i.volume.name,
        issue_number: i.issue_number ?? "",
        volume: i.volume.name,
        cover_date: i.cover_date ?? "",
      }));

    return new Response(
      JSON.stringify({
        ok: true,
        original: ocrText,
        cleanText,
        cleanQuery,
        extracted: { series_title, issue_number, year },
        resultsCount: results.length,
        topResult: results[0] || null,
        allResults: results
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (err) {
    console.error('Test error:', err);
    const errorMessage = err instanceof Error ? err.message : "Unknown error";
    return new Response(
      JSON.stringify({ ok: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
