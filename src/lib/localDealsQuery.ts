import { supabase } from "@/integrations/supabase/client";
import { Listing } from "@/types/listing";
import { calculateDistance } from "./distanceUtils";

export interface LocalDealsOptions {
  viewerLat: number;
  viewerLng: number;
  radiusMiles: number;
  limit?: number;
}

/**
 * Fetch local deals based on viewer location and radius
 * Requires viewer to have lat/lng set in their profile
 */
export async function fetchLocalDeals(options: LocalDealsOptions): Promise<Listing[]> {
  const { viewerLat, viewerLng, radiusMiles, limit = 10 } = options;
  
  const startTime = performance.now();
  console.log(`[LOCAL-DEALS] Fetching within ${radiusMiles} miles of [${viewerLat}, ${viewerLng}]`);
  
  try {
    // Fetch active buy-now listings with seller profile data
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
      .eq("type", "buy_now")
      .eq("inventory_items.sold_off_platform", false)
      .not("price_cents", "is", null)
      .limit(100); // Fetch more initially for distance filtering

    if (error) throw error;
    if (!data || data.length === 0) {
      console.log(`[LOCAL-DEALS] No active buy-now listings found`);
      return [];
    }

    // Get unique seller user_ids
    const sellerIds = [...new Set(data.map(l => l.user_id).filter(Boolean))];
    
    // Fetch seller profiles with location data
    const { data: profiles, error: profilesError } = await supabase
      .from("profiles")
      .select("user_id, username, avatar_url, is_verified_seller, completed_sales_count, seller_tier, is_featured_seller, lat, lng, city, state")
      .in("user_id", sellerIds)
      .not("lat", "is", null)
      .not("lng", "is", null);

    if (profilesError) throw profilesError;

    // Create map of seller profiles with location
    const profileMap = new Map(
      (profiles || []).map(p => [p.user_id, p])
    );

    // Filter listings by distance and transform
    const nearbyListings: Listing[] = [];
    
    for (const listing of data) {
      const sellerProfile = profileMap.get(listing.user_id);
      
      // Skip if seller doesn't have location data
      if (!sellerProfile || !sellerProfile.lat || !sellerProfile.lng) {
        continue;
      }

      // Calculate distance
      const distance = calculateDistance(
        viewerLat,
        viewerLng,
        sellerProfile.lat,
        sellerProfile.lng
      );

      // Skip if outside radius
      if (distance > radiusMiles) {
        continue;
      }

      // Transform and include
      const item = listing.inventory_items;
      nearbyListings.push({
        ...listing,
        ...item,
        listing_id: listing.id,
        price_cents: listing.price_cents,
        profiles: sellerProfile,
        inventory_items: item,
        distance_miles: distance, // Add distance for display
      } as Listing);

      // Stop once we hit the limit
      if (nearbyListings.length >= limit) {
        break;
      }
    }

    // Sort by distance (closest first)
    nearbyListings.sort((a, b) => {
      const distA = (a as any).distance_miles || 0;
      const distB = (b as any).distance_miles || 0;
      return distA - distB;
    });

    const endTime = performance.now();
    const duration = endTime - startTime;
    
    console.log(`[LOCAL-DEALS] Found ${nearbyListings.length} listings within ${radiusMiles} miles in ${duration.toFixed(2)}ms`);
    
    return nearbyListings.slice(0, limit);

  } catch (error) {
    const endTime = performance.now();
    const duration = endTime - startTime;
    console.error(`[LOCAL-DEALS] Error in ${duration.toFixed(2)}ms:`, error);
    return [];
  }
}

/**
 * Check if user has location data set in their profile
 */
export async function checkUserLocation(userId: string): Promise<{
  hasLocation: boolean;
  lat?: number;
  lng?: number;
  city?: string;
  state?: string;
}> {
  try {
    const { data, error } = await supabase
      .from("profiles")
      .select("lat, lng, city, state, postal_code")
      .eq("user_id", userId)
      .single();

    if (error || !data) {
      return { hasLocation: false };
    }

    if (data.lat && data.lng) {
      return {
        hasLocation: true,
        lat: data.lat,
        lng: data.lng,
        city: data.city || undefined,
        state: data.state || undefined,
      };
    }

    return { hasLocation: false };
  } catch (error) {
    console.error('[LOCAL-DEALS] Error checking user location:', error);
    return { hasLocation: false };
  }
}
