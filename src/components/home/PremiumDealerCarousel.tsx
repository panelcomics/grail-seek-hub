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
        .eq("listing_status", "active")
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
    if (item.images && Array.isArray(item.images) && item.images.length > 0) {
      return item.images[0];
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
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-80 rounded-lg" />
            ))}
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="py-8 px-4 bg-gradient-to-b from-red-950/10 to-background border-y border-red-500/20">
      <div className="container mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <h2 className="text-3xl font-bold">Featured Shop: {sellerProfile?.display_name || sellerProfile?.username || sellerName}</h2>
            <SellerBadge tier="premium" />
          </div>
          <a 
            href={`/sellers/${sellerProfile?.username || sellerName.toLowerCase().replace(/\s+/g, '-')}`}
            className="flex items-center gap-1 text-primary hover:text-primary/80 font-bold"
          >
            View Shop <ChevronRight className="h-5 w-5" />
          </a>
        </div>
        <div className="overflow-x-auto pb-4">
          <div className="flex gap-4 min-w-min">
            {listings.map((listing) => (
              <div key={listing.id} className="w-64 flex-shrink-0 relative">
                <div className="absolute -top-2 -right-2 z-10 bg-red-600 text-white text-xs font-bold px-2 py-1 rounded-full shadow-lg">
                  0% FEES
                </div>
                <ItemCard
                  id={listing.id}
                  title={listing.title || listing.series || "Untitled"}
                  price={(listing.listed_price || 0) / 100}
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
