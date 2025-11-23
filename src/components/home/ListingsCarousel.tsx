import { useEffect, useState } from "react";
import { ChevronRight } from "lucide-react";
import ItemCard from "@/components/ItemCard";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { resolvePrice } from "@/lib/listingPriceUtils";
import { getListingImageUrl } from "@/lib/sellerUtils";
import { fetchListingsBase } from "@/lib/listingsQuery";

interface ListingsCarouselProps {
  title: string;
  filterType: "newly-listed" | "ending-soon" | "hot-week" | "local" | "recommended" | "featured-grails";
  showViewAll?: boolean;
}

export function ListingsCarousel({ title, filterType, showViewAll = true }: ListingsCarouselProps) {
  const [listings, setListings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchListings();
  }, [filterType]);

  const fetchListings = async () => {
    try {
      const data = await fetchListingsBase({ 
        filterType: filterType as any, 
        limit: 8 // Limit to 8 items for faster loading
      });
      setListings(data);
    } catch (error) {
      console.error(`Error fetching ${filterType} listings:`, error);
      setListings([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="py-4 md:py-8 px-0">
      <div className="container mx-auto px-4">
        <div className="flex justify-between items-center mb-4 md:mb-6">
          <h2 className="text-xl sm:text-2xl md:text-3xl font-bold">{title}</h2>
          {showViewAll && (
            <Button variant="ghost" className="hidden md:flex font-bold text-sm md:text-base">
              SORT <ChevronRight className="h-4 w-4 md:h-5 md:w-5 ml-1" />
            </Button>
          )}
        </div>
      </div>
      <div className="overflow-x-auto overflow-y-visible pb-4 scrollbar-hide snap-x snap-mandatory">
        <div className="flex gap-3 md:gap-4 px-4 min-w-min">
          {loading ? (
            <>
              {[...Array(5)].map((_, i) => (
                <div key={i} className="w-[280px] sm:w-64 h-[420px] flex-shrink-0 snap-center bg-muted animate-pulse rounded-lg" />
              ))}
            </>
          ) : listings.length > 0 ? (
            listings.map((listing) => {
              const price = resolvePrice(listing);
              const profile = Array.isArray(listing.profiles) ? listing.profiles[0] : listing.profiles;
              return (
                <div key={listing.listing_id} className="w-[280px] sm:w-64 flex-shrink-0 snap-center">
                  <ItemCard
                    id={listing.listing_id}
                    title={listing.title || listing.series || "Untitled"}
                    price={price === null ? undefined : price}
                    condition={listing.condition || listing.cgc_grade || "Unknown"}
                    image={getListingImageUrl(listing)}
                    category="comic"
                    isAuction={listing.for_auction}
                    showMakeOffer={listing.offers_enabled}
                    showTradeBadge={listing.is_for_trade}
              sellerName={profile?.username}
              sellerCity={undefined}
              isVerifiedSeller={profile?.is_verified_seller}
                    completedSalesCount={profile?.completed_sales_count || 0}
                    isSlab={listing.is_slab}
                    grade={listing.cgc_grade}
                    gradingCompany={listing.grading_company}
                    certificationNumber={listing.certification_number}
                    series={listing.series}
                    issueNumber={listing.issue_number}
                    keyInfo={listing.variant_description || listing.details}
                  />
                </div>
              );
            })
          ) : null}
        </div>
      </div>
    </section>
  );
}
