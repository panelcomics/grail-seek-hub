/**
 * Canonical Listing type for marketplace listings.
 * Represents the transformed shape returned by fetchListingsBase.
 */

export interface ListingProfile {
  user_id: string;
  display_name?: string | null; // Optional - not in database, fallback to username
  username: string | null;
  avatar_url: string | null;
  is_verified_seller: boolean | null;
  completed_sales_count: number | null;
  seller_tier: string | null;
  is_featured_seller: boolean | null;
  city?: string | null;
  state?: string | null;
  postal_code?: string | null;
  shipping_address?: any | null; // JSONB field containing full shipping address
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
  grade?: string | null;  // Fallback column for grade
  grading_company: string | null;
  certification_number: string | null;
  is_slab: boolean | null;
  is_key?: boolean | null;  // Key issue flag
  key_issue?: boolean | null;  // Alternate key issue flag
  key_details?: string | null;  // Key issue description
  key_type?: string | null;  // Key issue type
  variant_description: string | null;
  variant_type?: string | null;  // Variant type
  variant_details?: string | null;  // Variant details
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
  primary_image_rotation?: number | null;
  listed_price?: number | null;  // Listing price
  shipping_price?: number | null;  // Shipping price
  storage_location?: string | null;  // Storage location
  private_location?: string | null;  // Private location
  private_notes?: string | null;  // Private notes
  writer?: string | null;  // Writer credits
  artist?: string | null;  // Artist credits
  cover_artist?: string | null;  // Cover artist
  // Signature fields
  is_signed?: boolean | null;
  signature_type?: string | null;
  signed_by?: string | null;
  signature_date?: string | null;
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
  // Key issue fields
  key_issue?: boolean | null;
  key_details?: string | null;
  key_type?: string | null;
  local_pickup?: boolean | null;
  comicvine_issue_id?: string | null;
  sold_off_platform?: boolean | null;
  sold_off_platform_date?: string | null;
  sold_off_platform_channel?: string | null;
  primary_image_rotation?: number | null;
  listed_price?: number | null;
  shipping_price?: number | null;
  // Signature fields
  is_signed?: boolean | null;
  signature_type?: string | null;
  signed_by?: string | null;
  signature_date?: string | null;
  
  // Keep nested for backwards compatibility
  inventory_items: InventoryItem;
}
