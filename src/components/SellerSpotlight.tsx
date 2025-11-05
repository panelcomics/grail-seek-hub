import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Star, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { SellerBadge } from "@/components/SellerBadge";
import { SellerStats } from "@/components/SellerStats";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import { supabase } from "@/integrations/supabase/client";

interface Seller {
  user_id: string;
  username: string;
  avatar_url: string | null;
  completed_sales_count: number;
  seller_tier?: string;
  favorites_total?: number;
}

export default function SellerSpotlight() {
  const [sellers, setSellers] = useState<Seller[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchFeaturedSellers();
  }, []);

  const fetchFeaturedSellers = async () => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("user_id, username, avatar_url, completed_sales_count, seller_tier, favorites_total")
        .not("username", "is", null)
        .order("completed_sales_count", { ascending: false })
        .limit(4);

      if (error) throw error;
      setSellers(data || []);
    } catch (error) {
      console.error("Error fetching featured sellers:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const getSellerSlug = (username: string) => {
    return username.toLowerCase().replace(/\s+/g, "-").replace(/'/g, "");
  };

  if (isLoading || sellers.length === 0) {
    return null;
  }

  return (
    <section className="bg-muted/30 py-20 comic-texture">
      <div className="container">
        <div className="flex items-center justify-between mb-10">
          <div>
            <h2>Seller Spotlight</h2>
            <p className="text-muted-foreground mt-2">Featured trusted sellers with top-rated collections</p>
          </div>
          
          <Link to="/sellers">
            <Button variant="link" className="gap-1 text-primary hover:text-primary/80">
              View All Sellers →
            </Button>
          </Link>
        </div>

        {/* Desktop Grid */}
        <div className="hidden md:grid md:grid-cols-3 lg:grid-cols-4 gap-6">
          {sellers.map((seller) => (
            <SellerCard key={seller.user_id} seller={seller} getSellerSlug={getSellerSlug} />
          ))}
        </div>

        {/* Mobile Carousel */}
        <div className="md:hidden">
          <Carousel
            opts={{
              align: "start",
              loop: true,
            }}
            className="w-full"
          >
            <CarouselContent>
              {sellers.map((seller) => (
                <CarouselItem key={seller.user_id} className="basis-full sm:basis-1/2">
                  <SellerCard seller={seller} getSellerSlug={getSellerSlug} />
                </CarouselItem>
              ))}
            </CarouselContent>
            <CarouselPrevious />
            <CarouselNext />
          </Carousel>
        </div>
      </div>
    </section>
  );
}

interface SellerCardProps {
  seller: Seller;
  getSellerSlug: (username: string) => string;
}

function SellerCard({ seller, getSellerSlug }: SellerCardProps) {
  const slug = getSellerSlug(seller.username || "");
  const rating = "5.0"; // Default rating since we don't have seller_rating field yet
  const location = "United States"; // Default location since we don't have location fields yet

  return (
    <div className="bg-card rounded-lg border p-6 transition-all duration-300 hover:-translate-y-2 hover:shadow-xl group">
      <div className="flex flex-col items-center text-center">
        {/* Avatar with Glow Effect */}
        <div className="relative mb-4 transition-all duration-300 group-hover:scale-105">
          <div className="absolute inset-0 rounded-full bg-primary/20 blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          <Avatar className="w-20 h-20 ring-4 ring-primary/20 group-hover:ring-primary/40 transition-all relative z-10">
            <AvatarImage src={seller.avatar_url || undefined} alt={seller.username || "Seller"} />
            <AvatarFallback className="bg-gradient-to-br from-primary/20 to-accent/20 text-lg font-bold">
              {seller.username?.[0]?.toUpperCase() || "S"}
            </AvatarFallback>
          </Avatar>
        </div>

        {/* Seller Info */}
        <h3 className="font-bold text-lg mb-2 line-clamp-1">{seller.username || "Unknown Seller"}</h3>
        
        <div className="flex flex-col items-center gap-2 mb-6">
          <SellerStats
            rating={parseFloat(rating)}
            salesCount={seller.completed_sales_count}
            favoritesTotal={seller.favorites_total}
            className="justify-center"
          />
          <SellerBadge tier={seller.seller_tier || null} />
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col gap-2 w-full">
          <Link to={`/seller/${slug}`} className="w-full">
            <Button size="sm" className="w-full bg-primary text-primary-foreground hover:bg-primary/90 transition-all hover:shadow-md hover:-translate-y-0.5">
              View Shop
            </Button>
          </Link>
          <Button size="sm" variant="outline" className="w-full border-primary text-primary hover:bg-primary/5 transition-all hover:shadow-sm hover:-translate-y-0.5">
            Follow
          </Button>
        </div>
      </div>
    </div>
  );
}
