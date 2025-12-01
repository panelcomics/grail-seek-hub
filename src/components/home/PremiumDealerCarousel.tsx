import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import ItemCard from "@/components/ItemCard";
import { Skeleton } from "@/components/ui/skeleton";
import { SellerBadge } from "@/components/SellerBadge";
import { VerifiedSellerBadge } from "@/components/VerifiedSellerBadge";
import { ChevronRight } from "lucide-react";
import { resolvePrice } from "@/lib/listingPriceUtils";
import { getSellerSlug, getListingImageUrl } from "@/lib/sellerUtils";
import { fetchSellerListings, fetchHomepageSellerListings } from "@/lib/listingsQuery";
import { HomepageSectionKey } from "@/lib/homepageCache";
import { homeDebugStart, homeDebugRender } from "@/lib/homeDebug";
import { debugLog, debugError } from "@/lib/debug";

interface PremiumDealerCarouselProps {
  sellerId?: string; // Preferred: direct seller UUID for fast, reliable queries
  sellerName?: string; // Fallback: look up seller by name (slower, less reliable)
  useCache?: boolean; // Enable caching (homepage only)
  cacheKey?: HomepageSectionKey; // Required when useCache is true
}

export function PremiumDealerCarousel({ 
  sellerId, 
  sellerName,
  useCache = false,
  cacheKey
}: PremiumDealerCarouselProps) {
  const [listings, setListings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [sellerProfile, setSellerProfile] = useState<any>(null);
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');

  // Guard against React StrictMode double effects and race conditions between mobile/desktop
  const requestIdRef = useRef(0);

  useEffect(() => {
    const viewport = typeof window !== 'undefined' ? `${window.innerWidth}px` : 'SSR';
    const effectRequestId = ++requestIdRef.current;
    debugLog('HOMEPAGE', `PremiumDealerCarousel mount/update: sellerId=${sellerId?.substring(0,8)}, useCache=${useCache}, cacheKey=${cacheKey}, viewport=${viewport}, requestId=${effectRequestId}`);

    const fetchSellerAndListings = async () => {
      setStatus('loading');
      try {
        if (useCache && cacheKey) {
          homeDebugStart(cacheKey);
        }
        
        let profileData: any = null;

        // Optimize: Fetch listings, profile comes from single query
        let listingsData: any[];
        let targetUserId = sellerId;

        // If no sellerId, look up by name first
        if (!targetUserId && sellerName) {
          debugLog('FEATURED_SHOP', 'Looking up seller by name:', sellerName);
          const { data, error } = await supabase
            .from("public_profiles")
            .select("user_id")
            .eq("username", sellerName)
            .maybeSingle();

          if (!data) {
            const { data: fuzzyData } = await supabase
              .from("public_profiles")
              .select("user_id")
              .ilike("username", `%${sellerName}%`)
              .limit(1)
              .maybeSingle();
            targetUserId = fuzzyData?.user_id;
          } else {
            targetUserId = data?.user_id;
          }

          if (!targetUserId) {
            debugError('FEATURED_SHOP', 'Seller not found by name:', sellerName);
            setSellerProfile(null);
            if (effectRequestId === requestIdRef.current) {
              setStatus('error');
              setLoading(false);
            }
            return;
          }
        }

        if (!targetUserId) {
          debugError('FEATURED_SHOP', 'No valid seller ID');
          if (effectRequestId === requestIdRef.current) {
            setStatus('error');
            setLoading(false);
          }
          return;
        }

        // Fetch listings - profile comes from query
        if (useCache && cacheKey) {
          listingsData = await fetchHomepageSellerListings(cacheKey, targetUserId, 10);
        } else {
          listingsData = await fetchSellerListings(targetUserId, 10);
        }

        // Extract profile from first listing (all have same seller)
        const extractedProfile = listingsData?.[0]?.profiles;
        if (extractedProfile) {
          setSellerProfile(extractedProfile);
          debugLog('FEATURED_SHOP', 'Profile extracted:', extractedProfile.username);
        } else {
          debugLog('FEATURED_SHOP', 'No profile data, will show fallback state');
          setSellerProfile(null);
        }

        const rawLength = Array.isArray(listingsData) ? listingsData.length : 0;
        const currentViewport = typeof window !== 'undefined' ? `${window.innerWidth}px` : 'SSR';
        debugLog('FEATURED_SHOP', 'raw response listings=', rawLength, `(viewport: ${currentViewport}, requestId=${effectRequestId})`);

        if (effectRequestId !== requestIdRef.current) {
          debugLog('FEATURED_SHOP', 'Stale response ignored', `(viewport: ${currentViewport}, requestId=${effectRequestId}, currentRequestId=${requestIdRef.current})`);
          return;
        }

        setListings(listingsData || []);
        setStatus('success');
        debugLog('FEATURED_SHOP', 'Loaded', listingsData?.length || 0, 'listings for seller:', extractedProfile?.username || sellerName, `(viewport: ${currentViewport}, requestId=${effectRequestId})`);
        
        if (useCache && cacheKey) {
          homeDebugRender(cacheKey, { count: listingsData?.length || 0 });
        }
      } catch (error) {
        const errViewport = typeof window !== 'undefined' ? `${window.innerWidth}px` : 'SSR';
        debugError("FEATURED_SHOP", "Error fetching premium dealer listings (viewport:", errViewport, ", requestId=", effectRequestId, "):", error);
        if (effectRequestId === requestIdRef.current) {
          setStatus('error');
        }
      } finally {
        if (effectRequestId === requestIdRef.current) {
          setLoading(false);
        }
      }
    };

    fetchSellerAndListings();
  }, [sellerId, sellerName, useCache, cacheKey]);

  if (loading) {
    return (
      <section className="py-6 md:py-8 px-4 bg-gradient-to-b from-red-950/10 to-background border-y border-red-500/20">
        <div className="container mx-auto">
          <div className="flex items-center gap-3 mb-6">
            <div className="h-8 w-48 bg-muted animate-pulse rounded" />
          </div>
          <div className="overflow-x-auto overflow-y-visible pb-4 -mx-4 px-4 sm:mx-0 sm:px-0">
            <div className="flex gap-4 min-w-min">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="w-56 sm:w-64 h-96 rounded-lg flex-shrink-0 bg-muted animate-pulse" />
              ))}
            </div>
          </div>
        </div>
      </section>
    );
  }

  // Always render section, even if no seller/listings
  return (
    <section className="py-4 md:py-8 bg-gradient-to-b from-red-950/10 to-background border-y border-red-500/20">
      <div className="container mx-auto px-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 md:gap-4 mb-4 md:mb-6">
          <div className="flex items-center gap-2 md:gap-3 flex-wrap">
            <h2 className="text-xl sm:text-2xl md:text-3xl font-bold">
              Featured Shop: {sellerProfile?.username || sellerName || 'Premium Dealer'}
            </h2>
            {sellerProfile && (
              <div className="flex items-center gap-1.5 md:gap-2 flex-wrap">
                <SellerBadge tier={sellerProfile?.seller_tier || "premium"} />
                <VerifiedSellerBadge salesCount={0} size="sm" />
              </div>
            )}
          </div>
          {sellerProfile && (
            <a 
              href={`/seller/${getSellerSlug(sellerProfile || { username: sellerName })}`}
              className="flex items-center gap-1 text-primary hover:text-primary/80 font-bold whitespace-nowrap text-sm md:text-base"
            >
              View Shop <ChevronRight className="h-4 w-4 md:h-5 md:w-5" />
            </a>
          )}
        </div>
      </div>
      {listings.length > 0 ? (
        <div className="overflow-x-auto overflow-y-visible pb-4 scrollbar-hide snap-x snap-mandatory">
          <div className="flex gap-3 md:gap-4 px-4 min-w-min">
            {listings.slice(0, 6).map((listing) => {
              const price = resolvePrice(listing);
              return (
                <div key={listing.listing_id || listing.id} className="w-[280px] sm:w-64 flex-shrink-0 snap-center">
                  <ItemCard
                    id={listing.listing_id || listing.id}
                    title={listing.title || listing.series || "Untitled"}
                    price={price === null ? undefined : price}
                    condition={listing.condition || "Unknown"}
                    image={getListingImageUrl(listing.inventory_items || listing)}
                    category="comic"
                    isAuction={listing.for_auction}
                    showMakeOffer={listing.offers_enabled}
                    showTradeBadge={listing.is_for_trade}
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
              ? 'Unable to load shop listings. Please try again later.' 
              : !sellerProfile 
                ? 'Seller not found.' 
                : 'No listings available from this shop right now.'}
          </p>
        </div>
      )}
    </section>
  );
}
