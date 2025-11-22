import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import ItemCard from "@/components/ItemCard";
import { Skeleton } from "@/components/ui/skeleton";

interface ListingsGridProps {
  filterType: string;
}

export function ListingsGrid({ filterType }: ListingsGridProps) {
  const [listings, setListings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const ITEMS_PER_PAGE = 24;

  useEffect(() => {
    fetchListings();
  }, [filterType, page]);

  const fetchListings = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from("inventory_items")
        .select(`
          id,
          title,
          series,
          issue_number,
          listed_price,
          images,
          cgc_grade,
          grading_company,
          certification_number,
          condition,
          user_id,
          is_for_trade,
          for_sale,
          for_auction,
          offers_enabled,
          is_featured,
          local_pickup,
          is_slab,
          profiles!inventory_items_user_id_fkey(username, city, state, seller_tier, is_verified_seller, completed_sales_count)
        `)
        .eq("listing_status", "listed")
        .range((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE - 1);

      // Apply filters based on active tab
      switch (filterType) {
        case "featured":
          query = query.eq("is_featured", true);
          break;
        case "auctions":
          query = query.eq("for_auction", true);
          break;
        case "buy-now":
          query = query.eq("for_sale", true);
          break;
        case "offers":
          query = query.eq("offers_enabled", true);
          break;
        case "trade":
          query = query.eq("is_for_trade", true);
          break;
        case "local":
          // TODO: Add geolocation filtering
          break;
      }

      const { data, error } = await query.order("created_at", { ascending: false });

      if (error) throw error;
      setListings(data || []);
    } catch (error) {
      console.error("Error fetching listings:", error);
    } finally {
      setLoading(false);
    }
  };

  const getImageUrl = (item: any) => {
    if (item.images && Array.isArray(item.images) && item.images.length > 0) {
      return item.images[0].url || item.images[0];
    }
    return "/placeholder.svg";
  };

  if (loading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {Array.from({ length: 12 }).map((_, i) => (
          <div key={i} className="space-y-4">
            <Skeleton className="h-64 w-full" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
          </div>
        ))}
      </div>
    );
  }

  if (listings.length === 0) {
    return (
      <div className="text-center py-20">
        <p className="text-muted-foreground text-lg">No listings found for this filter.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
      {listings.map((item) => {
        const profile = Array.isArray(item.profiles) ? item.profiles[0] : item.profiles;
        const displayTitle = item.title || `${item.series || "Unknown"} #${item.issue_number || "?"}`;
        
        return (
          <ItemCard
            key={item.id}
            id={item.id}
            title={displayTitle}
            price={item.listed_price || 0}
            image={getImageUrl(item)}
            condition={item.cgc_grade || item.condition || "Raw"}
            sellerName={profile?.username}
            sellerCity={profile?.city}
            sellerBadge={profile?.seller_tier}
            isVerifiedSeller={profile?.is_verified_seller}
            completedSalesCount={profile?.completed_sales_count || 0}
            category="comic"
            showTradeBadge={item.is_for_trade}
            isAuction={item.for_auction}
            localPickupAvailable={item.local_pickup}
            isSlab={item.is_slab}
            grade={item.cgc_grade}
            gradingCompany={item.grading_company}
            certificationNumber={item.certification_number}
            series={item.series}
            issueNumber={item.issue_number}
            keyInfo={item.variant_description || item.details}
          />
        );
      })}
    </div>
  );
}
