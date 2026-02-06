/**
 * Hook for fetching marketplace listings with server-side filtering, sorting, and pagination.
 * All filtering (search, price range, sort) is done at the database level for correct results.
 */
import { useState, useCallback, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { debugLog } from "@/lib/debug";

export type MarketplaceSortOption = "newest" | "price_asc" | "price_desc" | "title";

interface MarketplaceFilters {
  search: string;
  sortBy: MarketplaceSortOption;
  minPrice: string;
  maxPrice: string;
}

interface MarketplaceListing {
  listing_id: string;
  [key: string]: any;
}

const ITEMS_PER_PAGE = 24;

const LISTING_SELECT = `
  id,
  type,
  price_cents,
  status,
  created_at,
  updated_at,
  user_id,
  start_bid,
  ends_at,
  shipping_price,
  fee_cents,
  payout_cents,
  quantity,
  is_signed,
  image_url,
  title,
  issue_number,
  volume_name,
  cover_date,
  condition_notes,
  details,
  seller_notes,
  signature_type,
  signed_by,
  signature_date,
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
    user_id,
    is_signed,
    signature_type,
    signed_by,
    signature_date,
    key_issue,
    key_details,
    key_type
  )
`;

export function useMarketplaceListings(filters: MarketplaceFilters) {
  const [listings, setListings] = useState<MarketplaceListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [offset, setOffset] = useState(0);
  
  // Track the current filters to detect changes
  const prevFiltersRef = useRef<string>("");

  const buildQuery = useCallback((currentOffset: number) => {
    let query = supabase
      .from("listings")
      .select(LISTING_SELECT)
      .eq("status", "active");

    // Server-side search: match against listing title OR inventory_items fields
    if (filters.search.trim()) {
      const term = `%${filters.search.trim()}%`;
      query = query.or(`title.ilike.${term},details.ilike.${term}`);
    }

    // Server-side price range filtering
    const minCents = filters.minPrice ? Math.round(parseFloat(filters.minPrice) * 100) : null;
    const maxCents = filters.maxPrice ? Math.round(parseFloat(filters.maxPrice) * 100) : null;
    
    if (minCents !== null && !isNaN(minCents) && minCents > 0) {
      query = query.gte("price_cents", minCents);
    }
    if (maxCents !== null && !isNaN(maxCents) && maxCents > 0) {
      query = query.lte("price_cents", maxCents);
    }

    // Server-side sorting
    switch (filters.sortBy) {
      case "price_asc":
        query = query.order("price_cents", { ascending: true, nullsFirst: false });
        break;
      case "price_desc":
        query = query.order("price_cents", { ascending: false, nullsFirst: true });
        break;
      case "title":
        query = query.order("title", { ascending: true });
        break;
      case "newest":
      default:
        query = query.order("updated_at", { ascending: false });
        break;
    }

    query = query.range(currentOffset, currentOffset + ITEMS_PER_PAGE - 1);
    return query;
  }, [filters]);

  const transformData = useCallback(async (data: any[]) => {
    // Batch fetch public profiles
    const userIds = [...new Set(data.map(l => l.user_id).filter(Boolean))];
    const { data: profilesData } = await supabase
      .from("public_profiles")
      .select("*")
      .in("user_id", userIds);

    return data.map(listing => {
      const item = listing.inventory_items;
      const profile = profilesData?.find(p => p.user_id === listing.user_id);
      return {
        ...listing,
        ...item,
        listing_id: listing.id,
        price_cents: listing.price_cents,
        profiles: profile ? { ...profile, completed_sales_count: profile.completed_sales_count || 0 } : undefined,
        inventory_items: item,
      };
    });
  }, []);

  const fetchListings = useCallback(async (reset = false) => {
    const currentOffset = reset ? 0 : offset;
    
    try {
      if (reset) {
        setLoading(true);
        setOffset(0);
      } else {
        setLoadingMore(true);
      }

      const { data, error } = await buildQuery(currentOffset);
      if (error) throw error;

      const transformedData = await transformData(data || []);
      
      if (reset) {
        setListings(transformedData);
      } else {
        setListings(prev => [...prev, ...transformedData]);
      }
      
      setHasMore(transformedData.length === ITEMS_PER_PAGE);
      setOffset(currentOffset + ITEMS_PER_PAGE);
    } catch (error) {
      console.error("Error fetching listings:", error);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [offset, buildQuery, transformData]);

  // Re-fetch when filters change
  useEffect(() => {
    const filterKey = JSON.stringify(filters);
    if (filterKey !== prevFiltersRef.current) {
      prevFiltersRef.current = filterKey;
      fetchListings(true);
    }
  }, [filters]);

  // Initial log
  useEffect(() => {
    const logView = async () => {
      try {
        await supabase.from("event_logs").insert({
          event: "marketplace_view",
          meta: { page: "marketplace" }
        });
      } catch (error) {
        console.error("Error logging marketplace view:", error);
      }
    };
    logView();
  }, []);

  const loadMore = useCallback(() => {
    if (!loadingMore && hasMore) {
      fetchListings(false);
    }
  }, [loadingMore, hasMore, fetchListings]);

  return { listings, loading, loadingMore, hasMore, loadMore };
}
