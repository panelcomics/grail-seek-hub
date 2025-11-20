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

  if (loading || listings.length === 0) {
    return null;
  }

  const currentListing = listings[currentIndex];

  return (
    <div className="relative h-64 bg-secondary/10 rounded-lg overflow-hidden border-2 border-border mb-6">
      <div className="absolute inset-0 flex items-center justify-between px-4 z-10">
        <Button
          variant="secondary"
          size="icon"
          onClick={() => setCurrentIndex((prev) => (prev - 1 + listings.length) % listings.length)}
        >
          <ChevronLeft className="h-6 w-6" />
        </Button>
        <Button
          variant="secondary"
          size="icon"
          onClick={() => setCurrentIndex((prev) => (prev + 1) % listings.length)}
        >
          <ChevronRight className="h-6 w-6" />
        </Button>
      </div>
      
      <div className="absolute inset-0 flex items-center justify-center">
        {getImageUrl(currentListing) && (
          <img
            src={getImageUrl(currentListing)}
            alt={currentListing.title || "Hot Auction"}
            className="max-h-full max-w-full object-contain"
          />
        )}
      </div>
      
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4">
        <p className="text-white font-bold">{currentListing.title}</p>
        {currentListing.listed_price && (
          <p className="text-white/90">${(currentListing.listed_price / 100).toFixed(2)}</p>
        )}
      </div>
      
      <div className="absolute top-4 right-4 flex gap-1">
        {listings.map((_, i) => (
          <div
            key={i}
            className={`w-2 h-2 rounded-full ${i === currentIndex ? "bg-primary" : "bg-white/50"}`}
          />
        ))}
      </div>
    </div>
  );
}
