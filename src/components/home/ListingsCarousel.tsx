import { useEffect, useState } from "react";
import { ChevronRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import ItemCard from "@/components/ItemCard";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";

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

  if (loading) {
    return (
      <section className="py-8 px-4">
        <div className="container mx-auto">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-3xl font-bold">{title}</h2>
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

  return (
    <section className="py-8 px-4">
      <div className="container mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-3xl font-bold">{title}</h2>
          {showViewAll && (
            <Button variant="ghost" className="font-bold">
              SORT <ChevronRight className="h-5 w-5 ml-1" />
            </Button>
          )}
        </div>
        <div className="overflow-x-auto pb-4">
          <div className="flex gap-4 min-w-min">
            {listings.map((listing) => (
              <div key={listing.id} className="w-64 flex-shrink-0">
                <ItemCard
                  id={listing.id}
                  title={listing.title || listing.series || "Untitled"}
                  price={(listing.price_cents || 0) / 100}
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
