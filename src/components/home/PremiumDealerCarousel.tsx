import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import ItemCard from "@/components/ItemCard";
import { Skeleton } from "@/components/ui/skeleton";
import { SellerBadge } from "@/components/SellerBadge";
import { ChevronRight } from "lucide-react";

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
        .select("user_id, username, display_name, seller_tier, avatar_url")
        .or(`username.ilike.%${sellerName}%,display_name.ilike.%${sellerName}%`)
        .eq("seller_tier", "premium")
        .maybeSingle();

      if (profileError || !profileData) {
        console.error("Premium dealer not found:", sellerName);
        setLoading(false);
        return;
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

  const getImageUrl = (item: any) => {
    // Priority: front (user photo) > comicvine_reference > placeholder
    if (item.images) {
      if (typeof item.images === 'object') {
        if (item.images.front) {
          return item.images.front;
        }
        if (item.images.comicvine_reference) {
          return item.images.comicvine_reference;
        }
      } else if (Array.isArray(item.images) && item.images.length > 0) {
        return item.images[0];
      }
    }
    return "/placeholder.svg";
  };

  // Don't render if no listings
  if (!loading && listings.length === 0) {
    return null;
  }

  if (loading) {
    return (
      <section className="py-8 px-4 bg-background/30 border-y border-red-500/20">
        <div className="container mx-auto">
          <div className="flex items-center gap-3 mb-6">
            <Skeleton className="h-8 w-48" />
          </div>
          <div className="overflow-x-auto pb-4 -mx-4 px-4 sm:mx-0 sm:px-0">
            <div className="flex gap-4 min-w-min">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="w-64 h-80 rounded-lg flex-shrink-0" />
              ))}
            </div>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="py-8 px-4 bg-gradient-to-b from-red-950/10 to-background border-y border-red-500/20 block">
      <div className="container mx-auto">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-3 flex-wrap">
            <h2 className="text-2xl sm:text-3xl font-bold">Featured Shop: {sellerProfile?.display_name || sellerProfile?.username || sellerName}</h2>
            <SellerBadge tier="premium" />
          </div>
          <a 
            href={`/seller/${encodeURIComponent(sellerProfile?.username || sellerName.toLowerCase().replace(/\s+/g, '-'))}`}
            className="flex items-center gap-1 text-primary hover:text-primary/80 font-bold whitespace-nowrap"
          >
            View Shop <ChevronRight className="h-5 w-5" />
          </a>
        </div>
        <div className="overflow-x-auto pb-4 -mx-4 px-4 sm:mx-0 sm:px-0">
          <div className="flex gap-4 min-w-min">
            {listings.map((listing) => (
              <div key={listing.id} className="w-64 flex-shrink-0">
                <ItemCard
                  id={listing.id}
                  title={listing.title || listing.series || "Untitled"}
                  price={listing.listed_price ? listing.listed_price / 100 : 0}
                  condition={listing.condition || "Unknown"}
                  image={getImageUrl(listing)}
                  category="comic"
                  isAuction={listing.for_auction}
                  showMakeOffer={listing.offers_enabled}
                  showTradeBadge={listing.is_for_trade}
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
