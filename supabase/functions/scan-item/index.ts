// supabase/functions/scan-item/index.ts
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

serve(async (req) => {
  try {
    if (req.method !== "POST") {
      return new Response(JSON.stringify({ ok: false, error: "Method not allowed" }), {
        status: 405,
        headers: { "Content-Type": "application/json" },
      });
    }

    const { imageBase64 } = await req.json();
    if (!imageBase64 || typeof imageBase64 !== "string") {
      return new Response(JSON.stringify({ ok: false, error: "Missing or invalid imageBase64" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const GOOGLE_VISION_API_KEY = Deno.env.get("GOOGLE_VISION_API_KEY");
    const COMICVINE_API_KEY = Deno.env.get("COMICVINE_API_KEY");

    if (!GOOGLE_VISION_API_KEY || !COMICVINE_API_KEY) {
      return new Response(JSON.stringify({ ok: false, error: "Missing secrets" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }

    // ---------- Google Vision OCR ----------
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

    const visionData = await visionRes.json();
    if (!visionRes.ok || visionData.error) {
      throw new Error(visionData.error?.message ?? "Vision API failed");
    }

    const ocrText = visionData.responses?.[0]?.fullTextAnnotation?.text ?? "";
    const cleaned = ocrText.replace(/[^\w\s]/g, "").replace(/\s+/g, " ").trim();

    // ---------- ComicVine Search ----------
    const cvRes = await fetch(
      `https://comicvine.gamespot.com/api/search/?api_key=${COMICVINE_API_KEY}&format=json&query=${encodeURIComponent(cleaned)}&resources=issue&limit=10`,
    );

    const cvData = await cvRes.json();
    if (!cvRes.ok || cvData.error) {
      throw new Error(cvData.error ?? "ComicVine API failed");
    }

    const results = (cvData.results ?? []).map((i: any) => ({
      name: i.name ?? "Unknown",
      issue_number: i.issue_number ?? "",
      volume: i.volume?.name ?? "Unknown",
      year: i.cover_date?.split("-")[0] ?? "",
    }));

    return new Response(
      JSON.stringify({
        ok: true,
        ocrPreview: ocrText.slice(0, 120) + (ocrText.length > 120 ? "..." : ""),
        comicvineResults: results,
      }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error(err);
    return new Response(
      JSON.stringify({ ok: false, error: err instanceof Error ? err.message : "Unknown error" }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }
});
