import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Clock } from "lucide-react";
import { Link } from "react-router-dom";

interface FomoAuction {
  id: string;
  title: string;
  image_url: string;
  ends_at: string;
  current_bid: number;
}

export function FomoAuctionBlock() {
  const [auctions, setAuctions] = useState<FomoAuction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchFeaturedAuctions();
  }, []);

  const fetchFeaturedAuctions = async () => {
    try {
      // Fetch featured active auctions
      const { data: auctionData, error } = await supabase
        .from("listings")
        .select("id, title, image_url, ends_at")
        .eq("type", "auction")
        .eq("status", "active")
        .not("ends_at", "is", null)
        .order("ends_at", { ascending: true })
        .limit(4);

      if (error) throw error;

      if (!auctionData || auctionData.length === 0) {
        // Use placeholder data if no featured auctions
        setAuctions([
          {
            id: "placeholder-1",
            title: "ASM #129 CGC 9.6",
            image_url: "/covers/sample-asm.jpg",
            ends_at: new Date(Date.now() + 6120000).toISOString(), // 1h 42m from now
            current_bid: 8200
          },
          {
            id: "placeholder-2",
            title: "Hulk #181 CGC 9.4",
            image_url: "/covers/sample-hulk.jpg",
            ends_at: new Date(Date.now() + 10800000).toISOString(), // 3h from now
            current_bid: 12350
          },
          {
            id: "placeholder-3",
            title: "X-Men #1 CGC 9.2",
            image_url: "/covers/sample-xmen.jpg",
            ends_at: new Date(Date.now() + 18000000).toISOString(), // 5h from now
            current_bid: 4850
          },
          {
            id: "placeholder-4",
            title: "Spawn #1 CGC 9.8",
            image_url: "/covers/sample-spawn.jpg",
            ends_at: new Date(Date.now() + 25200000).toISOString(), // 7h from now
            current_bid: 2200
          }
        ]);
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
            id: auction.id,
            title: auction.title,
            image_url: auction.image_url || "/placeholder.svg",
            ends_at: auction.ends_at,
            current_bid: bidData?.bid_amount || 0
          };
        })
      );

      setAuctions(auctionsWithBids);
    } catch (error) {
      console.error("Error fetching featured auctions:", error);
      // Fallback to placeholder data on error
      setAuctions([
        {
          id: "placeholder-1",
          title: "ASM #129 CGC 9.6",
          image_url: "/covers/sample-asm.jpg",
          ends_at: new Date(Date.now() + 6120000).toISOString(),
          current_bid: 8200
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const getTimeRemaining = (endsAt: string) => {
    const now = new Date().getTime();
    const end = new Date(endsAt).getTime();
    const diff = end - now;

    if (diff <= 0) return "Ended";

    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    if (hours > 0) {
      return `${hours}h ${minutes}m left`;
    }
    return `${minutes}m left`;
  };

  if (loading || auctions.length === 0) {
    return null;
  }

  return (
    <div className="w-full py-4 px-4 sm:px-0 bg-gradient-to-r from-red-50 via-orange-50 to-red-50 border-y border-red-200/40">
      <div className="flex items-center gap-2 mb-3">
        <div className="relative">
          <div className="h-2.5 w-2.5 bg-red-500 rounded-full animate-pulse" />
          <div className="absolute inset-0 h-2.5 w-2.5 bg-red-500 rounded-full animate-ping opacity-75" />
        </div>
        <h3 className="text-sm sm:text-base font-black text-foreground uppercase tracking-tight">
          🔥 Hot Auctions Ending Soon
        </h3>
      </div>
      
      <div className="overflow-x-auto overflow-y-visible -mx-4 px-4 sm:mx-0 sm:px-0 scrollbar-hide">
        <div className="flex gap-3 min-w-min pb-2">
          {auctions.map((auction, index) => (
            <Link 
              key={auction.id} 
              to={auction.id.startsWith('placeholder') ? '/marketplace' : `/listing/${auction.id}`}
              className="group flex-shrink-0"
            >
              <Card className="w-[160px] sm:w-[180px] overflow-hidden border border-border/60 hover:border-primary/40 hover:shadow-lg transition-all duration-300 hover:-translate-y-0.5 bg-background">
                <div className="relative aspect-[2/3] overflow-hidden bg-muted">
                  <img
                    src={auction.image_url}
                    alt={auction.title}
                    className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300"
                    loading="lazy"
                  />
                  <div className="absolute top-1.5 right-1.5 bg-red-500 text-white px-1.5 py-0.5 rounded text-[10px] font-bold flex items-center gap-0.5">
                    <Clock className="h-2.5 w-2.5" />
                    LIVE
                  </div>
                </div>
                <div className="p-2.5 space-y-1.5">
                  <h4 className="font-bold text-xs leading-tight line-clamp-2 min-h-[2rem]">
                    {auction.title}
                  </h4>
                  <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                    <span className="flex items-center gap-0.5">
                      <Clock className="h-2.5 w-2.5" />
                      {getTimeRemaining(auction.ends_at)}
                    </span>
                  </div>
                  <div className="pt-1 border-t border-border/40">
                    <div className="text-[10px] text-muted-foreground mb-0.5">Current Bid</div>
                    <div className="text-base font-black text-[#E60000]">
                      ${auction.current_bid.toLocaleString()}
                    </div>
                  </div>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      </div>
      
      {/* Swipe indicator for mobile */}
      <div className="flex sm:hidden justify-center items-center gap-1 mt-2 text-[10px] text-muted-foreground">
        <div className="flex gap-0.5">
          {[...Array(Math.min(auctions.length, 4))].map((_, i) => (
            <div key={i} className="w-1 h-1 rounded-full bg-muted-foreground/30" />
          ))}
        </div>
        <span>Swipe to see more →</span>
      </div>
    </div>
  );
}