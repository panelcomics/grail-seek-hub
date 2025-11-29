import { useState, useEffect } from "react";
import ItemCard from "@/components/ItemCard";
import { Skeleton } from "@/components/ui/skeleton";
import { fetchListingsBase } from "@/lib/listingsQuery";
import { resolvePrice } from "@/lib/listingPriceUtils";
import { getListingImageUrl } from "@/lib/sellerUtils";
import { Listing } from "@/types/listing";

interface ListingsGridProps {
  filterType: string;
}

export function ListingsGrid({ filterType }: ListingsGridProps) {
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const ITEMS_PER_PAGE = 24;

  useEffect(() => {
    fetchListings();
  }, [filterType, page]);

  const fetchListings = async () => {
    setLoading(true);
    try {
      // Map filter types to the unified query format
      let queryFilterType: any = 'all';
      
      switch (filterType) {
        case "featured":
          queryFilterType = "featured-grails";
          break;
        case "auctions":
          queryFilterType = "ending-soon";
          break;
        case "buy-now":
          queryFilterType = "newly-listed";
          break;
        case "offers":
        case "trade":
        case "local":
          queryFilterType = filterType;
          break;
      }

      const data = await fetchListingsBase({ 
        filterType: queryFilterType, 
        limit: ITEMS_PER_PAGE 
      });
      
      setListings(data);
    } catch (error) {
      console.error("Error fetching listings:", error);
      setListings([]);
    } finally {
      setLoading(false);
    }
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
      {listings.map((item, index) => {
        const profile = Array.isArray(item.profiles) ? item.profiles[0] : item.profiles;
        const displayTitle = item.title || `${item.series || "Unknown"} #${item.issue_number || "?"}`;
        const price = resolvePrice(item);
        
        return (
          <ItemCard
            priority={index < 6}
            key={item.listing_id}
            id={item.listing_id}
            title={displayTitle}
            price={price === null ? undefined : price}
            image={getListingImageUrl(item.inventory_items || item)}
            condition={item.cgc_grade || item.condition || "Raw"}
            sellerName={profile?.username}
            sellerCity={undefined}
            sellerBadge={profile?.seller_tier}
            isVerifiedSeller={profile?.is_verified_seller}
            completedSalesCount={profile?.completed_sales_count || 0}
            sellerTier={profile?.seller_tier}
            isFeaturedSeller={profile?.is_featured_seller}
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
