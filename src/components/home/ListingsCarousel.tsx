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
  filterType: "newly-listed" | "ending-soon" | "hot-week" | "local" | "recommended";
  showViewAll?: boolean;
}

export function ListingsCarousel({ title, filterType, showViewAll = true }: ListingsCarouselProps) {
  const [listings, setListings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchListings();
  }, [filterType]);

  const fetchListings = async () => {
    try {
      let query = supabase
        .from("inventory_items")
        .select("*")
        .or("for_sale.eq.true,for_auction.eq.true,is_for_trade.eq.true")
        .in("listing_status", ["active", "listed"])
        .limit(10);

      if (filterType === "newly-listed") {
        query = query.order("created_at", { ascending: false });
      } else if (filterType === "ending-soon") {
        query = query.eq("for_auction", true).order("created_at", { ascending: true });
      } else if (filterType === "hot-week") {
        query = query.eq("is_featured", true);
      }

      const { data, error } = await query;

      if (error) throw error;
      setListings(data || []);
    } catch (error) {
      console.error("Error fetching listings:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="py-6 md:py-8 px-4">
      <div className="container mx-auto">
        <div className="flex justify-between items-center mb-5 md:mb-6">
          <h2 className="text-2xl sm:text-3xl font-bold">{title}</h2>
          {showViewAll && (
            <Button variant="ghost" className="font-bold text-sm md:text-base">
              SORT <ChevronRight className="h-4 w-4 md:h-5 md:w-5 ml-1" />
            </Button>
          )}
        </div>
        <div className="overflow-x-auto pb-4 scrollbar-hide snap-x snap-mandatory">
          <div className="flex gap-3 md:gap-4 min-w-min">
            {listings.map((listing) => {
              const price = resolvePrice(listing);
              return (
                <div key={listing.id} className="w-56 sm:w-64 flex-shrink-0 snap-center">
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
