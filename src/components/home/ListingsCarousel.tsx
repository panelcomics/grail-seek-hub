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

const getCarouselLabel = (filterType: ListingsCarouselProps["filterType"]): string => `CAROUSEL ${filterType}`;
export function ListingsCarousel({ title, filterType, showViewAll = true, deferMs = 0 }: ListingsCarouselProps & { deferMs?: number }) {
  const [listings, setListings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (deferMs > 0) {
      const timer = setTimeout(() => {
        fetchListings();
      }, deferMs);
      return () => clearTimeout(timer);
    } else {
      fetchListings();
    }
  }, [filterType, deferMs]);

  const fetchListings = async () => {
    const cacheKey = `gs-home-${filterType}`;
    const label = getCarouselLabel(filterType);
    const cached = sessionStorage.getItem(cacheKey);

    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        const { data: cachedData, timestamp } = parsed;
        if (Array.isArray(cachedData) && typeof timestamp === "number" && Date.now() - timestamp < 5 * 60 * 1000) {
          console.log(`✓ ${label} from cache (instant):`, { count: cachedData.length });
          setListings(cachedData);
          setLoading(false);
          // Still refresh in background to keep things fresh
          fetchFreshData(cacheKey);
          return;
        }
      } catch (e) {
        console.warn(`Cache parse error for ${label}, ignoring cached value`, e);
        // Invalid cache, continue with network fetch
      }
    }

    setLoading(true);
    setError(null);

    console.time(label);
    const queryStart = performance.now();

    try {
      // SINGLE QUERY with profiles joined via inventory_items
      let query = supabase
        .from("listings")
        .select(`
          id,
          price,
          price_cents,
          status,
          type,
          created_at,
          ends_at,
          inventory_items!inventory_item_id (
            id,
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
            is_for_trade,
            profiles!owner_id (
              user_id,
              username,
              seller_tier,
              is_verified_seller,
              completed_sales_count
            )
          )
        `)
        .eq("status", "active")
        .in("type", ["fixed", "auction"])
        .limit(6);

      // Apply filters
      if (filterType === "featured-grails") {
        query = query.eq("type", "fixed").order("created_at", { ascending: false });
      } else if (filterType === "newly-listed") {
        query = query.order("created_at", { ascending: false });
      } else if (filterType === "ending-soon") {
        query = query.order("ends_at", { ascending: true, nullsFirst: false });
      } else if (filterType === "hot-week") {
        query = query.eq("type", "fixed").order("created_at", { ascending: false });
      } else if (filterType === "local") {
        query = query.order("created_at", { ascending: false });
      } else {
        query = query.order("created_at", { ascending: false });
      }

      const { data, error } = await query;

      const duration = performance.now() - queryStart;
      console.timeEnd(label);
      if (duration > 8000) {
        console.warn(`WARN ${label} slow query: ${Math.round(duration)} ms`);
      }

      if (error) {
        console.error(`ERROR ${label}`, error);
        setError("Error loading listings");
        setListings([]);
        return;
      }

      if (!data || data.length === 0) {
        console.log(`✓ ${label}: 0 items`);
        setListings([]);
        return;
      }

      console.log(`success: ${label} ${data.length} listings`, {
        count: data.length,
        sample: data[0],
      });

      // Cache the results only on success with data
      try {
        sessionStorage.setItem(
          cacheKey,
          JSON.stringify({
            data,
            timestamp: Date.now(),
          })
        );
      } catch (e) {
        // Quota exceeded or other storage issue; ignore cache write
        console.warn(`Cache write error for ${label}`, e);
      }

      setListings(data);
    } catch (error) {
      console.error(`ERROR ${label} unexpected:`, error);
      setError("Error loading listings");
      setListings([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchFreshData = async (cacheKey: string) => {
    try {
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
            is_for_trade,
            profiles!owner_id (
              user_id,
              username,
              seller_tier,
              is_verified_seller,
              completed_sales_count
            )
          )
        `)
        .eq("status", "active")
        .in("type", ["fixed", "auction"])
        .limit(6);

      if (filterType === "featured-grails") {
        query = query.eq("type", "fixed").order("created_at", { ascending: false });
      } else if (filterType === "newly-listed") {
        query = query.order("created_at", { ascending: false });
      } else if (filterType === "ending-soon") {
        query = query.order("ends_at", { ascending: true, nullsFirst: false });
      } else if (filterType === "hot-week") {
        query = query.eq("type", "fixed").order("created_at", { ascending: false });
      } else if (filterType === "local") {
        query = query.order("created_at", { ascending: false });
      } else {
        query = query.order("created_at", { ascending: false });
      }

      const { data, error } = await query;

      if (!error && data && data.length > 0) {
        sessionStorage.setItem(cacheKey, JSON.stringify({
          data,
          timestamp: Date.now()
        }));
        setListings(data);
      }
    } catch (error) {
      // Silent fail for background refresh
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
              const profile = inventory?.profiles;
              const priceSource = inventory ? { ...inventory, ...listing } : listing;
              const price = resolvePrice(priceSource);
              
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
                    showFavoriteButton={false}
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
                const profile = inventory?.profiles;
                const priceSource = inventory ? { ...inventory, ...listing } : listing;
                const price = resolvePrice(priceSource);
                
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
                      showFavoriteButton={false}
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
