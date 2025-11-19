import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const COMICVINE_API_KEY = Deno.env.get('COMICVINE_API_KEY');
const COMICVINE_BASE_URL = 'https://comicvine.gamespot.com/api';

interface IssueDetails {
  id: number;
  name: string | null;
  issue_number: string;
  cover_date: string | null;
  image: {
    original_url: string;
    medium_url: string;
    thumb_url: string;
  } | null;
  volume: {
    id: number;
    name: string;
  };
  publisher: {
    name: string;
  } | null;
  person_credits: Array<{
    name: string;
    role: string;
  }>;
  description: string | null;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { issue_id, volume_id, issue_number } = await req.json();

    if (!COMICVINE_API_KEY) {
      throw new Error('ComicVine API key not configured');
    }

    let finalIssueId = issue_id;

    // If we only have volume_id + issue_number, search for the issue first
    if (!finalIssueId && volume_id && issue_number) {
      console.log(`Searching for issue: volume ${volume_id}, issue #${issue_number}`);
      
      const searchUrl = `${COMICVINE_BASE_URL}/issues/?api_key=${COMICVINE_API_KEY}&format=json&filter=volume:${volume_id},issue_number:${issue_number}&field_list=id,name,issue_number,cover_date,image,volume,description`;
      
      const searchResponse = await fetch(searchUrl, {
        headers: { 'User-Agent': 'GrailSeek/1.0' }
      });

      if (!searchResponse.ok) {
        throw new Error(`ComicVine search failed: ${searchResponse.status}`);
      }

      const searchData = await searchResponse.json();
      
      if (searchData.results && searchData.results.length > 0) {
        finalIssueId = searchData.results[0].id;
        console.log(`Found issue ID: ${finalIssueId}`);
      } else {
        return new Response(
          JSON.stringify({ 
            error: 'Issue not found',
            details: `No issue found for volume ${volume_id} #${issue_number}` 
          }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    if (!finalIssueId) {
      return new Response(
        JSON.stringify({ error: 'Must provide either issue_id or both volume_id and issue_number' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch the issue details
    console.log(`Fetching issue details for ID: ${finalIssueId}`);
    const issueUrl = `${COMICVINE_BASE_URL}/issue/4000-${finalIssueId}/?api_key=${COMICVINE_API_KEY}&format=json&field_list=id,name,issue_number,cover_date,image,volume,publisher,person_credits,description`;
    
    const issueResponse = await fetch(issueUrl, {
      headers: { 'User-Agent': 'GrailSeek/1.0' }
    });

    if (!issueResponse.ok) {
      throw new Error(`ComicVine API failed: ${issueResponse.status}`);
    }

    const issueData = await issueResponse.json();

    if (issueData.error !== 'OK' || !issueData.results) {
      throw new Error('Invalid response from ComicVine API');
    }

    const issue = issueData.results as IssueDetails;

    // Extract writer and artist from person_credits
    const writers = issue.person_credits
      ?.filter(credit => credit.role?.toLowerCase().includes('writer'))
      .map(c => c.name)
      .slice(0, 3)
      .join(', ') || null;

    const artists = issue.person_credits
      ?.filter(credit => credit.role?.toLowerCase().includes('artist') || credit.role?.toLowerCase().includes('penciler'))
      .map(c => c.name)
      .slice(0, 3)
      .join(', ') || null;

    // Return formatted issue details
    return new Response(
      JSON.stringify({
        id: issue.id,
        title: issue.name,
        issue_number: issue.issue_number,
        cover_date: issue.cover_date,
        cover_url: issue.image?.original_url || issue.image?.medium_url,
        cover_thumb: issue.image?.thumb_url,
        volume_id: issue.volume.id,
        volume_name: issue.volume.name,
        publisher: issue.publisher?.name,
        writer: writers,
        artist: artists,
        description: issue.description,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error fetching ComicVine issue:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
