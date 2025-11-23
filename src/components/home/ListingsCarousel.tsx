import { useEffect, useState } from "react";
import { ChevronRight } from "lucide-react";
import ItemCard from "@/components/ItemCard";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { getListingImageUrl } from "@/lib/sellerUtils";
import { fetchLiveListings } from "@/lib/fetchListings";
import { resolvePrice } from "@/lib/listingPriceUtils";

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
    setLoading(true);
    console.time(`CAROUSEL ${filterType}`);
    console.log(`CAROUSEL ${filterType} start`);
    
    try {
      // Use the shared helper that matches the working Marketplace page query
      const { data: allListings, error } = await fetchLiveListings({ limit: 100 });

      if (error) {
        console.error(`CAROUSEL ${filterType} error:`, error);
        console.timeEnd(`CAROUSEL ${filterType}`);
        setListings([]);
        setLoading(false);
        return;
      }

      if (!allListings || allListings.length === 0) {
        console.log(`CAROUSEL ${filterType}: BASE QUERY returned 0 listings`);
        console.timeEnd(`CAROUSEL ${filterType}`);
        setListings([]);
        setLoading(false);
        return;
      }

      console.log("HOME BASE LISTINGS COUNT:", allListings.length);

      // Filter in-memory based on section type (no extra Supabase queries)
      let filteredListings = allListings;

      if (filterType === "featured-grails") {
        // Featured Grails: highest priced items that are for sale
        filteredListings = allListings
          .filter(l => l.for_sale && l.price_cents)
          .sort((a, b) => (b.price_cents || 0) - (a.price_cents || 0))
          .slice(0, 10);
      } else if (filterType === "newly-listed") {
        // Newly Listed: most recent items by created_at
        filteredListings = allListings
          .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
          .slice(0, 10);
      } else if (filterType === "local") {
        // Local Deals: items with local_pickup enabled
        filteredListings = allListings
          .filter(l => l.local_pickup)
          .slice(0, 10);
        
        // Fallback if no local items: show recent items
        if (filteredListings.length === 0) {
          filteredListings = allListings.slice(0, 10);
        }
      } else if (filterType === "hot-week") {
        // Hot this week: recent for_sale items
        filteredListings = allListings
          .filter(l => l.for_sale)
          .slice(0, 10);
      } else {
        // Default: just take first 10
        filteredListings = allListings.slice(0, 10);
      }

      console.log("CAROUSEL", filterType, "COUNT:", filteredListings.length);
      console.timeEnd(`CAROUSEL ${filterType}`);
      
      setListings(filteredListings);
    } catch (error) {
      console.error(`CAROUSEL ${filterType} exception:`, error);
      console.timeEnd(`CAROUSEL ${filterType}`);
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
      
      {/* Mobile: Horizontal scroll with 1.5 cards visible */}
      <div className="md:hidden overflow-x-auto overflow-y-visible pb-4 scrollbar-hide snap-x snap-mandatory">
        <div className="flex gap-3 px-4 min-w-min">
          {loading ? (
            <>
              {[...Array(3)].map((_, i) => (
                <Skeleton key={i} className="w-[230px] h-[360px] flex-shrink-0 snap-center rounded-lg" />
              ))}
            </>
          ) : listings.length > 0 ? (
            listings.map((listing) => {
              const profile = listing.profiles;
              const displayTitle = listing.title || `${listing.series || "Unknown"} #${listing.issue_number || "?"}`;
              const price = resolvePrice(listing);
              
              return (
                <div key={listing.listing_id} className="w-[230px] flex-shrink-0 snap-center">
                  <ItemCard
                    id={listing.listing_id}
                    title={displayTitle}
                    price={price === null ? undefined : price}
                    condition={listing.cgc_grade || listing.condition || "Raw"}
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
          ) : (
            <p className="text-muted-foreground text-sm py-4">No listings available</p>
          )}
        </div>
      </div>

      {/* Desktop: Horizontal scroll row (same as mobile but larger cards) */}
      <div className="hidden md:block overflow-x-auto overflow-y-visible pb-4 scrollbar-hide">
        <div className="container mx-auto px-4">
          {loading ? (
            <div className="flex gap-4 min-w-min">
              {[...Array(6)].map((_, i) => (
                <Skeleton key={i} className="w-[200px] h-[400px] flex-shrink-0 rounded-lg" />
              ))}
            </div>
          ) : listings.length > 0 ? (
            <div className="flex gap-4 min-w-min">
              {listings.map((listing) => {
                const profile = listing.profiles;
                const displayTitle = listing.title || `${listing.series || "Unknown"} #${listing.issue_number || "?"}`;
                const price = resolvePrice(listing);
                
                return (
                  <div key={listing.listing_id} className="w-[200px] flex-shrink-0">
                    <ItemCard
                      id={listing.listing_id}
                      title={displayTitle}
                      price={price === null ? undefined : price}
                      condition={listing.cgc_grade || listing.condition || "Raw"}
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
              })}
            </div>
          ) : (
            <p className="text-center text-muted-foreground py-8">No listings available</p>
          )}
        </div>
      </div>
    </section>
  );
}
