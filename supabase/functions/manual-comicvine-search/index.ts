// supabase/functions/manual-comicvine-search/index.ts
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-client-info, apikey',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function parseManualInput(input: string): { title: string; issue: string | null } {
  const trimmed = input.trim();
  
  // Try to match patterns like "Amazing Spider-Man #129", "Amazing Spider-Man 129", "Spawn 1"
  const patterns = [
    /^(.+?)\s*#\s*(\d+)$/,      // "Title #123"
    /^(.+?)\s+[Nn]o\.?\s*(\d+)$/,  // "Title No. 123" or "Title no 123"
    /^(.+?)\s+(\d+)$/,          // "Title 123"
  ];
  
  for (const pattern of patterns) {
    const match = trimmed.match(pattern);
    if (match) {
      return {
        title: match[1].trim(),
        issue: match[2]
      };
    }
  }
  
  // No issue number found, treat entire input as title
  return {
    title: trimmed,
    issue: null
  };
}

async function queryComicVineVolumes(apiKey: string, title: string, publisher?: string): Promise<any[]> {
  let query = title;
  if (publisher) {
    query = `${title} ${publisher}`;
  }
  
  const url = `https://comicvine.gamespot.com/api/search/?api_key=${apiKey}&format=json&resources=volume&query=${encodeURIComponent(query)}&field_list=id,name,publisher,start_year&limit=20`;
  
  console.log('[MANUAL-SEARCH] 🔍 ComicVine Volume Query:', url);
  
  const response = await fetch(url, {
    headers: { "User-Agent": "GrailSeeker/1.0 (panelcomics.com)" }
  });
  
  if (!response.ok) {
    throw new Error(`ComicVine volume query failed: ${response.status}`);
  }
  
  const data = await response.json();
  return data.results || [];
}

async function queryComicVineIssue(apiKey: string, volumeId: number, issueNumber: string): Promise<any[]> {
  const url = `https://comicvine.gamespot.com/api/issues/?api_key=${apiKey}&format=json&filter=volume:${volumeId},issue_number:${issueNumber}&field_list=id,name,issue_number,volume,cover_date,image&limit=10`;
  
  console.log('[MANUAL-SEARCH] 🔍 ComicVine Issue Query:', url);
  
  const response = await fetch(url, {
    headers: { "User-Agent": "GrailSeeker/1.0 (panelcomics.com)" }
  });
  
  if (!response.ok) {
    throw new Error(`ComicVine issue query failed: ${response.status}`);
  }
  
  const data = await response.json();
  return data.results || [];
}

