import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

// ---- Secrets pulled from Cloud → Secrets ----
const VISION_KEY = Deno.env.get("GOOGLE_VISION_API_KEY") || "";
const COMICVINE_KEY = Deno.env.get("COMICVINE_API_KEY") || "";
// Optional: const EBAY_APP_ID = Deno.env.get("EBAY_APP_ID");

// Quick sanity check so we fail loudly if secrets aren’t wired
function assertSecrets() {
  const missing = [];
  if (!VISION_KEY) missing.push("GOOGLE_VISION_API_KEY");
  if (!COMICVINE_KEY) missing.push("COMICVINE_API_KEY");
  if (missing.length) {
    return new Response(JSON.stringify({ ok: false, error: "Missing secrets", missing }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
  return null;
}

type ScanRequest = { imageBase64: string };

serve(async (req) => {
  try {
    if (req.method !== "POST") {
      return new Response(JSON.stringify({ error: "Use POST" }), {
        status: 405,
        headers: { "Content-Type": "application/json" },
      });
    }

    // TEMP: prove the function is invoked from the UI
    // Comment out this return once you see invocations > 0
    // return new Response(JSON.stringify({ ok: true, reached: "edge-function" }), {
    //   status: 200, headers: { "Content-Type": "application/json" }
    // });

    const secretError = assertSecrets();
    if (secretError) return secretError;

    const { imageBase64 } = (await req.json()) as ScanRequest;
    if (!imageBase64 || typeof imageBase64 !== "string") {
      return new Response(JSON.stringify({ error: "imageBase64 required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

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
    const vJson = await vRes.json();

    const rawText =
      vJson?.responses?.[0]?.fullTextAnnotation?.text || vJson?.responses?.[0]?.textAnnotations?.[0]?.description || "";

    if (!rawText) {
      return new Response(JSON.stringify({ ok: false, error: "No text detected by Vision" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    // 2) ComicVine search (very simple)
    const q = encodeURIComponent(rawText.replace(/\s+/g, " ").trim());
    const cvUrl = `https://comicvine.gamespot.com/api/search/?api_key=${COMICVINE_KEY}&resources=issue,volume&query=${q}&format=json`;

    const cvRes = await fetch(cvUrl, { headers: { Accept: "application/json" } });
    const cvJson = await cvRes.json();

    return new Response(
      JSON.stringify({
        ok: true,
        ocrPreview: rawText.slice(0, 120),
        comicvineResults: cvJson?.results ?? [],
      }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: String(e) }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
