import { supabase } from "@/integrations/supabase/client";

/**
 * Fetches all active listings with inventory items and profiles.
 * This is the same base query used by the working Marketplace page.
 * 
 * @param options - Optional parameters like limit
 * @returns Array of listings with inventory items and profile data attached
 */
export async function fetchLiveListings(options?: { limit?: number }) {
  console.time("fetchLiveListings");
  
  try {
    // Base query: same as Marketplace.tsx (lines 41-66)
    let query = supabase
      .from("listings")
      .select(`
        *,
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
          details,
          variant_description,
          images,
          for_sale,
          for_auction,
          is_for_trade,
          offers_enabled,
          local_pickup,
          user_id
        )
      `)
      .eq("status", "active")
      .order("updated_at", { ascending: false });

    if (options?.limit) {
      query = query.limit(options.limit);
    }

    const { data, error } = await query;

    if (error) {
      console.error("fetchLiveListings error:", error);
      console.timeEnd("fetchLiveListings");
      return { data: [], error };
    }

    if (!data || data.length === 0) {
      console.timeEnd("fetchLiveListings");
      return { data: [], error: null };
    }

    // Fetch profiles separately for each unique user_id
    const userIds = [...new Set(data.map(l => l.user_id))];
    const { data: profiles } = await supabase
      .from("profiles")
      .select("user_id, display_name, username, avatar_url, is_verified_seller, completed_sales_count")
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
        profiles: profile,
        // Keep nested for backwards compatibility
        inventory_items: item,
      };
    });

    console.timeEnd("fetchLiveListings");
    console.log("fetchLiveListings success:", transformedData.length, "listings");
    
    return { data: transformedData, error: null };
  } catch (error) {
    console.error("fetchLiveListings exception:", error);
    console.timeEnd("fetchLiveListings");
    return { data: [], error };
  }
}
