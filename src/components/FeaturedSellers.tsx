import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Star } from "lucide-react";
import { FeaturedSellerBadge } from "./FeaturedSellerBadge";
import { VerifiedSellerBadge } from "./VerifiedSellerBadge";

interface FeaturedSeller {
  user_id: string;
  username: string | null;
  profile_image_url: string | null;
  bio: string | null;
  is_verified_seller: boolean;
  followers_count?: number;
}

export function FeaturedSellers() {
  const [sellers, setSellers] = useState<FeaturedSeller[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchFeaturedSellers();
  }, []);

  const fetchFeaturedSellers = async () => {
    try {
      const { data, error } = await supabase
        .from("public_profiles")
        .select("*")
        .eq("is_featured_seller", true)
        .limit(10);

      if (error) throw error;
      setSellers(data || []);
    } catch (error) {
      console.error("Error fetching featured sellers:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (sellers.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Star className="h-5 w-5 text-purple-500" />
          Featured Sellers
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {sellers.map((seller) => (
            <Link
              key={seller.user_id}
              to={`/seller/${seller.username || seller.user_id}`}
              className="block"
            >
              <Card className="hover:shadow-lg transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <Avatar className="h-12 w-12">
                      <AvatarImage src={seller.profile_image_url || undefined} />
                      <AvatarFallback>
                        {(seller.username || "U")[0].toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-semibold truncate">
                          {seller.username || "Unnamed Seller"}
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-1 mb-2">
                        <FeaturedSellerBadge showLabel={false} />
                        {seller.is_verified_seller && (
                          <VerifiedSellerBadge showLabel={false} />
                        )}
                      </div>
                      {seller.bio && (
                        <p className="text-xs text-muted-foreground line-clamp-2">
                          {seller.bio}
                        </p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
