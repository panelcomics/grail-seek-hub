import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export function HotAuctionsCarousel() {
  const [listings, setListings] = useState<any[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchHotAuctions();
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % Math.max(listings.length, 1));
    }, 5000);
    return () => clearInterval(interval);
  }, [listings.length]);

  const fetchHotAuctions = async () => {
    try {
      const { data, error } = await supabase
        .from("inventory_items")
        .select("*")
        .eq("for_auction", true)
        .eq("is_featured", true)
        .limit(5);

      if (error) throw error;
      setListings(data || []);
    } catch (error) {
      console.error("Error fetching hot auctions:", error);
    } finally {
      setLoading(false);
    }
  };

  const getImageUrl = (item: any) => {
    if (item.images && Array.isArray(item.images) && item.images.length > 0) {
      return item.images[0];
    }
    return null;
  };

  if (loading) {
    return (
      <div className="relative h-40 sm:h-48 md:h-64 bg-muted animate-pulse rounded-lg border-2 border-border mb-4 md:mb-6" />
    );
  }

  if (listings.length === 0) {
    return (
      <div className="relative h-40 sm:h-48 md:h-64 bg-secondary/10 rounded-lg overflow-hidden border-2 border-border mb-4 md:mb-6">
        <div className="absolute inset-0 flex flex-col items-center justify-center p-4 sm:p-6 text-center">
          <p className="text-base sm:text-lg font-bold mb-2">Sample Live Auction</p>
          <p className="text-xs sm:text-sm text-muted-foreground mb-3 sm:mb-4">
            ASM #300 (CGC 9.6) — Live auctions launching soon. Be one of the first to list!
          </p>
          <Button onClick={() => window.location.href = '/marketplace'} className="min-h-[44px]">
            See Marketplace
          </Button>
        </div>
      </div>
    );
  }

  const currentListing = listings[currentIndex];

  return (
    <div className="relative h-40 sm:h-48 md:h-64 bg-secondary/10 rounded-lg overflow-hidden border-2 border-border mb-4 md:mb-6">
      <div className="absolute inset-0 flex items-center justify-between px-2 sm:px-3 md:px-4 z-10">
        <Button
          variant="secondary"
          size="icon"
          className="h-8 w-8 sm:h-9 sm:w-9 md:h-10 md:w-10 min-h-[44px] min-w-[44px] sm:min-h-0 sm:min-w-0"
          onClick={() => setCurrentIndex((prev) => (prev - 1 + listings.length) % listings.length)}
        >
          <ChevronLeft className="h-4 w-4 sm:h-5 sm:w-5 md:h-6 md:w-6" />
        </Button>
        <Button
          variant="secondary"
          size="icon"
          className="h-8 w-8 sm:h-9 sm:w-9 md:h-10 md:w-10 min-h-[44px] min-w-[44px] sm:min-h-0 sm:min-w-0"
          onClick={() => setCurrentIndex((prev) => (prev + 1) % listings.length)}
        >
          <ChevronRight className="h-4 w-4 sm:h-5 sm:w-5 md:h-6 md:w-6" />
        </Button>
      </div>
      
      <div className="absolute inset-0 flex items-center justify-center p-3 sm:p-4">
        {getImageUrl(currentListing) && (
          <img
            src={getImageUrl(currentListing)}
            alt={currentListing.title || "Hot Auction"}
            className="max-h-full max-w-full object-contain"
            loading="lazy"
          />
        )}
      </div>
      
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 to-transparent p-2 sm:p-3 md:p-4">
        <p className="text-white font-bold text-xs sm:text-sm md:text-base line-clamp-1">{currentListing.title}</p>
        {currentListing.listed_price && (
          <p className="text-white/90 text-sm sm:text-base md:text-lg font-bold">${currentListing.listed_price}</p>
        )}
      </div>
      
      <div className="absolute top-2 sm:top-3 md:top-4 right-2 sm:right-3 md:right-4 flex gap-1">
        {listings.map((_, i) => (
          <div
            key={i}
            className={`w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full ${i === currentIndex ? "bg-primary" : "bg-white/50"}`}
          />
        ))}
      </div>
    </div>
  );
}
