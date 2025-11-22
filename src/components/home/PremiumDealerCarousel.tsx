import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import ItemCard from "@/components/ItemCard";
import { Skeleton } from "@/components/ui/skeleton";
import { SellerBadge } from "@/components/SellerBadge";
import { VerifiedSellerBadge } from "@/components/VerifiedSellerBadge";
import { ChevronRight } from "lucide-react";
import { resolvePrice } from "@/lib/listingPriceUtils";
import { getSellerSlug, getListingImageUrl } from "@/lib/sellerUtils";

interface PremiumDealerCarouselProps {
  sellerName: string;
}

export function PremiumDealerCarousel({ sellerName }: PremiumDealerCarouselProps) {
  const [listings, setListings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [sellerProfile, setSellerProfile] = useState<any>(null);

  useEffect(() => {
    fetchSellerAndListings();
  }, [sellerName]);

  const fetchSellerAndListings = async () => {
    try {
      // Find seller by username or display name
      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("user_id, username, display_name, seller_tier, avatar_url, completed_sales_count")
        .or(`username.ilike.%${sellerName}%,display_name.ilike.%${sellerName}%`)
        .maybeSingle();

      if (profileError || !profileData) {
        console.error("Premium dealer not found:", sellerName);
        setLoading(false);
        return;
      }

      // Verify or set as premium tier
      if (profileData.seller_tier !== 'premium') {
        console.warn(`Seller ${sellerName} is not marked as premium tier, displaying anyway`);
      }

      setSellerProfile(profileData);

      // Fetch active listings from this seller
      const { data: listingsData, error: listingsError } = await supabase
        .from("inventory_items")
        .select("*")
        .eq("user_id", profileData.user_id)
        .in("listing_status", ["active", "listed"])
        .or("for_sale.eq.true,for_auction.eq.true,is_for_trade.eq.true")
        .limit(10)
        .order("created_at", { ascending: false });

      if (listingsError) throw listingsError;
      setListings(listingsData || []);
    } catch (error) {
      console.error("Error fetching premium dealer listings:", error);
    } finally {
      setLoading(false);
    }
  };

  // Don't render if no listings
  if (!loading && listings.length === 0) {
    return null;
  }

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

  return (
    <section className="py-4 md:py-8 bg-gradient-to-b from-red-950/10 to-background border-y border-red-500/20">
      <div className="container mx-auto px-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 md:gap-4 mb-4 md:mb-6">
          <div className="flex items-center gap-2 md:gap-3 flex-wrap">
            <h2 className="text-xl sm:text-2xl md:text-3xl font-bold">
              Featured Shop: {sellerProfile?.display_name || sellerProfile?.username || sellerName}
            </h2>
            <div className="flex items-center gap-1.5 md:gap-2 flex-wrap">
              <SellerBadge tier={sellerProfile?.seller_tier || "premium"} />
              <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full font-semibold">Premium Dealer</span>
              <VerifiedSellerBadge salesCount={sellerProfile?.completed_sales_count || 0} size="sm" />
            </div>
          </div>
          <a 
            href={`/seller/${getSellerSlug(sellerProfile || { username: sellerName })}`}
            className="flex items-center gap-1 text-primary hover:text-primary/80 font-bold whitespace-nowrap text-sm md:text-base"
          >
            View Shop <ChevronRight className="h-4 w-4 md:h-5 md:w-5" />
          </a>
        </div>
      </div>
      <div className="overflow-x-auto overflow-y-visible pb-4 scrollbar-hide snap-x snap-mandatory">
        <div className="flex gap-3 md:gap-4 px-4 min-w-min">
          {listings.slice(0, 6).map((listing) => {
            const price = resolvePrice(listing);
            return (
              <div key={listing.id} className="w-[280px] sm:w-64 flex-shrink-0 snap-center">
                <ItemCard
                  id={listing.id}
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
    </section>
  );
}
