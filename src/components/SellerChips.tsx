import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Link, useNavigate } from "react-router-dom";
import { ChevronRight } from "lucide-react";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";

interface Seller {
  user_id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  profile_image_url: string | null;
  completed_sales_count: number;
}

export default function SellerChips() {
  const [sellers, setSellers] = useState<Seller[]>([]);
  const [selectedSeller, setSelectedSeller] = useState<string>("all");
  const navigate = useNavigate();

  useEffect(() => {
    fetchTopSellers();
  }, []);

  const fetchTopSellers = async () => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("user_id, username, display_name, avatar_url, profile_image_url, completed_sales_count")
        .not("username", "is", null)
        .order("completed_sales_count", { ascending: false })
        .limit(12);

      if (error) throw error;
      setSellers(data || []);
    } catch (error) {
      console.error("Error fetching top sellers:", error);
    }
  };

  const handleSellerClick = (sellerId: string, username: string) => {
    if (sellerId === "all") {
      setSelectedSeller("all");
      // Could trigger a filter reset on the parent
    } else {
      const slug = username.toLowerCase().replace(/\s+/g, "-").replace(/'/g, "");
      navigate(`/seller/${slug}`);
    }
  };

  return (
    <div className="py-6 border-b border-border/50">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            Shop by Seller
          </h3>
          <Link to="/sellers">
            <Button variant="link" className="text-sm gap-1 p-0 h-auto">
              View all sellers
              <ChevronRight className="w-4 h-4" />
            </Button>
          </Link>
        </div>

        <ScrollArea className="w-full whitespace-nowrap">
          <div className="flex gap-3 pb-4">
            {/* All Sellers chip */}
            <button
              onClick={() => handleSellerClick("all", "All Sellers")}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-full border transition-all ${
                selectedSeller === "all"
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-background border-border hover:border-primary/50"
              }`}
            >
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center">
                <span className="text-xs font-bold">All</span>
              </div>
              <span className="text-sm font-medium">All Sellers</span>
            </button>

            {/* Top sellers chips */}
            {sellers.map((seller) => {
              const displayName = seller.display_name || seller.username?.split('@')[0] || "Unknown Seller";
              const imageUrl = seller.profile_image_url || seller.avatar_url;
              return (
                <button
                  key={seller.user_id}
                  onClick={() => handleSellerClick(seller.user_id, seller.username || "")}
                  className={`inline-flex items-center gap-2 px-4 py-2 rounded-full border transition-all ${
                    selectedSeller === seller.user_id
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-background border-border hover:border-primary/50"
                  }`}
                >
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center overflow-hidden">
                    {imageUrl ? (
                      <img
                        src={imageUrl}
                        alt={displayName}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="text-xs font-bold text-primary">
                        {displayName[0]?.toUpperCase() || "S"}
                      </span>
                    )}
                  </div>
                  <span className="text-sm font-medium whitespace-nowrap">
                    {displayName}
                  </span>
                </button>
              );
            })}
          </div>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>
      </div>
    </div>
  );
}
