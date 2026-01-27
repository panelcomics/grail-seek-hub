/**
 * Homepage Listings Grid
 * 
 * Grid density optimized for homepage discovery:
 * - Mobile (< 640px): 2 columns
 * - Small tablet (640-1024px): 3 columns  
 * - Desktop (≥ 1024px): 4 columns
 * - Wide desktop (≥ 1280px): 5 columns
 * 
 * Uses CompactItemCard for denser layout while maintaining premium feel.
 * Applies seller fairness algorithm to prevent single-seller dominance.
 */

import { useState, useEffect } from "react";
import { CompactItemCard } from "@/components/home/CompactItemCard";
import { Skeleton } from "@/components/ui/skeleton";
import { fetchListingsBase } from "@/lib/listingsQuery";
import { resolvePrice } from "@/lib/listingPriceUtils";
import { getListingImageUrl } from "@/lib/sellerUtils";
import { Listing } from "@/types/listing";
import { applyHomepageFairness } from "@/lib/homepageFairness";

interface ListingsGridProps {
  filterType: string;
  /** Apply seller fairness algorithm (default: true) */
  applyFairness?: boolean;
}

export function ListingsGrid({ filterType, applyFairness = true }: ListingsGridProps) {
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

      let data = await fetchListingsBase({ 
        filterType: queryFilterType, 
        limit: ITEMS_PER_PAGE 
      });
      
      // Apply seller fairness algorithm to spread exposure
      if (applyFairness && data.length > 0) {
        data = applyHomepageFairness(data, {
          maxPerSellerInTop: 4,
          topWindowSize: 50
        });
      }
      
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
      /* 
        Skeleton grid matches responsive columns:
        2 cols mobile, 3 cols tablet, 4 cols desktop, 5 cols wide
      */
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2 sm:gap-3 lg:gap-4">
        {Array.from({ length: 12 }).map((_, i) => (
          <div key={i} className="space-y-2">
            <Skeleton className="aspect-[3/4] w-full rounded-lg" />
            <Skeleton className="h-3 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
          </div>
        ))}
      </div>
    );
  }

  if (listings.length === 0) {
    return (
      <div className="text-center py-12 sm:py-20">
        <p className="text-muted-foreground text-sm sm:text-lg">No listings found for this filter.</p>
      </div>
    );
  }

  return (
    /* 
      Dense responsive grid:
      - 2 cols on mobile for comfortable tap targets
      - 3 cols on small tablets
      - 4 cols on desktop  
      - 5 cols on wide screens for max density
      
      Gap is tighter than before for denser feel
    */
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2 sm:gap-3 lg:gap-4">
      {listings.map((item, index) => {
        const profile = Array.isArray(item.profiles) ? item.profiles[0] : item.profiles;
        const displayTitle = item.title || `${item.series || "Unknown"} #${item.issue_number || "?"}`;
        const price = resolvePrice(item);
        
        return (
          <CompactItemCard
            key={item.listing_id}
            id={item.listing_id}
            title={displayTitle}
            price={price === null ? undefined : price}
            image={getListingImageUrl(item.inventory_items || item)}
            isSlab={item.is_slab}
            grade={item.cgc_grade}
            gradingCompany={item.grading_company}
            keyInfo={item.variant_description || item.details}
            isSigned={item.is_signed}
            signatureType={item.signature_type}
            signedBy={item.signed_by}
            isAuction={item.for_auction}
            imageRotation={item.primary_image_rotation}
            priority={index < 6}
            sellerId={profile?.user_id}
            restorationMarkers={(item.inventory_items as any)?.restoration_markers || (item as any)?.restoration_markers}
          />
        );
      })}
    </div>
  );
}
