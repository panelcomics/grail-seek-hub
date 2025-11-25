/**
 * Canonical Listing type for marketplace listings.
 * Represents the transformed shape returned by fetchListingsBase.
 */

export interface ListingProfile {
  user_id: string;
  display_name: string | null;
  username: string | null;
  avatar_url: string | null;
  is_verified_seller: boolean | null;
  completed_sales_count: number | null;
  seller_tier: string | null;
  is_featured_seller: boolean | null;
}

export type ListingImages = {
  front?: string;
  back?: string;
  additional?: string[];
  [key: string]: any;
} | null;

export interface InventoryItem {
  id: string;
  title: string | null;
  series: string | null;
  issue_number: string | null;
  condition: string | null;
  cgc_grade: string | null;
  grading_company: string | null;
  certification_number: string | null;
  is_slab: boolean | null;
  variant_description: string | null;
  images: any; // Json from Supabase - can be object, string, array, etc.
  for_sale: boolean | null;
  for_auction: boolean | null;
  is_for_trade: boolean | null;
  offers_enabled: boolean | null;
  user_id: string;
  details: string | null;
  comicvine_issue_id?: string | null;
  sold_off_platform?: boolean | null;
  sold_off_platform_date?: string | null;
  sold_off_platform_channel?: string | null;
}

/**
 * Main Listing type - flattened structure with inventory_items spread to top level
 */
export interface Listing {
  // From listings table
  id: string;
  type: string;
  price_cents: number | null;
  price?: number | null;
  status: string;
  created_at: string;
  updated_at: string;
  user_id: string;
  condition_notes?: string | null;
  
  // Derived/added fields
  listing_id: string;
  profiles?: ListingProfile;
  
  // Flattened from inventory_items (spread to top level)
  title: string | null;
  series: string | null;
  issue_number: string | null;
  condition: string | null;
  cgc_grade: string | null;
  grading_company: string | null;
  certification_number: string | null;
  is_slab: boolean | null;
  variant_description: string | null;
  images: any; // Json from Supabase - can be object, string, array, etc.
  for_sale: boolean | null;
  for_auction: boolean | null;
  is_for_trade: boolean | null;
  offers_enabled: boolean | null;
  details: string | null;
  local_pickup?: boolean | null;
  comicvine_issue_id?: string | null;
  sold_off_platform?: boolean | null;
  sold_off_platform_date?: string | null;
  sold_off_platform_channel?: string | null;
  
  // Keep nested for backwards compatibility
  inventory_items: InventoryItem;
}
