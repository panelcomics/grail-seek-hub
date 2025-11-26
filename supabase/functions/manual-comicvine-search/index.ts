// supabase/functions/manual-comicvine-search/index.ts
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-client-info, apikey',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function cleanSearchText(input: string): string {
  return input
    .trim()
    .replace(/#/g, '') // Remove #
    .replace(/[\u2010-\u2015]/g, '-') // Normalize Unicode dashes to ASCII
    .replace(/[.,;:!?]+$/g, '') // Remove trailing punctuation
    .replace(/\s+/g, ' ') // Convert multiple spaces to single space
    .trim();
}

function parseManualInput(input: string): { title: string; issue: string | null } {
  const cleaned = cleanSearchText(input);
  
  // Try to match patterns like "Amazing Spider-Man 129", "Title No. 123"
  const patterns = [
    /^(.+?)\s+[Nn]o\.?\s*(\d+)$/,  // "Title No. 123" or "Title no 123"
    /^(.+?)\s+(\d+)$/,              // "Title 123"
  ];
  
  for (const pattern of patterns) {
    const match = cleaned.match(pattern);
    if (match) {
      return {
        title: match[1].trim(),
        issue: match[2]
      };
    }
  }
  
  // No issue number found, treat entire input as title
  return {
    title: cleaned,
    issue: null
  };
}

function generateQueryVariants(searchText: string, publisher?: string): Array<{ query: string; type: string }> {
  const cleaned = cleanSearchText(searchText);
  const parsed = parseManualInput(searchText);
  
  const variants: Array<{ query: string; type: string }> = [];
  
  // A. Full query (cleaned)
  variants.push({ query: cleaned, type: 'full' });
  
  // B. Parsed query (series + issue)
  if (parsed.issue) {
    const parsedQuery = `${parsed.title} ${parsed.issue}`;
    if (parsedQuery !== cleaned) {
      variants.push({ query: parsedQuery, type: 'parsed' });
    }
  }
  
  // C. Series only
  if (parsed.title !== cleaned) {
    variants.push({ query: parsed.title, type: 'series' });
  }
  
  // D. Fuzzy query (keywords only - remove numbers and special chars)
  const fuzzyQuery = cleaned
    .replace(/\d+/g, '') // Remove all numbers
    .replace(/[^\w\s]/g, '') // Remove special chars except spaces
    .replace(/\s+/g, ' ')
    .trim();
  
  if (fuzzyQuery && fuzzyQuery !== cleaned && fuzzyQuery !== parsed.title) {
    variants.push({ query: fuzzyQuery, type: 'fuzzy' });
  }
  
  // Add publisher variants if provided
  if (publisher) {
    const withPublisher = variants.map(v => ({
      query: `${v.query} ${publisher}`,
      type: `${v.type}+publisher`
    }));
    variants.push(...withPublisher);
  }
  
  return variants;
}

async function queryComicVineVolumes(apiKey: string, query: string, offset = 0, limit = 20): Promise<{ results: any[]; totalResults: number }> {
  const url = `https://comicvine.gamespot.com/api/search/?api_key=${apiKey}&format=json&resources=volume&query=${encodeURIComponent(query)}&field_list=id,name,publisher,start_year&limit=${limit}&offset=${offset}`;
  
  const isDebug = Deno.env.get("VITE_SCANNER_DEBUG") === 'true';
  if (isDebug) {
    console.log('[MANUAL-SEARCH] 🔍 ComicVine Volume Query:', query, `(offset: ${offset}, limit: ${limit})`);
  }
  
  const response = await fetch(url, {
    headers: { "User-Agent": "GrailSeeker/1.0 (panelcomics.com)" }
  });
  
  if (!response.ok) {
    throw new Error(`ComicVine volume query failed: ${response.status}`);
  }
  
  const data = await response.json();
  
  // Defensive: ensure data structure is valid
  if (!data || typeof data !== 'object') {
    throw new Error('ComicVine returned invalid data structure');
  }
  
  return {
    results: Array.isArray(data.results) ? data.results : [],
    totalResults: typeof data.number_of_total_results === 'number' ? data.number_of_total_results : 0
  };
}

async function queryComicVineIssue(apiKey: string, volumeId: number, issueNumber: string): Promise<any[]> {
  const url = `https://comicvine.gamespot.com/api/issues/?api_key=${apiKey}&format=json&filter=volume:${volumeId},issue_number:${issueNumber}&field_list=id,name,issue_number,volume,cover_date,image,person_credits&limit=10`;
  
  const isDebug = Deno.env.get("VITE_SCANNER_DEBUG") === 'true';
  if (isDebug) {
    console.log('[MANUAL-SEARCH] 🔍 ComicVine Issue Query for volume', volumeId, 'issue', issueNumber);
  }
  
  const response = await fetch(url, {
    headers: { "User-Agent": "GrailSeeker/1.0 (panelcomics.com)" }
  });
  
  if (!response.ok) {
    throw new Error(`ComicVine issue query failed: ${response.status}`);
  }
  
  const data = await response.json();
  
  // Defensive: ensure data structure is valid
  if (!data || typeof data !== 'object') {
    throw new Error('ComicVine returned invalid data structure');
  }
  
  return Array.isArray(data.results) ? data.results : [];
}

