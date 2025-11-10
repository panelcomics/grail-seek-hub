import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import ItemCard from "@/components/ItemCard";
import { Button } from "@/components/ui/button";
import { Heart, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

interface FavoriteItem {
  id: string;
  listing_id: string;
  created_at: string;
  claim_sale_items?: {
    id: string;
    title: string;
    image_url: string | null;
    condition: string;
    category: string;
    city: string | null;
    state: string | null;
    claim_sale_id: string;
    claim_sales?: {
      price: number;
      seller_id: string;
      profiles?: {
        username: string;
      };
    };
  };
}

export default function Watchlist() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [favorites, setFavorites] = useState<FavoriteItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      navigate("/auth");
      return;
    }

    fetchFavorites();
    subscribeToFavorites();
  }, [user]);

  const fetchFavorites = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from("favorites")
        .select(`
          id,
          listing_id,
          created_at
        `)
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Fetch claim sale items separately
      const listingIds = data?.map(f => f.listing_id) || [];
      if (listingIds.length === 0) {
        setFavorites([]);
        setLoading(false);
        return;
      }

      const { data: items, error: itemsError } = await supabase
        .from("claim_sale_items")
        .select(`
          id,
          title,
          image_url,
          condition,
          category,
          city,
          state,
          claim_sale_id,
          claim_sales (
            price,
            seller_id,
            profiles!claim_sales_seller_id_fkey (
              username,
              seller_tier
            )
          )
        `)
        .in("id", listingIds);

      if (itemsError) throw itemsError;

      // Merge the data
      const merged = data.map(fav => ({
        ...fav,
        claim_sale_items: items?.find(item => item.id === fav.listing_id)
      }));

      setFavorites(merged as any);
    } catch (error) {
      console.error("Error fetching favorites:", error);
      toast.error("Failed to load watchlist");
    } finally {
      setLoading(false);
    }
  };

  const subscribeToFavorites = () => {
    if (!user) return;

    const channel = supabase
      .channel("user-favorites")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "favorites",
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          fetchFavorites();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const removeFavorite = async (favoriteId: string) => {
    try {
      const { error } = await supabase
        .from("favorites")
        .delete()
        .eq("id", favoriteId);

      if (error) throw error;
      toast.success("Removed from watchlist");
    } catch (error) {
      console.error("Error removing favorite:", error);
      toast.error("Failed to remove from watchlist");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto px-4 py-12 text-center">
          <p className="text-muted-foreground">Loading your watchlist...</p>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-4 py-12">
        <div className="mb-8">
          <h1 className="text-4xl font-bold flex items-center gap-3">
            <Heart className="h-10 w-10 text-primary" />
            My Watchlist
          </h1>
          <p className="text-muted-foreground mt-2">
            {favorites.length} {favorites.length === 1 ? "item" : "items"} saved
          </p>
        </div>

        {favorites.length === 0 ? (
          <div className="text-center py-20">
            <Heart className="h-20 w-20 mx-auto text-muted-foreground mb-4" />
            <h2 className="text-2xl font-semibold mb-2">Your watchlist is empty</h2>
            <p className="text-muted-foreground mb-6">
              Start adding items to your watchlist by clicking the heart icon on listings
            </p>
            <Button onClick={() => navigate("/")} variant="default">
              Browse Listings
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {favorites.map((favorite) => {
              const item = favorite.claim_sale_items;
              if (!item) return null;

              const sale = Array.isArray(item.claim_sales) 
                ? item.claim_sales[0] 
                : item.claim_sales;

              const seller = sale?.profiles 
                ? (Array.isArray(sale.profiles) ? sale.profiles[0] : sale.profiles)
                : null;

              return (
                <div key={favorite.id} className="relative">
                  <ItemCard
                    id={item.id}
                    title={item.title}
                    price={sale?.price || 0}
                    image={item.image_url || "/placeholder.svg"}
                    condition={item.condition}
                    location={item.city && item.state ? `${item.city}, ${item.state}` : undefined}
                    sellerName={seller?.username}
                    sellerCity={item.city || undefined}
                    sellerBadge={seller?.seller_tier}
                    category={item.category === "comic" || item.category === "card" ? item.category : "comic"}
                    isClaimSale={true}
                    claimSaleId={item.claim_sale_id}
                  />
                  <Button
                    variant="destructive"
                    size="sm"
                    className="absolute top-4 right-4 gap-2 z-10"
                    onClick={() => removeFavorite(favorite.id)}
                    aria-label="Remove from watchlist"
                  >
                    <Trash2 className="h-4 w-4" />
                    Remove
                  </Button>
                </div>
              );
            })}
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}
