// /functions/scan-item/index.ts
// Deno / Supabase Edge Function
// Expects: { imageBase64: string }  (raw base64 of the uploaded image, no data: prefix)

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

// ---- Secrets pulled from Lovable/Cloud → Secrets ----
const VISION_KEY = "YOUR_GOOGLE_VISION_KEY";
const COMICVINE_KEY = "YOUR_COMICVINE_KEY";
// Optional: const EBAY_APP_ID = Deno.env.get("EBAY_APP_ID");

type ScanRequest = { imageBase64: string };

serve(async (req) => {
  try {
    if (req.method !== "POST") {
      return new Response(JSON.stringify({ error: "Use POST" }), {
        status: 405,
        headers: { "Content-Type": "application/json" },
      });
    }
    // 🔧 TEMP: prove the edge function is being reached from the UI
    return new Response(JSON.stringify({ ok: true, reached: "edge-function", note: "temp bypass" }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });

    const { imageBase64 } = (await req.json()) as ScanRequest;
    if (!imageBase64 || typeof imageBase64 !== "string") {
      return json({ error: "imageBase64 required" }, 400);
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
    if (!vRes.ok) {
      const t = await vRes.text();
      return json({ error: "Vision error", details: t }, 502);
    }
    const vJson = await vRes.json();
    const fullText = vJson?.responses?.[0]?.fullTextAnnotation?.text?.toString() ?? "";

    if (!fullText) {
      return json({
        ocrText: "",
        candidates: [],
        message: "No text detected; try a clearer, front-on cover photo.",
      });
    }

    // 2) Heuristic: pull a likely Title + Issue number from OCR text
    const normalized = fullText
      .replace(/\r/g, "")
      .split("\n")
      .map((s: string) => s.trim())
      .filter(Boolean);

    // Guess title from the first 3–5 meaningful lines
    const titleGuess = pickTitle(normalized);
    const issueGuess = pickIssueNumber(fullText);

    // 3) ComicVine search (issues first; fall back to volumes)
    const cvHeaders: Record<string, string> = {
      "User-Agent": "PanelComics-GrailSeeker/1.0 (panelcomics.com)",
      Accept: "application/json",
    };

    // Try issue search
    const q = encodeURIComponent(titleGuess || normalized.slice(0, 3).join(" "));
    const issueUrl =
      `https://comicvine.gamespot.com/api/search/?api_key=${COMICVINE_KEY}` +
      `&format=json&resources=issue&query=${q}&field_list=id,name,issue_number,cover_date,image,volume,publisher,description&limit=10`;

    const iRes = await fetch(issueUrl, { headers: cvHeaders });
    const iJson = await iRes.json();

    let candidates = Array.isArray(iJson?.results) ? iJson.results : [];

    // If we have an issue number guess, prefer matching ones
    if (issueGuess) {
      candidates = prioritizeIssueMatches(candidates, issueGuess);
    }

    // Fallback to volume search if issues look empty/useless
    if (!candidates?.length) {
      const volUrl =
        `https://comicvine.gamespot.com/api/search/?api_key=${COMICVINE_KEY}` +
        `&format=json&resources=volume&query=${q}&field_list=id,name,publisher,start_year,image&limit=10`;
      const vRes2 = await fetch(volUrl, { headers: cvHeaders });
      const vJson2 = await vRes2.json();
      candidates = Array.isArray(vJson2?.results) ? vJson2.results : [];
    }

    // 4) Shape clean result
    const result = {
      ocrText: fullText,
      guesses: {
        title: titleGuess,
        issue_number: issueGuess,
      },
      candidates: candidates.map((c: any) => ({
        id: c.id,
        type: c.volume ? "issue" : "volume",
        name: c.name,
        issue_number: c.issue_number ?? null,
        cover_date: c.cover_date ?? null,
        volume: c.volume ? { id: c.volume?.id, name: c.volume?.name } : undefined,
        publisher: c.publisher?.name ?? c.volume?.publisher?.name ?? c.publisher ?? null,
        image: c.image?.small_url ?? c.image?.thumb_url ?? null,
        description: c.description ?? null,
      })),
    };

    return json(result);
  } catch (err) {
    return json({ error: "Unhandled error", details: String(err) }, 500);
  }
});

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

// -------- helpers --------

function pickTitle(lines: string[]): string {
  // Remove obvious noise
  const noise = [
    "marvel",
    "dc",
    "image",
    "idw",
    "boom!",
    "comics",
    "variant",
    "exclusive",
    "direct edition",
    "limited series",
    "mature readers",
    "approved by the comics code authority",
  ];
  const clean = lines
    .filter((l) => l.length >= 2 && l.length <= 40)
    .map((l) => l.replace(/[^a-z0-9:'&\-\s]/gi, ""))
    .filter((l) => !noise.some((n) => l.toLowerCase().includes(n)));

  // Prefer ALL CAPS single-line titles, then Title Case lines
  const allCaps = clean.find((l) => /^[A-Z0-9 :'&-]{3,}$/.test(l));
  if (allCaps) return allCaps;

  const titleCase = clean.find((l) => /\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)+\b/.test(l));
  if (titleCase) return titleCase;

  // fallback to first meaningful line
  return clean[0] || lines[0] || "";
}

function pickIssueNumber(text: string): string | null {
  // Common patterns: "#12", "No. 12", "Issue 12", bare "12"
  const tagged = text.match(/(?:#|No\.?|Issue)\s*([0-9]{1,4}[A-Z]?)/i)?.[1] ?? null;
  if (tagged) return tagged;

  // plain number, but avoid years like 1999/2024 and prices like $3.99
  const candidates = [...text.matchAll(/\b([0-9]{1,3}[A-Z]?)\b/g)].map((m) => m[1]);
  const filtered = candidates.filter((n) => {
    const num = parseInt(n);
    return num > 0 && num <= 1000;
  });
  // choose the smallest non-trivial number (often the issue # on covers)
  if (filtered.length) {
    return filtered.sort((a, b) => parseInt(a) - parseInt(b))[0];
  }
  return null;
}

function prioritizeIssueMatches(cands: any[], issue: string) {
  const target = issue.toString().toLowerCase();
  return cands.slice().sort((a, b) => {
    const ai = (a.issue_number ?? "").toString().toLowerCase();
    const bi = (b.issue_number ?? "").toString().toLowerCase();
    const am = ai === target ? 0 : 1;
    const bm = bi === target ? 0 : 1;
    // exact match first, then newest cover date
    if (am !== bm) return am - bm;
    return (b.cover_date ?? "").localeCompare(a.cover_date ?? "");
  });
}
