import { useEffect, useState, useRef } from "react";
import { ChevronRight } from "lucide-react";
import ItemCard from "@/components/ItemCard";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { resolvePrice } from "@/lib/listingPriceUtils";
import { getListingImageUrl } from "@/lib/sellerUtils";
import { fetchListingsBase, fetchHomepageListings } from "@/lib/listingsQuery";
import { Listing } from "@/types/listing";
import { HomepageSectionKey } from "@/lib/homepageCache";
import { homeDebugStart, homeDebugRender } from "@/lib/homeDebug";

interface ListingsCarouselProps {
  title: string;
  filterType: "newly-listed" | "ending-soon" | "hot-week" | "local" | "recommended" | "featured-grails";
  showViewAll?: boolean;
  useCache?: boolean; // Enable caching (homepage only)
  cacheKey?: HomepageSectionKey; // Required when useCache is true
}

export function ListingsCarousel({ 
  title, 
  filterType, 
  showViewAll = true,
  useCache = false,
  cacheKey
}: ListingsCarouselProps) {
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  // Guard against React StrictMode double effects and race conditions between mobile/desktop
  const requestIdRef = useRef(0);

  useEffect(() => {
    const viewport = typeof window !== 'undefined' ? `${window.innerWidth}px` : 'SSR';
    const effectRequestId = ++requestIdRef.current;
    console.log(`[HOMEPAGE] ListingsCarousel mount/update: ${filterType}, useCache=${useCache}, cacheKey=${cacheKey}, viewport=${viewport}, requestId=${effectRequestId}`);

    const fetchListings = async () => {
      setStatus('loading');
      try {
        if (useCache && cacheKey) {
          homeDebugStart(cacheKey);
        }
        
        let data: Listing[];
        if (useCache && cacheKey) {
          data = await fetchHomepageListings(cacheKey, { 
            filterType: filterType as any, 
            limit: 8 
          });
        } else {
          data = await fetchListingsBase({ 
            filterType: filterType as any, 
            limit: 8 
          });
        }
        
        const finalLength = Array.isArray(data) ? data.length : 0;
        const currentViewport = typeof window !== 'undefined' ? `${window.innerWidth}px` : 'SSR';
        console.log('[HOMEPAGE] CAROUSEL raw response', filterType, 'items=', finalLength, `(viewport: ${currentViewport}, requestId=${effectRequestId})`);

        // Only apply the result if this is the latest in-flight request.
        if (effectRequestId !== requestIdRef.current) {
          console.log('[HOMEPAGE] CAROUSEL', filterType, 'stale response ignored', `(viewport: ${currentViewport}, requestId=${effectRequestId}, currentRequestId=${requestIdRef.current})`);
          return;
        }

        setListings(data || []);
        setStatus('success');

        if (useCache && cacheKey) {
          homeDebugRender(cacheKey, { count: data?.length || 0 });
        }
      } catch (err) {
        const errViewport = typeof window !== 'undefined' ? `${window.innerWidth}px` : 'SSR';
        console.error(`[HOMEPAGE] CAROUSEL ${filterType} error (viewport: ${errViewport}, requestId=${effectRequestId}):`, err);
        setStatus('error');
      } finally {
        if (effectRequestId === requestIdRef.current) {
          setLoading(false);
        }
      }
    };

    fetchListings();
  }, [filterType, useCache, cacheKey]);

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
      {loading ? (
        <div className="overflow-x-auto overflow-y-visible pb-4 scrollbar-hide snap-x snap-mandatory">
          <div className="flex gap-3 md:gap-4 px-4 min-w-min">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="w-[280px] sm:w-64 h-[420px] flex-shrink-0 snap-center bg-muted animate-pulse rounded-lg" />
            ))}
          </div>
        </div>
      ) : listings.length > 0 ? (
        <div className="overflow-x-auto overflow-y-visible pb-4 scrollbar-hide snap-x snap-mandatory">
          <div className="flex gap-3 md:gap-4 px-4 min-w-min">
            {listings.map((listing) => {
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
                    sellerTier={profile?.seller_tier}
                    isFeaturedSeller={profile?.is_featured_seller}
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
        </div>
      ) : (
        <div className="container mx-auto px-4">
          <p className="text-sm text-muted-foreground">
            {status === 'error' 
              ? 'Unable to load listings. Please try again later.' 
              : 'No listings available right now. Check back soon!'}
          </p>
        </div>
      )}
    </section>
  );
}
