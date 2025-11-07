import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Star } from "lucide-react";
import { Link } from "react-router-dom";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";

interface FeaturedShop {
  id: string;
  seller_id: string;
  rank: number;
  profiles: {
    username: string;
    avatar_url: string | null;
  };
}

// Placeholder data for featured shops
const placeholderShops = [
  {
    id: "placeholder-1",
    seller_id: "placeholder-1",
    rank: 1,
    profiles: {
      username: "Kiss Komixx",
      avatar_url: null,
    },
    city: "Brooklyn, NY",
    rating: "4.9",
    sales: "243"
  },
  {
    id: "placeholder-2",
    seller_id: "placeholder-2",
    rank: 2,
    profiles: {
      username: "Panel Comics",
      avatar_url: null,
    },
    city: "Los Angeles, CA",
    rating: "4.8",
    sales: "187"
  },
  {
    id: "placeholder-3",
    seller_id: "placeholder-3",
    rank: 3,
    profiles: {
      username: "Emerald City Comics",
      avatar_url: null,
    },
    city: "Seattle, WA",
    rating: "4.9",
    sales: "156"
  },
  {
    id: "placeholder-4",
    seller_id: "placeholder-4",
    rank: 4,
    profiles: {
      username: "Golden Age Collectibles",
      avatar_url: null,
    },
    city: "Chicago, IL",
    rating: "5.0",
    sales: "312"
  },
];

export default function FeaturedShops() {
  const [shops, setShops] = useState<FeaturedShop[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchFeaturedShops();
  }, []);

  const fetchFeaturedShops = async () => {
    try {
      const { data: featuredData, error: featuredError } = await supabase
        .from("seller_featured")
        .select("id, seller_id, rank")
        .eq("active", true)
        .order("rank", { ascending: true })
        .limit(8);

      if (featuredError) throw featuredError;
      
      // If no featured shops in database, use placeholders
      if (!featuredData || featuredData.length === 0) {
        setShops(placeholderShops);
        setLoading(false);
        return;
      }

      const sellerIds = featuredData.map(f => f.seller_id);
      const { data: profilesData, error: profilesError } = await supabase
        .from("profiles")
        .select("user_id, username, avatar_url")
        .in("user_id", sellerIds);

      if (profilesError) throw profilesError;

      const shopsWithProfiles = featuredData.map(featured => {
        const profile = profilesData?.find(p => p.user_id === featured.seller_id);
        return {
          ...featured,
          profiles: {
            username: profile?.username || "Unknown Shop",
            avatar_url: profile?.avatar_url || null,
          }
        };
      });

      setShops(shopsWithProfiles);
    } catch (error) {
      console.error("Error fetching featured shops:", error);
      // Use placeholders on error
      setShops(placeholderShops);
    } finally {
      setLoading(false);
    }
  };

  if (loading || shops.length === 0) return null;

  return (
    <section className="py-12 bg-background/50">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-foreground">
            Featured Shops
          </h2>
          <Link to="/sellers">
            <Button variant="link" className="gap-1 text-primary hover:text-primary/80">
              View All Sellers →
            </Button>
          </Link>
        </div>
        
        {/* Desktop: Grid */}
        <div className="hidden md:grid md:grid-cols-4 gap-6">
          {shops.slice(0, 4).map((shop) => (
            <ShopTile key={shop.id} shop={shop} />
          ))}
        </div>

        {/* Mobile: Carousel */}
        <div className="md:hidden">
          <Carousel className="w-full">
            <CarouselContent>
              {shops.map((shop) => (
                <CarouselItem key={shop.id} className="basis-[85%]">
                  <ShopTile shop={shop} />
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

function ShopTile({ shop }: { shop: FeaturedShop | typeof placeholderShops[0] }) {
  const slug = shop.profiles.username?.toLowerCase().replace(/\s+/g, "-").replace(/'/g, "") || "seller";
  
  // Generate initials for avatar
  const initials = shop.profiles.username
    ?.split(" ")
    .map(word => word[0])
    .join("")
    .toUpperCase()
    .slice(0, 2) || "S";
  
  // Generate consistent color based on shop name
  const getShopColor = (name: string) => {
    const colors = [
      "from-red-500/20 to-orange-500/20 border-red-500/30",
      "from-blue-500/20 to-cyan-500/20 border-blue-500/30",
      "from-purple-500/20 to-pink-500/20 border-purple-500/30",
      "from-green-500/20 to-emerald-500/20 border-green-500/30",
      "from-amber-500/20 to-yellow-500/20 border-amber-500/30",
    ];
    const index = name.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0) % colors.length;
    return colors[index];
  };

  const city = "city" in shop ? shop.city : "New York, NY";
  const rating = "rating" in shop ? shop.rating : "4.9";
  const sales = "sales" in shop ? shop.sales : "156";
  
  return (
    <div className="comic-texture rounded-lg overflow-hidden border border-border/50 shadow-lg hover:shadow-xl transition-all duration-300 group">
      <div className="p-6 flex flex-col items-center text-center space-y-4">
        {/* Avatar */}
        <div className={`w-20 h-20 rounded-full bg-gradient-to-br ${getShopColor(shop.profiles.username || "")} flex items-center justify-center overflow-hidden border-2 group-hover:scale-105 transition-transform`}>
          {shop.profiles.avatar_url ? (
            <img 
              src={shop.profiles.avatar_url} 
              alt={shop.profiles.username || "Shop"} 
              className="w-full h-full object-cover"
            />
          ) : (
            <span className="text-2xl font-bold text-primary">
              {initials}
            </span>
          )}
        </div>

        {/* Shop Info */}
        <div>
          <h3 className="text-lg font-bold text-foreground mb-1">
            {shop.profiles.username || "Unknown Shop"}
          </h3>
          <p className="text-sm text-muted-foreground">{city}</p>
        </div>

        {/* Stats */}
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Star className="w-4 h-4 fill-yellow-500 text-yellow-500" />
          <span>{rating} • {sales} sales</span>
        </div>

        {/* CTA */}
        <Link to={`/seller/${slug}`} className="w-full">
          <Button 
            className="w-full bg-primary text-primary-foreground hover:bg-primary/90 transition-all hover:shadow-md hover:-translate-y-0.5"
          >
            Shop Now
          </Button>
        </Link>
      </div>
    </div>
  );
}
