import { useEffect, useState } from "react";
import { ChevronRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import ItemCard from "@/components/ItemCard";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { resolvePrice } from "@/lib/listingPriceUtils";
import { getListingImageUrl } from "@/lib/sellerUtils";

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
    // Check cache first to avoid refetching on navigation
    const cacheKey = `listings_${filterType}`;
    const cached = sessionStorage.getItem(cacheKey);
    if (cached) {
      try {
        const { data: cachedData, timestamp } = JSON.parse(cached);
        // Use cache if less than 5 minutes old
        if (Date.now() - timestamp < 5 * 60 * 1000) {
          setListings(cachedData);
          setLoading(false);
          return;
        }
      } catch (e) {
        // Invalid cache, continue with fetch
      }
    }

    setLoading(true);
    console.log(`FETCH ${filterType} start`);
    try {
      // Optimized query: only select fields needed for homepage cards
      let query = supabase
        .from("listings")
        .select(`
          id,
          price,
          price_cents,
          status,
          type,
          created_at,
          inventory_items!inventory_item_id (
            id,
            owner_id,
            title,
            series,
            issue_number,
            images,
            cgc_grade,
            grading_company,
            certification_number,
            condition,
            is_slab,
            local_pickup,
            for_auction,
            offers_enabled,
            is_for_trade
          )
        `)
        .eq("status", "active")
        .in("type", ["fixed", "auction"])
        .limit(10);

      if (filterType === "featured-grails") {
        query = query
          .eq("type", "fixed")
          .order("created_at", { ascending: false });
      } else if (filterType === "newly-listed") {
        query = query.order("created_at", { ascending: false });
      } else if (filterType === "ending-soon") {
        query = query.order("ends_at", { ascending: true, nullsFirst: false });
      } else if (filterType === "hot-week") {
        query = query
          .eq("type", "fixed")
          .order("created_at", { ascending: false });
      } else if (filterType === "local") {
        // TODO: Add geolocation filtering based on buyer location
        query = query.order("created_at", { ascending: false });
      } else {
        query = query.order("created_at", { ascending: false });
      }

      const { data, error } = await query;

      if (error) {
        console.error(`FETCH ${filterType} error:`, error);
        setListings([]);
        return;
      }

      if (!data || data.length === 0) {
        console.log(`FETCH ${filterType} success: 0 listings`);
        setListings([]);
        return;
      }

      console.log(`FETCH ${filterType} success: ${data.length} listings`);

      // Derive seller profiles from joined inventory items
      const inventoryItems = (data || [])
        .map((l: any) => l.inventory_items)
        .filter(Boolean);

      const ownerIds = [...new Set(inventoryItems.map((i: any) => i.owner_id).filter(Boolean))];

      if (ownerIds.length === 0) {
        setListings(data.map((listing: any) => ({ ...listing, profiles: null })));
        return;
      }

      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("user_id, username, seller_tier, is_verified_seller, completed_sales_count")
        .in("user_id", ownerIds);

      if (profilesError) {
        console.error(`FETCH ${filterType} profiles error:`, profilesError);
      }

      const listingsWithProfiles = (data || []).map((listing: any) => {
        const inventory = listing.inventory_items;
        const profile = profiles?.find((p: any) => p.user_id === inventory?.owner_id);
        return {
          ...listing,
          profiles: profile || null,
        };
      });

      setListings(listingsWithProfiles);
      
      // Cache the results for 5 minutes
      try {
        sessionStorage.setItem(cacheKey, JSON.stringify({
          data: listingsWithProfiles,
          timestamp: Date.now()
        }));
      } catch (e) {
        // Storage quota exceeded, ignore
      }
    } catch (error) {
      console.error(`Error in ${filterType} fetchListings:`, error);
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
              const inventory = listing.inventory_items || listing;
              const priceSource = inventory ? { ...inventory, ...listing } : listing;
              const price = resolvePrice(priceSource);
              const profile = Array.isArray(listing.profiles) ? listing.profiles[0] : listing.profiles;
              return (
                <div key={listing.id} className="w-[230px] flex-shrink-0 snap-center">
                  <ItemCard
                    id={listing.id}
                    title={inventory.title || inventory.series || listing.title || "Untitled"}
                    price={price === null ? undefined : price}
                    condition={inventory.condition || inventory.cgc_grade || "Unknown"}
                    image={getListingImageUrl(inventory)}
                    category="comic"
                    isAuction={inventory.for_auction}
                    showMakeOffer={inventory.offers_enabled}
                    showTradeBadge={inventory.is_for_trade}
                    sellerName={profile?.username}
                    sellerCity={undefined}
                    isVerifiedSeller={profile?.is_verified_seller}
                    completedSalesCount={profile?.completed_sales_count || 0}
                    isSlab={inventory.is_slab}
                    grade={inventory.cgc_grade}
                    gradingCompany={inventory.grading_company}
                    certificationNumber={inventory.certification_number}
                    series={inventory.series}
                    issueNumber={inventory.issue_number}
                    keyInfo={null}
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
                const inventory = listing.inventory_items || listing;
                const priceSource = inventory ? { ...inventory, ...listing } : listing;
                const price = resolvePrice(priceSource);
                const profile = Array.isArray(listing.profiles) ? listing.profiles[0] : listing.profiles;
                return (
                  <div key={listing.id} className="w-[200px] flex-shrink-0">
                    <ItemCard
                      id={listing.id}
                      title={inventory.title || inventory.series || listing.title || "Untitled"}
                      price={price === null ? undefined : price}
                      condition={inventory.condition || inventory.cgc_grade || "Unknown"}
                      image={getListingImageUrl(inventory)}
                      category="comic"
                      isAuction={inventory.for_auction}
                      showMakeOffer={inventory.offers_enabled}
                      showTradeBadge={inventory.is_for_trade}
                      sellerName={profile?.username}
                      sellerCity={undefined}
                      isVerifiedSeller={profile?.is_verified_seller}
                      completedSalesCount={profile?.completed_sales_count || 0}
                      isSlab={inventory.is_slab}
                      grade={inventory.cgc_grade}
                      gradingCompany={inventory.grading_company}
                      certificationNumber={inventory.certification_number}
                      series={inventory.series}
                      issueNumber={inventory.issue_number}
                      keyInfo={null}
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