function extractCreatorCredits(personCredits: any[]): { writer: string | null; artist: string | null } {
  let writer: string | null = null;
  let artist: string | null = null;
  
  if (!personCredits || !Array.isArray(personCredits)) {
    return { writer, artist };
  }
  
  // Find primary writer
  const writerCredit = personCredits.find((credit: any) => 
    credit.role?.toLowerCase().includes('writer') || 
    credit.role?.toLowerCase().includes('script')
  );
  if (writerCredit) {
    writer = writerCredit.name;
  }
  
  // Find primary artist (prefer penciler/interior artist over cover artist)
  const artistCredit = personCredits.find((credit: any) => {
    const role = credit.role?.toLowerCase() || '';
    return role.includes('penciler') || role.includes('pencils') || 
           role.includes('artist') && !role.includes('cover');
  }) || personCredits.find((credit: any) => 
    credit.role?.toLowerCase().includes('cover')
  );
  
  if (artistCredit) {
    artist = artistCredit.name;
  }
  
  return { writer, artist };
}

serve(async (req) => {
  const isDebug = Deno.env.get("VITE_SCANNER_DEBUG") === 'true';
  
  if (isDebug) {
    console.log('[MANUAL-SEARCH] Function invoked');
  }
  
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
    const { 
      searchText, 
      publisher, 
      offset = 0, 
      limit = 20,
      // Multi-strategy matching inputs
      comicvine_volume_id,
      comicvine_issue_id,
      issueNumber,
      year
    } = body;

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

    // ============================================================
    // STRATEGY 1: Direct ID lookup (highest priority)
    // ============================================================
    if (comicvine_issue_id && comicvine_volume_id) {
      if (isDebug) {
        console.log('[MANUAL-SEARCH] Strategy: Direct ID lookup');
      }
      try {
        const issueUrl = `https://comicvine.gamespot.com/api/issue/4000-${comicvine_issue_id}/?api_key=${COMICVINE_API_KEY}&format=json&field_list=id,name,issue_number,volume,cover_date,image,person_credits,description`;
        
        const response = await fetch(issueUrl, {
          headers: { "User-Agent": "GrailSeeker/1.0 (panelcomics.com)" }
        });
        
        if (response.ok) {
          const data = await response.json();
          if (data.results) {
            const issue = data.results;
            const credits = extractCreatorCredits(issue.person_credits);
            
            const result = {
              id: issue.id,
              resource: 'issue' as const,
              title: issue.volume?.name || issue.name,
              issue: issue.issue_number,
              year: issue.cover_date ? parseInt(issue.cover_date.slice(0, 4)) : null,
              publisher: issue.volume?.publisher?.name || null,
              volumeName: issue.volume?.name,
              volumeId: comicvine_volume_id,
              thumbUrl: issue.image?.small_url || "",
              coverUrl: issue.image?.original_url || "",
              writer: credits.writer,
              artist: credits.artist,
              score: 1.0, // Perfect match via ID
              scoreBreakdown: { title: 0, publisher: 0, issue: 0 },
              source: 'comicvine' as const,
              isReprint: false
            };
            
            console.log('[MANUAL-SEARCH] Direct ID match found');
            return new Response(JSON.stringify({
              ok: true,
              results: [result],
              totalResults: 1,
              offset: 0,
              limit: 1,
              hasMore: false,
              query: `ID:${comicvine_issue_id}`,
              parsed: null
            }), {
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
          }
        }
      } catch (error) {
        console.error('[MANUAL-SEARCH] Direct ID lookup failed:', error);
        // Fall through to other strategies
      }
    }

    // ============================================================
    // STRATEGY 2: Structured search (title + issue + year)
    // ============================================================
    if (!searchText || typeof searchText !== 'string') {
      return new Response(JSON.stringify({ 
        ok: false, 
        error: "searchText is required for non-ID search" 
      }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Parse the user's input
    const parsed = parseManualInput(searchText);
    console.log('[MANUAL-SEARCH] Parsed input:', parsed);

    // Use explicit issue number if provided, otherwise use parsed
    const finalIssueNumber = issueNumber || parsed.issue;
    const finalYear = year;

    if (isDebug) {
      console.log('[MANUAL-SEARCH] Strategy: Structured search', {
        title: parsed.title,
        issue: finalIssueNumber,
        year: finalYear,
        publisher
      });
    }

    // Generate multiple query variants
    const queryVariants = generateQueryVariants(searchText, publisher);
    console.log('[MANUAL-SEARCH] Query variants:', queryVariants);

    const results: any[] = [];
    let successfulQuery: string | null = null;
    let totalResults = 0;

    // Try each query variant until we get results
    for (const variant of queryVariants) {
      console.log('[MANUAL-SEARCH] Trying query variant:', variant.type, '->', variant.query);
      
      try {
        const { results: volumes, totalResults: total } = await queryComicVineVolumes(COMICVINE_API_KEY, variant.query, offset, limit);
        totalResults = total;
        
        if (volumes.length > 0) {
          console.log('[MANUAL-SEARCH] Found', volumes.length, 'volumes with query type:', variant.type, '(total available:', totalResults, ')');
          successfulQuery = variant.query;
          
          // If user specified an issue number, search for that specific issue
          if (finalIssueNumber) {
            for (const volume of volumes.slice(0, 10)) {
              const issues = await queryComicVineIssue(COMICVINE_API_KEY, volume.id, finalIssueNumber);
              
              for (const issue of issues) {
                const volumePub = volume.publisher?.name || publisher || "";
                const volumeName = issue.volume?.name || volume.name;
                const credits = extractCreatorCredits(issue.person_credits);
                
                // Calculate score based on match quality
                let score = 0.70; // Base score
                const scoreBreakdown = { title: 0, publisher: 0, issue: 0, year: 0 };
                
                // Title match (40%)
                const titleWords = parsed.title.toLowerCase().split(/\s+/).filter((w: string) => w.length > 2);
                const volumeNameLower = volumeName.toLowerCase();
                const titleMatchCount = titleWords.filter((w: string) => volumeNameLower.includes(w)).length;
                const titleMatchRatio = titleWords.length > 0 ? titleMatchCount / titleWords.length : 0;
                scoreBreakdown.title = titleMatchRatio * 0.40;
                
                // Publisher match (25%)
                if (publisher && volumePub.toLowerCase().includes(publisher.toLowerCase())) {
                  scoreBreakdown.publisher = 0.25;
                }
                
                // Issue number match (25%)
                if (issue.issue_number === finalIssueNumber) {
                  scoreBreakdown.issue = 0.25;
                }
                
                // Year match (10%)
                if (finalYear && issue.cover_date) {
                  const issueYear = parseInt(issue.cover_date.slice(0, 4));
                  const yearDiff = Math.abs(finalYear - issueYear);
                  if (yearDiff === 0) {
                    scoreBreakdown.year = 0.10;
                  } else if (yearDiff <= 2) {
                    scoreBreakdown.year = 0.05;
                  }
                }
                
                score = scoreBreakdown.title + scoreBreakdown.publisher + scoreBreakdown.issue + scoreBreakdown.year;
                
                // Bonus: if all signals match well
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
                  writer: credits.writer,
                  artist: credits.artist,
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
          
          // Stop at first successful query
          break;
        }
      } catch (error) {
        console.error('[MANUAL-SEARCH] Error with query variant:', variant.type, error);
        // Continue to next variant
      }
    }

    // Sort by score descending
    results.sort((a, b) => b.score - a.score);

    if (isDebug) {
      console.log('[MANUAL-SEARCH] Returning', results.length, 'results');
      if (results.length > 0) {
        console.log('[MANUAL-SEARCH] Top result:', results[0] ? `${results[0].title} ${results[0].issue ? '#' + results[0].issue : ''} (${results[0].score.toFixed(2)})` : 'none');
        console.log('[MANUAL-SEARCH] Successful query:', successfulQuery);
      }
    }

    return new Response(JSON.stringify({
      ok: true,
      results,
      totalResults,
      offset,
      limit,
      hasMore: offset + results.length < totalResults,
      query: searchText,
      parsed,
      strategy: comicvine_issue_id ? 'id_lookup' : 'structured_search'
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error('[MANUAL-SEARCH] Error:', error);
    
    // Always return safe HTTP 200 with empty results - never crash
    let body = {};
    try {
      body = await req.json();
    } catch {
      // Ignore body parse errors
    }
    
    return new Response(JSON.stringify({
      ok: true, // Always true to indicate successful HTTP response
      results: [],
      totalResults: 0,
      offset: 0,
      limit: 20,
      hasMore: false,
      query: (body as any).searchText || '',
      parsed: null,
      error: error.message || "ComicVine search temporarily unavailable"
    }), {
      status: 200, // Always 200 - client handles ok:true + empty results
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
