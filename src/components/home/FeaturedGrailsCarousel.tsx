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
      // Query listings table joined with inventory_items and profiles
      const { data, error } = await supabase
        .from("listings")
        .select(`
          id,
          inventory_item_id,
          inventory_items!listings_inventory_item_id_fkey (
            id,
            title,
            series,
            issue_number,
            condition,
            cgc_grade,
            grading_company,
            certification_number,
            images,
            listed_price,
            for_sale,
            for_auction,
            is_for_trade,
            offers_enabled,
            is_slab,
            variant_description,
            details,
            user_id,
            updated_at,
            profiles!inventory_items_user_id_fkey (
              username,
              city,
              is_verified_seller,
              completed_sales_count
            )
          )
        `)
        .eq("status", "active")
        .not("inventory_items.for_sale", "is", null)
        .order("created_at", { ascending: false })
        .limit(12);

      if (error) throw error;

      // Filter and flatten the data structure
      const filteredListings = (data || [])
        .filter(listing => {
          const item = Array.isArray(listing.inventory_items) 
            ? listing.inventory_items[0] 
            : listing.inventory_items;
          return item && item.for_sale === true;
        })
        .map(listing => {
          const item = Array.isArray(listing.inventory_items) 
            ? listing.inventory_items[0] 
            : listing.inventory_items;
          return {
            listing_id: listing.id,
            ...item
          };
        });

      setListings(filteredListings);
    } catch (error) {
      console.error("Error fetching featured grails:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <section className="py-6 px-4 bg-gradient-to-b from-primary/5 to-background">
        <div className="container mx-auto max-w-6xl">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg sm:text-2xl md:text-3xl lg:text-4xl font-black text-center text-primary">
              ✨ Featured Grails — Buy It Now
            </h2>
          </div>
          <div className="overflow-x-auto pb-4 -mx-4 px-4">
            <div className="flex gap-4 min-w-min">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="w-[280px] sm:w-64 h-[420px] flex-shrink-0 bg-muted animate-pulse rounded-lg" />
              ))}
            </div>
          </div>
        </div>
      </section>
    );
  }

  if (listings.length === 0) {
    return (
      <section className="py-12 px-4 bg-gradient-to-b from-primary/5 to-background">
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
    <section className="py-6 px-4 bg-gradient-to-b from-primary/5 to-background">
      <div className="container mx-auto max-w-6xl">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg sm:text-2xl md:text-3xl lg:text-4xl font-black text-primary">
            ✨ Featured Grails — Buy It Now
          </h2>
        </div>
        
        {/* Desktop: Grid */}
        <div className="hidden md:grid md:grid-cols-3 lg:grid-cols-4 gap-4 mb-4">
          {listings.slice(0, 8).map((listing) => {
            const price = resolvePrice(listing);
            const profile = Array.isArray(listing.profiles) ? listing.profiles[0] : listing.profiles;
            return (
              <ItemCard
                key={listing.listing_id}
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
                sellerCity={profile?.city}
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
            );
          })}
        </div>

        {/* Mobile: Horizontal Scroll */}
        <div className="md:hidden overflow-x-auto overflow-y-visible pb-4 -mx-4 px-4 scrollbar-hide snap-x snap-mandatory">
          <div className="flex gap-3 min-w-min">
            {listings.map((listing) => {
              const price = resolvePrice(listing);
              const profile = Array.isArray(listing.profiles) ? listing.profiles[0] : listing.profiles;
              return (
                <div key={listing.listing_id} className="w-[280px] flex-shrink-0 snap-center">
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
                    sellerCity={profile?.city}
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
