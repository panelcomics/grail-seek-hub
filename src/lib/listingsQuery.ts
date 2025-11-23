import { supabase } from "@/integrations/supabase/client";

export interface ListingsQueryOptions {
  filterType?: 'featured-grails' | 'newly-listed' | 'ending-soon' | 'hot-week' | 'local' | 'all';
  limit?: number;
  locationFilter?: { city?: string; radiusMiles?: number } | null;
}

/**
 * Unified listings query - matches the Browse Marketplace query exactly.
 * This is the single source of truth for fetching listings across the app.
 */
export async function fetchListingsBase(options: ListingsQueryOptions = {}) {
  const { filterType = 'all', limit = 10 } = options;
  
  console.time(`FETCH ${filterType}`);
  
  try {
    // Optimized query - only select fields needed for cards
    let query = supabase
      .from("listings")
      .select(`
        id,
        type,
        price_cents,
        status,
        created_at,
        updated_at,
        user_id,
        inventory_items!inner(
          id,
          title,
          series,
          issue_number,
          condition,
          cgc_grade,
          grading_company,
          certification_number,
          is_slab,
          variant_description,
          images,
          for_sale,
          for_auction,
          is_for_trade,
          offers_enabled,
          user_id,
          details
        )
      `)
      .eq("status", "active");

    // Apply filters based on type
    switch (filterType) {
      case "featured-grails":
        // Featured buy-it-now listings with price
        query = query
          .eq("type", "fixed")
          .gt("price_cents", 0)
          .order("created_at", { ascending: false });
        break;
      
      case "newly-listed":
        // All types, newest first
        query = query.order("created_at", { ascending: false });
        break;
      
      case "ending-soon":
        // Auctions only, oldest first (ending soonest)
        query = query
          .eq("type", "auction")
          .order("created_at", { ascending: true });
        break;
      
      case "hot-week":
        // Could add view count or featured flag filtering here
        query = query.order("updated_at", { ascending: false });
        break;
      
      case "local":
        // All types for now (location filtering would go here)
        query = query.order("created_at", { ascending: false });
        break;
      
      case "all":
      default:
        query = query.order("updated_at", { ascending: false });
        break;
    }

    // Apply limit (default to 10 for performance)
    query = query.limit(limit);

    const { data, error } = await query;

    console.timeEnd(`FETCH ${filterType}`);

    if (error) {
      console.error(`FETCH ${filterType} error:`, error);
      throw error;
    }

    if (!data || data.length === 0) {
      console.log(`FETCH ${filterType} success: 0 listings`);
      return [];
    }

    console.log(`FETCH ${filterType} success: ${data.length} listings`);

    // Fetch profiles separately for each unique user_id
    const userIds = [...new Set(data.map(l => l.user_id).filter(Boolean))];
    const { data: profiles } = await supabase
      .from("profiles")
      .select("user_id, display_name, username, avatar_url, is_verified_seller, completed_sales_count")
      .in("user_id", userIds);

    // Transform data to include inventory_items properties at top level
    // This matches the Marketplace transformation exactly
    const transformedData = data.map(listing => {
      const item = listing.inventory_items;
      const profile = profiles?.find(p => p.user_id === listing.user_id);
      return {
        ...listing,
        ...item,
        listing_id: listing.id,
        price_cents: listing.price_cents,
        profiles: profile,
        // Keep nested for backwards compatibility
        inventory_items: item,
      };
    });

    return transformedData;
  } catch (error) {
    console.timeEnd(`FETCH ${filterType}`);
    console.error(`FETCH ${filterType} failed:`, error);
    throw error;
  }
}
