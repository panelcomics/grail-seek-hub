import { supabase } from "@/integrations/supabase/client";
import { Listing } from "@/types/listing";
import { getHomepageCached, HomepageSectionKey } from "./homepageCache";

export interface ListingsQueryOptions {
  filterType?: 'featured-grails' | 'newly-listed' | 'ending-soon' | 'hot-week' | 'local' | 'all';
  limit?: number;
  locationFilter?: { city?: string; radiusMiles?: number } | null;
}

/**
 * Unified listings query - matches the Browse Marketplace query exactly.
 * This is the single source of truth for fetching listings across the app.
 */
/**
 * Fetch listings for a specific seller by user_id
 */
export async function fetchSellerListings(userId: string, limit: number = 10): Promise<Listing[]> {
  const startTime = performance.now();
  console.log(`[HOMEPAGE] FETCH seller-listings (${userId.substring(0, 8)}...) started`);

  try {
    const { data, error } = await supabase
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
          details,
          listed_price,
          shipping_price,
          primary_image_rotation
        )
      `)
      .eq("status", "active")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(limit);

    const endTime = performance.now();
    const duration = endTime - startTime;

    if (error) {
      console.error(`[HOMEPAGE] FETCH seller-listings ERROR in ${duration.toFixed(2)}ms:`, error);
      throw error;
    }

    console.log(`[HOMEPAGE] FETCH seller-listings success in ${duration.toFixed(2)}ms: ${data?.length || 0} listings`);

    // Fetch public profile for this seller (single query)
    const { data: profile } = await supabase
      .from("public_profiles")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();

    // Transform data to match expected format
    const transformedData = (data || []).map(listing => ({
      ...listing,
      ...listing.inventory_items,
      listing_id: listing.id,
      price_cents: listing.price_cents,
      profiles: profile ? { ...profile, completed_sales_count: 0 } : undefined,
      inventory_items: listing.inventory_items,
    }));

    return transformedData;
  } catch (error) {
    const endTime = performance.now();
    const duration = endTime - startTime;
    console.error(`[HOMEPAGE] FETCH seller-listings FAILED in ${duration.toFixed(2)}ms:`, error);
    return [];
  }
}

export async function fetchListingsBase(options: ListingsQueryOptions = {}): Promise<Listing[]> {
  const { filterType = 'all', limit = 10 } = options;
  
  const startTime = performance.now();
  console.log(`[HOMEPAGE] FETCH ${filterType} started`);
  
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
          details,
          listed_price,
          shipping_price,
          primary_image_rotation
        )
      `)
    // Filter active listings and exclude sold off-platform items
    query = query
      .eq("status", "active")
      .eq("inventory_items.sold_off_platform", false);

    // Apply filters based on type
    switch (filterType) {
      case "featured-grails":
        // Featured buy-it-now listings priced $149+
        query = query
          .eq("type", "buy_now")
          .gte("price_cents", 14900)
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
        // Location-based filtering - requires viewer and seller lat/lng
        // This case is handled differently: query remains unmodified here,
        // filtering happens client-side after profile join in fetchListingsForLocalDeals
        query = query
          .eq("type", "buy_now")
          .order("created_at", { ascending: false });
        break;
      
      case "all":
      default:
        query = query.order("updated_at", { ascending: false });
        break;
    }

    // Apply limit (default to 10 for performance)
    query = query.limit(limit);

    const { data, error } = await query;

    const endTime = performance.now();
    const duration = endTime - startTime;
    
    if (error) {
      console.error(`[HOMEPAGE] FETCH ${filterType} ERROR in ${duration.toFixed(2)}ms:`, error);
      throw error;
    }

    if (!data || data.length === 0) {
      console.log(`[HOMEPAGE] FETCH ${filterType} success in ${duration.toFixed(2)}ms: 0 listings`);
      return [];
    }

    console.log(`[HOMEPAGE] FETCH ${filterType} success in ${duration.toFixed(2)}ms: ${data.length} listings`);

    // Batch fetch public profiles for all unique user_ids
    const userIds = [...new Set(data.map(l => l.user_id).filter(Boolean))];
    const { data: profiles } = await supabase
      .from("public_profiles")
      .select("*")
      .in("user_id", userIds);

    // Transform data to include inventory_items properties at top level
    const transformedData = data.map(listing => {
      const item = listing.inventory_items;
      const profile = profiles?.find(p => p.user_id === listing.user_id);
      return {
        ...listing,
        ...item,
        listing_id: listing.id,
        price_cents: listing.price_cents,
        profiles: profile ? { ...profile, completed_sales_count: 0 } : undefined,
        // Keep nested for backwards compatibility
        inventory_items: item,
      };
    });

    return transformedData;
  } catch (error) {
    const endTime = performance.now();
    const duration = endTime - startTime;
    console.error(`[HOMEPAGE] FETCH ${filterType} FAILED in ${duration.toFixed(2)}ms:`, error);
    return [];
  }
}

/**
 * Homepage-specific wrapper for fetchListingsBase with caching
 * Use this ONLY on the homepage Index.tsx
 */
export async function fetchHomepageListings(
  cacheKey: HomepageSectionKey,
  options: ListingsQueryOptions = {}
): Promise<Listing[]> {
  const { data } = await getHomepageCached(cacheKey, () => fetchListingsBase(options));
  // Safety: always return array, never null/undefined
  return Array.isArray(data) ? data : [];
}

/**
 * Homepage-specific wrapper for fetchSellerListings with caching
 * Use this ONLY on the homepage Index.tsx
 */
export async function fetchHomepageSellerListings(
  cacheKey: HomepageSectionKey,
  userId: string,
  limit: number = 10
): Promise<Listing[]> {
  const { data } = await getHomepageCached(cacheKey, () => fetchSellerListings(userId, limit));
  // Safety: always return array, never null/undefined
  return Array.isArray(data) ? data : [];
}
