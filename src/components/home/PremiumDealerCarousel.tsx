import { useEffect, useState } from "react";
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

  useEffect(() => {
    fetchSellerAndListings();
  }, [sellerId, sellerName, useCache, cacheKey]);

  const fetchSellerAndListings = async () => {
    try {
      let profileData: any = null;

      // PREFERRED PATH: Direct lookup by seller ID (fast, reliable)
      if (sellerId) {
        console.log('[FEATURED_SHOP] Querying by sellerId:', sellerId);
        const { data, error } = await supabase
          .from("public_profiles")
          .select("user_id, username, display_name, seller_tier, profile_image_url")
          .eq("user_id", sellerId)
          .maybeSingle();

        if (error) {
          console.error('[FEATURED_SHOP] Error querying by sellerId:', error);
        } else if (!data) {
          console.error('[FEATURED_SHOP] No seller found with sellerId:', sellerId);
        } else {
          profileData = data;
          console.log('[FEATURED_SHOP] Found seller by ID:', data.display_name || data.username);
        }
      }

      // FALLBACK PATH: Lookup by name (slower, less reliable)
      if (!profileData && sellerName) {
        console.log('[FEATURED_SHOP] Falling back to name lookup:', sellerName);
        
        // Try exact match first
        let { data, error } = await supabase
          .from("public_profiles")
          .select("user_id, username, display_name, seller_tier, profile_image_url")
          .or(`username.eq.${sellerName},display_name.eq.${sellerName}`)
          .maybeSingle();

        if (!data) {
          // Try case-insensitive partial match
          const { data: fuzzyData } = await supabase
            .from("public_profiles")
            .select("user_id, username, display_name, seller_tier, profile_image_url")
            .or(`username.ilike.%${sellerName}%,display_name.ilike.%${sellerName}%`)
            .limit(1)
            .maybeSingle();
          
          profileData = fuzzyData;
        } else {
          profileData = data;
        }

        if (!profileData) {
          console.error('[FEATURED_SHOP] Seller not found by name:', sellerName);
        } else {
          console.log('[FEATURED_SHOP] Found seller by name:', profileData.display_name || profileData.username);
        }
      }

      if (!profileData) {
        console.error('[FEATURED_SHOP] Failed to find seller. sellerId:', sellerId, 'sellerName:', sellerName);
        setSellerProfile(null);
        setListings([]);
        setLoading(false);
        return;
      }

      // Verify or set as premium tier
      if (profileData.seller_tier !== 'premium') {
        console.warn(`[FEATURED_SHOP] Seller not marked as premium tier:`, profileData.display_name || profileData.username);
      }

      setSellerProfile(profileData);

      // Use unified query helper for consistent data fetching and logging
      let listingsData: any[];
      if (useCache && cacheKey) {
        // Use cached version for homepage
        listingsData = await fetchHomepageSellerListings(cacheKey, profileData.user_id, 10);
      } else {
        // Direct fetch for non-homepage pages
        listingsData = await fetchSellerListings(profileData.user_id, 10);
      }
      
      setListings(listingsData || []);
      console.log('[FEATURED_SHOP] Loaded', listingsData?.length || 0, 'listings for seller:', profileData.display_name || profileData.username);
    } catch (error) {
      console.error("[FEATURED_SHOP] Error fetching premium dealer listings:", error);
      setSellerProfile(null);
      setListings([]);
    } finally {
      setLoading(false);
    }
  };

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
              Featured Shop: {sellerProfile?.display_name || sellerProfile?.username || sellerName || 'Premium Dealer'}
            </h2>
            {sellerProfile && (
              <div className="flex items-center gap-1.5 md:gap-2 flex-wrap">
                <SellerBadge tier={sellerProfile?.seller_tier || "premium"} />
                <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full font-semibold">Premium Dealer</span>
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
                    image={getListingImageUrl(listing)}
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
            {!sellerProfile ? 'Seller not found.' : 'No listings available from this shop right now.'}
          </p>
        </div>
      )}
    </section>
  );
}
