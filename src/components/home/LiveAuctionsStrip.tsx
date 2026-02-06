import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Eye, Clock } from "lucide-react";
import { Link } from "react-router-dom";
import { resolvePrice } from "@/lib/listingPriceUtils";

export function LiveAuctionsStrip() {
  const [auctions, setAuctions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLiveAuctions();
  }, []);

  const fetchLiveAuctions = async () => {
    try {
      // Fetch active auctions
      const { data: auctionData, error: auctionError } = await supabase
        .from("listings")
        .select("id, title, image_url, ends_at, type, status, price_cents, start_bid, user_id, created_at")
        .eq("type", "auction")
        .eq("status", "active")
        .not("ends_at", "is", null)
        .order("ends_at", { ascending: true })
        .limit(5);

      if (auctionError) throw auctionError;

      if (!auctionData || auctionData.length === 0) {
        setAuctions([]);
        setLoading(false);
        return;
      }

      // Fetch highest bid for each auction
      const auctionsWithBids = await Promise.all(
        auctionData.map(async (auction) => {
          const { data: bidData } = await supabase
            .from("bids")
            .select("bid_amount")
            .eq("listing_id", auction.id)
            .order("bid_amount", { ascending: false })
            .limit(1)
            .maybeSingle();

          return {
            ...auction,
            highest_bid_amount: bidData?.bid_amount || null,
          };
        })
      );

      setAuctions(auctionsWithBids);
    } catch (error) {
      console.error("Error fetching live auctions:", error);
    } finally {
      setLoading(false);
    }
  };

  const getImageUrl = (listing: any) => {
    if (listing.image_url) return listing.image_url;
    return "/placeholder.svg";
  };

  if (loading) {
    return (
      <section className="py-6 px-4 bg-gradient-to-r from-primary/10 via-primary/5 to-primary/10 border-y-2 border-primary/20">
        <div className="container mx-auto">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Skeleton className="h-6 w-6 rounded-full animate-pulse" />
              <Skeleton className="h-8 w-48" />
            </div>
          </div>
          <div className="overflow-x-auto pb-4 -mx-4 px-4">
            <div className="flex gap-4 min-w-min">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="w-48 h-72 rounded-lg flex-shrink-0" />
              ))}
            </div>
          </div>
        </div>
      </section>
    );
  }

  if (auctions.length === 0) {
    return null;
  }

  return (
    <section className="py-6 px-4 bg-gradient-to-r from-primary/10 via-primary/5 to-primary/10 border-y-2 border-primary/20">
      <div className="container mx-auto">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="relative">
              <div className="h-3 w-3 bg-red-500 rounded-full animate-pulse" />
              <div className="absolute inset-0 h-3 w-3 bg-red-500 rounded-full animate-ping" />
            </div>
            <h2 className="text-2xl md:text-3xl font-black text-foreground">
              Live Auctions — Ending Soon
            </h2>
          </div>
        </div>
        <div className="overflow-x-auto overflow-y-visible pb-4 -mx-4 px-4 sm:mx-0 sm:px-0 scrollbar-hide snap-x snap-mandatory">
          <div className="flex gap-3 md:gap-4 min-w-min">
            {auctions.map((auction) => (
              <Link key={auction.id} to={`/listing/${auction.id}`} className="flex-shrink-0 snap-center">
                <Card className="w-48 sm:w-56 overflow-hidden hover:shadow-xl transition-all duration-300 hover:-translate-y-1 cursor-pointer border-2 border-primary/20">
                  <div className="relative aspect-[2/3] overflow-hidden bg-muted">
                    <img
                      src={getImageUrl(auction)}
                      alt={auction.title}
                      className="h-full w-full object-cover"
                      loading="lazy"
                    />
                    <div className="absolute top-2 left-2 bg-red-500 text-white px-2 py-1 rounded-full text-xs font-bold flex items-center gap-1 animate-pulse">
                      <Clock className="h-3 w-3" />
                      LIVE
                    </div>
                  </div>
                  <div className="p-3 space-y-2">
                    <h3 className="font-bold text-sm line-clamp-2 min-h-[2.5rem] leading-snug">
                      {auction.title}
                    </h3>
                    <div className="flex items-baseline justify-between">
                      <span className="text-xs text-muted-foreground">Current Bid</span>
                      <span className="text-base sm:text-lg font-black text-[#E60000]">
                        {(() => {
                          const price = resolvePrice(auction);
                          const currentBid = auction.highest_bid_amount || (price !== null ? price : 0);
                          return currentBid > 0 ? `$${currentBid.toFixed(2)}` : "No bids";
                        })()}
                      </span>
                    </div>
                    <Button size="sm" className="w-full font-bold text-xs" variant="default">
                      <Eye className="h-3 w-3 mr-1" />
                      View
                    </Button>
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
