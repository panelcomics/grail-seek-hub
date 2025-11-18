import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * Sync ComicVine volumes and issues to local cache
 * 
 * Strategy: Sync all volumes, then sync issues for "hot" volumes on demand
 * This is idempotent - safe to re-run
 * 
 * Trigger: POST /sync-comicvine-cache with { secret: "...", volumeIds?: number[] }
 */
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('[SYNC] Starting ComicVine cache sync...');
    
    // Check admin access
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.error('[SYNC] Missing authorization header');
      return new Response(JSON.stringify({ error: 'Missing authorization' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );

    console.log('[SYNC] Verifying user authentication...');
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      console.error('[SYNC] Authentication failed:', userError?.message);
      return new Response(JSON.stringify({ error: 'Unauthorized', details: userError?.message }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('[SYNC] Checking admin role for user:', user.id);
    // Check if user has admin role
    const { data: hasRole, error: roleError } = await supabaseClient.rpc('has_role', {
      _user_id: user.id,
      _role: 'admin'
    });

    if (roleError) {
      console.error('[SYNC] Role check failed:', roleError.message);
      return new Response(JSON.stringify({ error: 'Role check failed', details: roleError.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!hasRole) {
      console.error('[SYNC] User does not have admin role');
      return new Response(JSON.stringify({ error: 'Admin access required' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('[SYNC] Admin access verified');

    // Parse request body with better error handling
    let requestBody: { volumeIds?: number[], limit?: number, offset?: number } = {};
    try {
      const bodyText = await req.text();
      console.log('[SYNC] Request body:', bodyText);
      if (bodyText) {
        requestBody = JSON.parse(bodyText);
      }
    } catch (error) {
      console.error('[SYNC] Failed to parse request body:', error);
      // Default to small sync if body parsing fails
      requestBody = { limit: 50, offset: 0 };
    }

    const { volumeIds, limit = 50, offset = 0 } = requestBody;
    console.log('[SYNC] Sync parameters:', { volumeIds, limit, offset });

    const comicvineKey = Deno.env.get('COMICVINE_API_KEY');
    if (!comicvineKey) {
      console.error('[SYNC] COMICVINE_API_KEY not found in environment');
      throw new Error('COMICVINE_API_KEY not configured');
    }
    
    console.log('[SYNC] ComicVine API key found, starting sync with limit:', limit);

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    let volumesProcessed = 0;
    let volumesAdded = 0;
    let volumesUpdated = 0;
    let issuesSynced = 0;

    // If specific volumeIds provided, sync those volumes + their issues
    if (volumeIds && volumeIds.length > 0) {
      console.log('[SYNC] Syncing specific volume IDs:', volumeIds);
      for (const volumeId of volumeIds) {
        const volResult = await syncVolume(volumeId, comicvineKey, supabase);
        if (volResult.success) {
          volumesProcessed++;
          if (volResult.isNew) volumesAdded++;
          else volumesUpdated++;
        }
        
        const issuesResult = await syncVolumeIssues(volumeId, comicvineKey, supabase);
        issuesSynced += issuesResult.count;
      }
    } else {
      // Sync top volumes with pagination
      console.log(`[SYNC] Fetching top volumes from ComicVine API (limit: ${limit}, offset: ${offset})...`);
      const response = await fetch(
        `https://comicvine.gamespot.com/api/volumes/?api_key=${comicvineKey}&format=json&limit=${limit}&offset=${offset}&sort=count_of_issues:desc`,
        { headers: { 'User-Agent': 'GrailSeeker Scanner' } }
      );
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('[SYNC] ComicVine API error:', response.status, errorText);
        throw new Error(`ComicVine API error: ${response.status} - ${errorText}`);
      }
      
      const data = await response.json();
      console.log('[SYNC] Received', data.results?.length || 0, 'volumes from ComicVine');
      
      if (data.results) {
        for (const vol of data.results) {
          volumesProcessed++;
          console.log(`[SYNC] Processing volume ${volumesProcessed}/${data.results.length}: ${vol.name} (${vol.id})`);
          
          const volResult = await syncVolume(vol.id, comicvineKey, supabase, vol);
          if (volResult.success) {
            if (volResult.isNew) volumesAdded++;
            else volumesUpdated++;
            
            // Sync issues for each volume (with rate limiting)
            const issuesResult = await syncVolumeIssues(vol.id, comicvineKey, supabase);
            issuesSynced += issuesResult.count;
            console.log(`[SYNC] Synced ${issuesResult.count} issues for volume ${vol.id} (${volResult.isNew ? 'NEW' : 'UPDATED'})`);
          } else {
            console.error(`[SYNC] Failed to sync volume ${vol.id}`);
          }
        }
      }
    }

    console.log('[SYNC] Sync complete:', { volumesProcessed, volumesAdded, volumesUpdated, issuesSynced });

    const result = {
      success: true,
      volumesProcessed,
      volumesAdded,
      volumesUpdated,
      issuesSynced,
      offset: offset + volumesProcessed,
      message: `Successfully processed ${volumesProcessed} volumes (${volumesAdded} new, ${volumesUpdated} updated) and synced ${issuesSynced} issues`
    };
    
    console.log('[SYNC] Returning response:', result);

    return new Response(
      JSON.stringify(result),
      { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  } catch (error) {
    console.error('[SYNC] Fatal error:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error',
        details: error instanceof Error ? error.stack : String(error)
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function syncVolume(volumeId: number, apiKey: string, supabase: any, volumeData?: any) {
  try {
    let volume = volumeData;
    
    if (!volume) {
      const response = await fetch(
        `https://comicvine.gamespot.com/api/volume/4050-${volumeId}/?api_key=${apiKey}&format=json`,
        { headers: { 'User-Agent': 'GrailSeeker Scanner' } }
      );
      const data = await response.json();
      volume = data.results;
    }

    if (!volume) return { success: false, isNew: false };

    // Check if volume already exists
    const { data: existing } = await supabase
      .from('comicvine_volumes')
      .select('id')
      .eq('id', volume.id)
      .single();

    const isNew = !existing;

    const slug = volume.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');

    const { error } = await supabase
      .from('comicvine_volumes')
      .upsert({
        id: volume.id,
        name: volume.name,
        slug,
        publisher: volume.publisher?.name || null,
        start_year: volume.start_year || null,
        issue_count: volume.count_of_issues || 0,
        deck: volume.deck || null,
        image_url: volume.image?.medium_url || null,
        last_synced_at: new Date().toISOString(),
      });

    return { success: !error, isNew };
  } catch (error) {
    console.error(`Failed to sync volume ${volumeId}:`, error);
    return { success: false, isNew: false };
  }
}

async function syncVolumeIssues(volumeId: number, apiKey: string, supabase: any) {
  try {
    let offset = 0;
    const limit = 100;
    let totalSynced = 0;
    let hasMore = true;

    while (hasMore) {
      const response = await fetch(
        `https://comicvine.gamespot.com/api/issues/?api_key=${apiKey}&format=json&filter=volume:${volumeId}&limit=${limit}&offset=${offset}&sort=issue_number:asc`,
        { headers: { 'User-Agent': 'GrailSeeker Scanner' } }
      );
      
      const data = await response.json();
      
      if (!data.results || data.results.length === 0) {
        hasMore = false;
        break;
      }

      const issues = data.results.map((issue: any) => {
        // Extract key notes from description
        let keyNotes = null;
        if (issue.description) {
          const desc = issue.description.replace(/<[^>]*>/g, '');
          const keyPhrases = [
            '1st appearance', 'first appearance', 'origin of', 'death of',
            'cameo', 'full appearance', 'last appearance', 'key issue'
          ];
          const matches = keyPhrases.filter(phrase => 
            desc.toLowerCase().includes(phrase)
          );
          if (matches.length > 0) {
            keyNotes = desc.substring(0, 300);
          }
        }

        // Extract writer and artist
        const writers = issue.person_credits
          ?.filter((p: any) => p.role?.toLowerCase().includes('writer'))
          .map((p: any) => p.name)
          .join(', ') || null;
        
        const artists = issue.person_credits
          ?.filter((p: any) => 
            p.role?.toLowerCase().includes('artist') || 
            p.role?.toLowerCase().includes('penciler')
          )
          .map((p: any) => p.name)
          .join(', ') || null;

        return {
          id: issue.id,
          volume_id: volumeId,
          issue_number: issue.issue_number || null,
          name: issue.name || null,
          cover_date: issue.cover_date || null,
          image_url: issue.image?.medium_url || null,
          writer: writers,
          artist: artists,
          key_notes: keyNotes,
          last_synced_at: new Date().toISOString(),
        };
      });

      const { error } = await supabase
        .from('comicvine_issues')
        .upsert(issues);

      if (error) {
        console.error(`Error syncing issues for volume ${volumeId}:`, error);
      }

      totalSynced += issues.length;
      offset += limit;
      
      if (data.results.length < limit) {
        hasMore = false;
      }

      // Rate limiting - ComicVine allows 1 request per second
      await new Promise(resolve => setTimeout(resolve, 1100));
    }

    return { count: totalSynced };
  } catch (error) {
    console.error(`Failed to sync issues for volume ${volumeId}:`, error);
    return { count: 0 };
  }
}
