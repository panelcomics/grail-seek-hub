import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const BATCH_SIZE = 50;
const MAX_BATCHES = 10; // Prevent infinite loops

/**
 * Sync ComicVine volumes and issues to local cache
 * Implements batched syncing to handle large datasets
 */
serve(async (req) => {
  console.log('[SYNC] Function invoked, method:', req.method);
  
  if (req.method === 'OPTIONS') {
    console.log('[SYNC] Handling OPTIONS request');
    return new Response(null, { headers: corsHeaders });
  }

  // Wrap everything in a timeout to ensure we always return a response
  const timeoutPromise = new Promise<Response>((resolve) => 
    setTimeout(() => {
      console.error('[SYNC] Function timeout - sync took too long');
      resolve(new Response(
        JSON.stringify({ 
          success: false,
          error: 'Function timeout',
          message: 'Sync took too long and was terminated to prevent hanging',
          timestamp: new Date().toISOString()
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      ));
    }, 55000)
  );

  try {
    const syncPromise = (async () => {
      console.log("ComicVine sync function started", { timestamp: new Date().toISOString() });
      
      try {
        // Check admin access
        const authHeader = req.headers.get('Authorization');
        console.log('[SYNC] Authorization header present:', !!authHeader);
        
        if (!authHeader) {
          console.error('[SYNC] Missing authorization header');
          return new Response(JSON.stringify({ 
            success: false,
            error: 'Missing authorization',
            timestamp: new Date().toISOString()
          }), {
            status: 200,
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
          return new Response(JSON.stringify({ 
            success: false,
            error: 'Unauthorized', 
            details: userError?.message,
            timestamp: new Date().toISOString()
          }), {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        console.log('[SYNC] Checking admin role for user:', user.id);
        const { data: hasRole, error: roleError } = await supabaseClient.rpc('has_role', {
          _user_id: user.id,
          _role: 'admin'
        });

        if (roleError) {
          console.error('[SYNC] Role check failed:', roleError.message);
          return new Response(JSON.stringify({ 
            success: false,
            error: 'Role check failed', 
            details: roleError.message,
            timestamp: new Date().toISOString()
          }), {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        if (!hasRole) {
          console.error('[SYNC] User does not have admin role');
          return new Response(JSON.stringify({ 
            success: false,
            error: 'Admin access required',
            timestamp: new Date().toISOString()
          }), {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        console.log('[SYNC] Admin access verified');

        // Get API key
        const comicvineKey = Deno.env.get('COMICVINE_API_KEY');
        console.log('[SYNC] ComicVine API key present:', !!comicvineKey);
        
        if (!comicvineKey) {
          console.error('[SYNC] COMICVINE_API_KEY not found in environment');
          return new Response(JSON.stringify({ 
            success: false,
            error: 'COMICVINE_API_KEY not configured',
            timestamp: new Date().toISOString()
          }), {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
        const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
        const supabase = createClient(supabaseUrl, supabaseKey);

        // Parse request body
        let startOffset = 0;
        try {
          const bodyText = await req.text();
          if (bodyText) {
            const requestBody = JSON.parse(bodyText);
            startOffset = requestBody.offset || 0;
          }
        } catch (error) {
          console.error('[SYNC] Failed to parse request body:', error);
        }

        console.log('[SYNC] Starting batched sync with BATCH_SIZE:', BATCH_SIZE, 'starting offset:', startOffset);

        let totalVolumesProcessed = 0;
        let totalVolumesAdded = 0;
        let totalVolumesUpdated = 0;
        let totalIssuesSynced = 0;
        let currentOffset = startOffset;
        let batchCount = 0;
        let hasMore = true;

        // Loop through batches
        while (hasMore && batchCount < MAX_BATCHES) {
          batchCount++;
          console.log(`[SYNC] Batch ${batchCount}: Fetching volumes from offset ${currentOffset}`);
          
          const response = await fetch(
            `https://comicvine.gamespot.com/api/volumes/?api_key=${comicvineKey}&format=json&limit=${BATCH_SIZE}&offset=${currentOffset}&sort=count_of_issues:desc`,
            { headers: { 'User-Agent': 'GrailSeeker Scanner' } }
          );
          
          console.log('[SYNC] ComicVine API response:', response.status);
          
          if (!response.ok) {
            const errorText = await response.text();
            console.error('[SYNC] ComicVine API error:', response.status, errorText);
            return new Response(JSON.stringify({ 
              success: false,
              error: `ComicVine API error: ${response.status}`,
              details: errorText,
              timestamp: new Date().toISOString()
            }), {
              status: 200,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
          }
          
          const data = await response.json();
          const volumes = data.results || [];
          console.log(`[SYNC] Batch ${batchCount}: Received ${volumes.length} volumes`);
          
          if (volumes.length === 0) {
            console.log('[SYNC] No more volumes to sync');
            hasMore = false;
            break;
          }

          // Process this batch
          for (let i = 0; i < volumes.length; i++) {
            const vol = volumes[i];
            console.log(`[SYNC] Processing volume ${i + 1}/${volumes.length}: ${vol.name} (ID: ${vol.id})`);
            
            const volResult = await syncVolume(vol.id, comicvineKey, supabase, vol);
            if (volResult.success) {
              totalVolumesProcessed++;
              if (volResult.isNew) {
                totalVolumesAdded++;
              } else {
                totalVolumesUpdated++;
              }
              
              // Sync issues for this volume
              const issuesResult = await syncVolumeIssues(vol.id, comicvineKey, supabase);
              totalIssuesSynced += issuesResult.count;
              console.log(`[SYNC] Synced ${issuesResult.count} issues for volume ${vol.id}`);
            } else {
              console.error(`[SYNC] Failed to sync volume ${vol.id}`);
            }
          }

          // If we got fewer than BATCH_SIZE, we're done
          if (volumes.length < BATCH_SIZE) {
            console.log('[SYNC] Last batch processed, ending sync');
            hasMore = false;
          } else {
            currentOffset += BATCH_SIZE;
            // Rate limiting between batches
            await new Promise(resolve => setTimeout(resolve, 1100));
          }
        }

        if (batchCount >= MAX_BATCHES) {
          console.log(`[SYNC] Reached max batches limit (${MAX_BATCHES}), stopping sync`);
        }

        console.log('[SYNC] Sync complete:', {
          volumesProcessed: totalVolumesProcessed,
          volumesAdded: totalVolumesAdded,
          volumesUpdated: totalVolumesUpdated,
          issuesSynced: totalIssuesSynced,
          nextOffset: currentOffset
        });

        return new Response(
          JSON.stringify({
            success: true,
            message: 'ComicVine sync completed',
            volumesSynced: totalVolumesProcessed,
            volumesAdded: totalVolumesAdded,
            volumesUpdated: totalVolumesUpdated,
            issuesSynced: totalIssuesSynced,
            totalSynced: totalVolumesProcessed + totalIssuesSynced,
            nextOffset: currentOffset,
            timestamp: new Date().toISOString()
          }),
          { 
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );

      } catch (error) {
        console.error('[SYNC] Fatal error in sync logic:', error);
        const errorMessage = error instanceof Error ? error.message : String(error);
        const errorStack = error instanceof Error ? error.stack : undefined;
        
        console.error('[SYNC] Error details:', errorStack);
        
        return new Response(
          JSON.stringify({ 
            success: false,
            error: errorMessage,
            details: errorStack,
            timestamp: new Date().toISOString()
          }),
          { 
            status: 200, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }
    })();

    // Race between sync and timeout
    return await Promise.race([syncPromise, timeoutPromise]);
  } catch (error) {
    console.error('[SYNC] Outer error handler:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    return new Response(
      JSON.stringify({ 
        success: false,
        error: errorMessage,
        timestamp: new Date().toISOString()
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
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