serve(async (req) => {
  console.log('[MANUAL-SEARCH] Function invoked');
  
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (req.method !== "POST") {
      return new Response(JSON.stringify({ ok: false, error: "Method not allowed" }), {
        status: 405,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const { searchText, publisher } = body;

    if (!searchText || typeof searchText !== 'string') {
      return new Response(JSON.stringify({ 
        ok: false, 
        error: "searchText is required" 
      }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const COMICVINE_API_KEY = Deno.env.get("COMICVINE_API_KEY");
    
    if (!COMICVINE_API_KEY) {
      console.error('[MANUAL-SEARCH] Missing COMICVINE_API_KEY');
      return new Response(JSON.stringify({ 
        ok: false, 
        error: "Service configuration error" 
      }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Parse the user's input
    const parsed = parseManualInput(searchText);
    console.log('[MANUAL-SEARCH] Parsed input:', parsed);

    const results: any[] = [];

    // Query ComicVine for volumes matching the title
    const volumes = await queryComicVineVolumes(COMICVINE_API_KEY, parsed.title, publisher);
    console.log('[MANUAL-SEARCH] Found volumes:', volumes.length);

    // If user specified an issue number, search for that specific issue
    if (parsed.issue) {
      for (const volume of volumes.slice(0, 10)) {
        const issues = await queryComicVineIssue(COMICVINE_API_KEY, volume.id, parsed.issue);
        
        for (const issue of issues) {
          const volumePub = volume.publisher?.name || publisher || "";
          const volumeName = issue.volume?.name || volume.name;
          
          // Calculate score based on match quality
          let score = 0.70; // Base score
          const scoreBreakdown = { title: 0, publisher: 0, issue: 0 };
          
          // Title match
          const titleWords = parsed.title.toLowerCase().split(/\s+/).filter((w: string) => w.length > 2);
          const volumeNameLower = volumeName.toLowerCase();
          const titleMatchCount = titleWords.filter((w: string) => volumeNameLower.includes(w)).length;
          const titleMatchRatio = titleWords.length > 0 ? titleMatchCount / titleWords.length : 0;
          scoreBreakdown.title = titleMatchRatio * 0.40;
          
          // Publisher match
          if (publisher && volumePub.toLowerCase().includes(publisher.toLowerCase())) {
            scoreBreakdown.publisher = 0.30;
          }
          
          // Issue number match (exact)
          if (issue.issue_number === parsed.issue) {
            scoreBreakdown.issue = 0.30;
          }
          
          score = scoreBreakdown.title + scoreBreakdown.publisher + scoreBreakdown.issue;
          
          // Bonus: if all three match well
          if (scoreBreakdown.title >= 0.30 && scoreBreakdown.publisher > 0 && scoreBreakdown.issue > 0) {
            score = Math.min(0.98, score + 0.10);
          }
          
          results.push({
            id: issue.id,
            resource: 'issue',
            title: volumeName,
            issue: issue.issue_number,
            year: issue.cover_date ? parseInt(issue.cover_date.slice(0, 4)) : null,
            publisher: volumePub,
            volumeName: volume.name,
            volumeId: volume.id,
            thumbUrl: issue.image?.small_url || "",
            coverUrl: issue.image?.original_url || "",
            score: score,
            scoreBreakdown,
            source: 'comicvine' as const,
            isReprint: false
          });
        }
      }
    } else {
      // No issue number specified, return volume results
      for (const volume of volumes.slice(0, 15)) {
        const volumePub = volume.publisher?.name || publisher || "";
        
        // Calculate score for volume match
        let score = 0.70;
        const scoreBreakdown = { title: 0, publisher: 0, issue: 0 };
        
        const titleWords = parsed.title.toLowerCase().split(/\s+/).filter((w: string) => w.length > 2);
        const volumeNameLower = volume.name.toLowerCase();
        const titleMatchCount = titleWords.filter((w: string) => volumeNameLower.includes(w)).length;
        const titleMatchRatio = titleWords.length > 0 ? titleMatchCount / titleWords.length : 0;
        scoreBreakdown.title = titleMatchRatio * 0.70; // Higher weight when no issue
        
        if (publisher && volumePub.toLowerCase().includes(publisher.toLowerCase())) {
          scoreBreakdown.publisher = 0.30;
        }
        
        score = scoreBreakdown.title + scoreBreakdown.publisher;
        
        results.push({
          id: volume.id,
          resource: 'volume',
          title: volume.name,
          issue: null,
          year: volume.start_year,
          publisher: volumePub,
          volumeName: volume.name,
          volumeId: volume.id,
          thumbUrl: "",
          coverUrl: "",
          score: score,
          scoreBreakdown,
          source: 'comicvine' as const,
          isReprint: false
        });
      }
    }

    // Sort by score descending
    results.sort((a, b) => b.score - a.score);

    console.log('[MANUAL-SEARCH] Returning', results.length, 'results');
    console.log('[MANUAL-SEARCH] Top result:', results[0] ? `${results[0].title} ${results[0].issue ? '#' + results[0].issue : ''} (${results[0].score.toFixed(2)})` : 'none');

    return new Response(JSON.stringify({
      ok: true,
      results: results.slice(0, 20), // Limit to top 20
      query: searchText,
      parsed
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error('[MANUAL-SEARCH] Error:', error);
    return new Response(JSON.stringify({
      ok: false,
      error: error.message || "Internal server error"
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
