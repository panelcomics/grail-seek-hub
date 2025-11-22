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
    setLoading(true);
    try {
      // Optimized query - only fields used in ItemCard
      let query = supabase
        .from("inventory_items")
        .select(`
          id,
          title,
          series,
          issue_number,
          listed_price,
          images,
          cgc_grade,
          grading_company,
          certification_number,
          condition,
          owner_id,
          is_for_trade,
          for_sale,
          for_auction,
          offers_enabled,
          is_slab,
          local_pickup,
          variant_description,
          details,
          created_at
        `)
        .in("listing_status", ["active", "listed"])
        .limit(10);

      if (filterType === "featured-grails") {
        query = query
          .eq("for_sale", true)
          .gt("listed_price", 0)
          .order("created_at", { ascending: false });
      } else if (filterType === "newly-listed") {
        query = query
          .or("for_sale.eq.true,for_auction.eq.true,is_for_trade.eq.true")
          .order("created_at", { ascending: false });
      } else if (filterType === "ending-soon") {
        query = query
          .eq("for_auction", true)
          .order("created_at", { ascending: true });
      } else if (filterType === "hot-week") {
        query = query
          .or("for_sale.eq.true,for_auction.eq.true,is_for_trade.eq.true")
          .eq("is_featured", true);
      } else if (filterType === "local") {
        query = query.or("for_sale.eq.true,for_auction.eq.true,is_for_trade.eq.true");
      } else {
        query = query.or("for_sale.eq.true,for_auction.eq.true,is_for_trade.eq.true");
      }

      const { data, error } = await query;

      if (error) {
        console.error(`Error fetching ${filterType} listings:`, error);
        setListings([]);
        return;
      }

      if (!data || data.length === 0) {
        console.log(`No listings found for ${filterType}`);
        setListings([]);
        return;
      }

      // Fetch profiles separately - only fields used in cards
      const ownerIds = [...new Set((data || []).map(l => l.owner_id).filter(Boolean))];
      
      if (ownerIds.length === 0) {
        setListings(data.map(listing => ({ ...listing, profiles: null })));
        return;
      }

      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, username, seller_tier, is_verified_seller, completed_sales_count")
        .in("user_id", ownerIds);

      // Attach profile data to each listing
      const listingsWithProfiles = (data || []).map(listing => ({
        ...listing,
        profiles: profiles?.find(p => p.user_id === listing.owner_id)
      }));

      setListings(listingsWithProfiles);
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
              const price = resolvePrice(listing);
              const profile = Array.isArray(listing.profiles) ? listing.profiles[0] : listing.profiles;
              return (
                <div key={listing.id} className="w-[230px] flex-shrink-0 snap-center">
                  <ItemCard
                    id={listing.id}
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
                const price = resolvePrice(listing);
                const profile = Array.isArray(listing.profiles) ? listing.profiles[0] : listing.profiles;
                return (
                  <div key={listing.id} className="w-[200px] flex-shrink-0">
                    <ItemCard
                      id={listing.id}
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
