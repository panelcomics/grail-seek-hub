import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import ItemCard from "@/components/ItemCard";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { Sparkles } from "lucide-react";
import { resolvePrice } from "@/lib/listingPriceUtils";
import { getListingImageUrl } from "@/lib/sellerUtils";

export function FeaturedGrailsCarousel() {
  const [listings, setListings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchFeaturedGrails();
  }, []);

  const fetchFeaturedGrails = async () => {
    try {
      // Query inventory_items directly - show ALL live Buy-It-Now listings
      const { data, error } = await supabase
        .from("inventory_items")
        .select("*")
        .eq("for_sale", true)
        .gt("listed_price", 0)
        .in("listing_status", ["active", "listed"])
        .order("created_at", { ascending: false })
        .limit(10);

      if (error) throw error;

      console.log("FeaturedGrails listings:", (data || []).length);

      // Fetch profiles separately for each unique owner_id
      const ownerIds = [...new Set((data || []).map(l => l.owner_id).filter(Boolean))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, username, is_verified_seller, completed_sales_count")
        .in("user_id", ownerIds);

      // Attach profile data to each listing
      const transformedListings = (data || []).map(listing => {
        const profile = profiles?.find(p => p.user_id === listing.owner_id);
        return {
          ...listing,
          profiles: profile,
        };
      });

      setListings(transformedListings);
    } catch (error) {
      console.error("Error fetching featured grails:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <section className="py-4 px-4 bg-gradient-to-b from-primary/5 to-background">
        <div className="container mx-auto max-w-6xl">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg sm:text-2xl md:text-3xl lg:text-4xl font-black text-primary">
              ✨ Featured Grails — Buy It Now
            </h2>
          </div>
          <div className="overflow-x-auto pb-4 -mx-4 px-4 md:overflow-visible">
            <div className="flex gap-4 min-w-min md:grid md:grid-cols-3 md:gap-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="w-[260px] h-[380px] flex-shrink-0 bg-muted animate-pulse rounded-lg md:w-full" />
              ))}
            </div>
          </div>
        </div>
      </section>
    );
  }

  if (listings.length === 0) {
    return (
      <section className="py-8 px-4 bg-gradient-to-b from-primary/5 to-background">
        <div className="container mx-auto max-w-2xl text-center">
          <Sparkles className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-xl font-bold mb-2">No grails are listed for sale yet</h3>
          <p className="text-muted-foreground mb-6">
            Be the first to list a key with the AI scanner.
          </p>
          <Button asChild>
            <Link to="/scanner">Start Scanning</Link>
          </Button>
        </div>
      </section>
    );
  }

  return (
    <section className="py-4 px-4 bg-gradient-to-b from-primary/5 to-background">
      <div className="container mx-auto max-w-6xl">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg sm:text-2xl md:text-3xl lg:text-4xl font-black text-primary">
            ✨ Featured Grails — Buy It Now
          </h2>
        </div>
        
        {/* Desktop: 3 cards per row */}
        <div className="hidden md:grid md:grid-cols-3 gap-4">
          {listings.slice(0, 9).map((listing) => {
            const price = resolvePrice(listing);
            const profile = listing.profiles;
            return (
              <div key={listing.id} className="w-full">
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

        {/* Mobile: Horizontal scroll with centered cards */}
        <div className="md:hidden overflow-x-auto overflow-y-visible pb-4 -mx-4 px-4 scrollbar-hide snap-x snap-mandatory">
          <div className="flex gap-4 min-w-min">
            {listings.map((listing) => {
              const price = resolvePrice(listing);
              const profile = listing.profiles;
              return (
                <div key={listing.id} className="w-[260px] max-w-[260px] flex-shrink-0 snap-center">
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
        </div>
      </div>
    </section>
  );
}
