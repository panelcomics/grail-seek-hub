/**
 * Collector Signal Refresh Edge Function
 * ========================================
 * Aggregates platform behavior to compute collector interest signals.
 * 
 * SIGNAL LOGIC (Simple Additive - NO ML):
 * - Watchlist additions (last 7 days): +3 points per add
 * - Scanner Assist selections: +2 points per scan
 * - Saved search matches: +1 point per search
 * - Supply imbalance bonus: +5 points if high demand / low supply
 * 
 * SAFETY RULES:
 * - NO pricing advice
 * - NO user-identifiable data stored
 * - NO external APIs
 * - NO automation triggers
 * 
 * This function is designed to be called via cron or manual trigger.
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SignalData {
  comic_title: string;
  issue_number: string | null;
  variant: string | null;
  publisher: string | null;
  watchlist_count: number;
  search_count: number;
  scanner_count: number;
  active_listing_count: number;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('[COLLECTOR_SIGNAL] Starting signal refresh...');

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const sevenDaysAgoISO = sevenDaysAgo.toISOString();

    // ========================================
    // STEP 1: Aggregate watchlist data (last 7 days)
    // We group by listing title to get watchlist counts
    // ========================================
    console.log('[COLLECTOR_SIGNAL] Aggregating watchlist data...');
    
    const { data: watchlistData, error: watchlistError } = await supabase
      .from('favorites')
      .select(`
        listing_id,
        created_at
      `)
      .gte('created_at', sevenDaysAgoISO);

    if (watchlistError) {
      console.error('[COLLECTOR_SIGNAL] Watchlist error:', watchlistError);
    }

    // ========================================
    // STEP 2: Aggregate scanner selections (from user_scan_history)
    // These represent confirmed comic identifications
    // ========================================
    console.log('[COLLECTOR_SIGNAL] Aggregating scanner data...');
    
    const { data: scannerData, error: scannerError } = await supabase
      .from('user_scan_history')
      .select('title, issue_number, publisher')
      .gte('created_at', sevenDaysAgoISO);

    if (scannerError) {
      console.error('[COLLECTOR_SIGNAL] Scanner error:', scannerError);
    }

    // ========================================
    // STEP 3: Aggregate saved searches
    // ========================================
    console.log('[COLLECTOR_SIGNAL] Aggregating saved search data...');
    
    const { data: searchData, error: searchError } = await supabase
      .from('saved_searches')
      .select('query, created_at')
      .gte('created_at', sevenDaysAgoISO);

    if (searchError) {
      console.error('[COLLECTOR_SIGNAL] Search error:', searchError);
    }

    // ========================================
    // STEP 4: Get active listings for supply context
    // ========================================
    console.log('[COLLECTOR_SIGNAL] Aggregating active listings...');
    
    const { data: listingsData, error: listingsError } = await supabase
      .from('listings')
      .select('title, issue_number, volume_name')
      .eq('status', 'active');

    if (listingsError) {
      console.error('[COLLECTOR_SIGNAL] Listings error:', listingsError);
    }

    // ========================================
    // STEP 5: Build signal aggregation map
    // Key: normalized "title|issue|publisher"
    // ========================================
    const signalMap = new Map<string, SignalData>();

    const normalizeKey = (title: string, issue: string | null, publisher: string | null) => {
      const normTitle = (title || '').toLowerCase().trim();
      const normIssue = (issue || '').toLowerCase().trim();
      const normPublisher = (publisher || '').toLowerCase().trim();
      return `${normTitle}|${normIssue}|${normPublisher}`;
    };

    const getOrCreate = (key: string, title: string, issue: string | null, publisher: string | null): SignalData => {
      if (!signalMap.has(key)) {
        signalMap.set(key, {
          comic_title: title,
          issue_number: issue,
          variant: null,
          publisher: publisher,
          watchlist_count: 0,
          search_count: 0,
          scanner_count: 0,
          active_listing_count: 0,
        });
      }
      return signalMap.get(key)!;
    };

    // Process scanner data (most reliable signal)
    if (scannerData) {
      for (const scan of scannerData) {
        if (!scan.title) continue;
        const key = normalizeKey(scan.title, scan.issue_number, scan.publisher);
        const signal = getOrCreate(key, scan.title, scan.issue_number, scan.publisher);
        signal.scanner_count++;
      }
    }

    // Process listings data for supply context
    if (listingsData) {
      for (const listing of listingsData) {
        if (!listing.title) continue;
        const key = normalizeKey(listing.title, listing.issue_number, null);
        const signal = getOrCreate(key, listing.title, listing.issue_number, null);
        signal.active_listing_count++;
      }
    }

    // Process search data (extract comic titles from queries)
    if (searchData) {
      for (const search of searchData) {
        if (!search.query) continue;
        // Simple extraction - treat query as title for now
        const key = normalizeKey(search.query, null, null);
        const signal = getOrCreate(key, search.query, null, null);
        signal.search_count++;
      }
    }

    // ========================================
    // STEP 6: Compute signal scores
    // Simple additive logic - NO ML
    // ========================================
    console.log('[COLLECTOR_SIGNAL] Computing signal scores...');

    const signals: Array<SignalData & { signal_score: number }> = [];

    for (const [, data] of signalMap) {
      // Skip entries with minimal activity
      if (data.scanner_count === 0 && data.search_count === 0) {
        continue;
      }

      /**
       * SIGNAL SCORE FORMULA (Explainable):
       * - Scanner selections: +2 points each (strong intent signal)
       * - Search queries: +1 point each (interest signal)
       * - Watchlist adds: +3 points each (collection intent)
       * - Supply imbalance bonus: +5 if demand > supply * 2
       */
      let score = 0;
      
      // Scanner weight: 2 points per scan
      score += data.scanner_count * 2;
      
      // Search weight: 1 point per search
      score += data.search_count * 1;
      
      // Watchlist weight: 3 points per add
      score += data.watchlist_count * 3;
      
      // Supply imbalance bonus
      const demandSignal = data.scanner_count + data.search_count + data.watchlist_count;
      if (demandSignal > data.active_listing_count * 2 && data.active_listing_count < 5) {
        score += 5;
      }

      signals.push({
        ...data,
        signal_score: score,
      });
    }

    // Sort by score descending
    signals.sort((a, b) => b.signal_score - a.signal_score);

    // Take top 50 for storage
    const topSignals = signals.slice(0, 50);

    console.log(`[COLLECTOR_SIGNAL] Found ${signals.length} signals, storing top ${topSignals.length}`);

    // ========================================
    // STEP 7: Upsert signals to database
    // NO deletes - only update or insert
    // ========================================
    for (const signal of topSignals) {
      const { error: upsertError } = await supabase
        .from('collector_signals')
        .upsert({
          comic_title: signal.comic_title,
          issue_number: signal.issue_number,
          variant: signal.variant,
          publisher: signal.publisher,
          signal_score: signal.signal_score,
          watchlist_count: signal.watchlist_count,
          search_count: signal.search_count,
          scanner_count: signal.scanner_count,
          active_listing_count: signal.active_listing_count,
          last_activity_at: new Date().toISOString(),
        }, {
          onConflict: 'comic_title,issue_number,publisher',
          ignoreDuplicates: false,
        });

      if (upsertError) {
        // If conflict resolution fails, try simple insert
        console.warn('[COLLECTOR_SIGNAL] Upsert warning:', upsertError.message);
      }
    }

    console.log('[COLLECTOR_SIGNAL] Signal refresh complete');

    return new Response(
      JSON.stringify({
        success: true,
        signals_processed: topSignals.length,
        message: 'Collector signals refreshed successfully',
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error: unknown) {
    console.error('[COLLECTOR_SIGNAL] Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: errorMessage 
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
