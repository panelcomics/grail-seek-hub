/**
 * Enhanced Listings Grid (Visual Parity Upgrade)
 * 
 * Grid with:
 * - Density toggle (compact vs comfortable)
 * - Darker background for contrast
 * - Uses EnhancedCompactItemCard
 * 
 * Only rendered when ENABLE_VISUAL_PARITY_UPGRADE is true.
 * Falls back to regular ListingsGrid when flag is off.
 */

import { useState, useEffect } from "react";
import { EnhancedCompactItemCard } from "@/components/home/EnhancedCompactItemCard";
import { GridDensityToggle } from "@/components/home/GridDensityToggle";
import { Skeleton } from "@/components/ui/skeleton";
import { fetchListingsBase } from "@/lib/listingsQuery";
import { resolvePrice } from "@/lib/listingPriceUtils";
import { getListingImageUrl } from "@/lib/sellerUtils";
import { Listing } from "@/types/listing";
import { applyHomepageFairness } from "@/lib/homepageFairness";
import { GridDensity, useGridDensity } from "@/hooks/useVisualParity";
import { cn } from "@/lib/utils";

interface EnhancedListingsGridProps {
  filterType: string;
  applyFairness?: boolean;
  title?: string;
}

export function EnhancedListingsGrid({ filterType, applyFairness = true, title }: EnhancedListingsGridProps) {
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [density, setDensity] = useGridDensity();
  const isCompact = density === "compact";

  useEffect(() => {
    fetchListings();
  }, [filterType]);

  const fetchListings = async () => {
    setLoading(true);
    try {
      let queryFilterType: any = 'all';
      switch (filterType) {
        case "featured": queryFilterType = "featured-grails"; break;
        case "auctions": queryFilterType = "ending-soon"; break;
        case "buy-now": queryFilterType = "newly-listed"; break;
        case "offers":
        case "trade":
        case "local": queryFilterType = filterType; break;
      }

      let data = await fetchListingsBase({ filterType: queryFilterType, limit: 24 });
      if (applyFairness && data.length > 0) {
        data = applyHomepageFairness(data, { maxPerSellerInTop: 4, topWindowSize: 50 });
      }
      setListings(data);
    } catch (error) {
      console.error("Error fetching listings:", error);
      setListings([]);
    } finally {
      setLoading(false);
    }
  };

  // Grid column classes based on density
  const gridCols = isCompact
    ? "grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6"
    : "grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5";

  const gridGap = isCompact
    ? "gap-1.5 sm:gap-2"
    : "gap-2 sm:gap-3 lg:gap-4";

  return (
    <div>
      {/* Header with optional title and density toggle */}
      <div className="flex items-center justify-between mb-3">
        {title && (
          <h2 className="text-lg sm:text-xl font-bold text-foreground">{title}</h2>
        )}
        <div className="ml-auto">
          <GridDensityToggle density={density} onChange={setDensity} />
        </div>
      </div>

      {/* Darkened background container for card contrast */}
      <div className="rounded-lg bg-secondary/5 p-2 sm:p-3">
        {loading ? (
          <div className={cn("grid", gridCols, gridGap)}>
            {Array.from({ length: 12 }).map((_, i) => (
              <div key={i} className="space-y-2">
                <Skeleton className="aspect-[3/4.5] w-full rounded-lg" />
                <Skeleton className="h-3 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
              </div>
            ))}
          </div>
        ) : listings.length === 0 ? (
          <div className="text-center py-12 sm:py-20">
            <p className="text-muted-foreground text-sm sm:text-lg">No listings found.</p>
          </div>
        ) : (
          <div className={cn("grid", gridCols, gridGap)}>
            {listings.map((item, index) => {
              const profile = Array.isArray(item.profiles) ? item.profiles[0] : item.profiles;
              const displayTitle = item.title || `${item.series || "Unknown"} #${item.issue_number || "?"}`;
              const price = resolvePrice(item);

              return (
                <EnhancedCompactItemCard
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
                  density={density}
                />
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
