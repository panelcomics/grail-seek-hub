import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Heart, Trash2, Loader2, Crown, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { useNavigate, Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { formatCents } from "@/lib/fees";
import { useEliteAccess } from "@/hooks/useEliteAccess";
import { Progress } from "@/components/ui/progress";

interface WatchlistItem {
  id: string;
  listing_id: string;
  created_at: string;
  listings: {
    id: string;
    title: string;
    price_cents: number | null;
    status: string;
    user_id: string;
    inventory_item_id: string | null;
    inventory_items: {
      id: string;
      title: string | null;
      series: string | null;
      issue_number: string | null;
      condition: string | null;
      grade: string | number | null;
      grading_company: string | null;
      is_slab: boolean | null;
      images: any;
    } | null;
    profiles?: {
      username: string | null;
      is_verified_seller: boolean | null;
    } | null;
  } | null;
}

export default function Watchlist() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [watchlist, setWatchlist] = useState<WatchlistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const { isElite, watchlistLimit, loading: eliteLoading } = useEliteAccess();

  useEffect(() => {
    if (!user) {
      navigate("/auth");
      return;
    }

    fetchWatchlist();
  }, [user]);

  const fetchWatchlist = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from("watchlist_items")
        .select(`
          id,
          listing_id,
          created_at,
          listings!inner (
            id,
            title,
            price_cents,
            status,
            user_id,
            inventory_item_id,
            inventory_items (
              id,
              title,
              series,
              issue_number,
              condition,
              grade,
              grading_company,
              is_slab,
              images
            )
          )
        `)
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Fetch seller profiles separately
      const listingsWithProfiles = await Promise.all(
        (data || []).map(async (item) => {
          if (!item.listings?.user_id) return item;
          
          const { data: profile } = await supabase
            .from("profiles")
            .select("username, is_verified_seller")
            .eq("user_id", item.listings.user_id)
            .maybeSingle();
          
          return {
            ...item,
            listings: {
              ...item.listings,
              profiles: profile,
            },
          };
        })
      );

      setWatchlist(listingsWithProfiles as WatchlistItem[]);
    } catch (error) {
      console.error("Error fetching watchlist:", error);
      toast.error("Failed to load watchlist");
    } finally {
      setLoading(false);
    }
  };

  const removeFromWatchlist = async (watchlistItemId: string) => {
    try {
      const { error } = await supabase
        .from("watchlist_items")
        .delete()
        .eq("id", watchlistItemId);

      if (error) throw error;
      
      setWatchlist(prev => prev.filter(item => item.id !== watchlistItemId));
      toast.success("Removed from watchlist");
    } catch (error) {
      console.error("Error removing from watchlist:", error);
      toast.error("Failed to remove from watchlist");
    }
  };

  const getListingImage = (listing: WatchlistItem['listings']) => {
    if (!listing?.inventory_items?.images) return "/placeholder.svg";
    
    const images = listing.inventory_items.images;
    if (typeof images === 'object' && images.primary) {
      return images.primary;
    }
    
    return "/placeholder.svg";
  };

  const getListingTitle = (listing: WatchlistItem['listings']) => {
    if (!listing) return "Untitled";
    
    const item = listing.inventory_items;
    if (!item) return listing.title || "Untitled";
    
    const parts = [];
    if (item.series) parts.push(item.series);
    if (item.issue_number) parts.push(`#${item.issue_number}`);
    
    return parts.length > 0 ? parts.join(" ") : (item.title || listing.title || "Untitled");
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-12 text-center">
        <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
        <p className="text-muted-foreground mt-4">Loading your watchlist...</p>
      </div>
    );
  }

  return (
    <main className="container mx-auto px-4 py-12">
      <div className="flex items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-4xl font-bold flex items-center gap-3">
            <Heart className="h-10 w-10 text-primary" />
            My Watchlist
          </h1>
          <p className="text-muted-foreground mt-2">
            {watchlist.length} {watchlist.length === 1 ? "item" : "items"} saved
          </p>
        </div>
        {isElite && (
          <div className="flex items-center gap-2 bg-primary/10 px-3 py-1.5 rounded-full">
            <Crown className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium text-primary">Elite</span>
          </div>
        )}
      </div>

      {/* Limit indicator for free users */}
      {!eliteLoading && !isElite && (
        <Card className="mb-6 border-primary/20 bg-gradient-to-r from-primary/5 to-transparent">
          <CardContent className="p-4">
            <div className="flex items-center justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <Sparkles className="h-4 w-4 text-primary" />
                  <span className="text-sm font-medium">
                    {watchlist.length} of {watchlistLimit} items used
                  </span>
                </div>
                <Progress 
                  value={(watchlist.length / watchlistLimit) * 100} 
                  className="h-2"
                />
              </div>
              <Button 
                size="sm" 
                onClick={() => navigate("/plans")}
                className="shrink-0"
              >
                <Crown className="h-4 w-4 mr-1" />
                Upgrade
              </Button>
            </div>
            {watchlist.length >= watchlistLimit && (
              <p className="text-xs text-muted-foreground mt-2">
                You've reached your limit. Upgrade to Elite for up to 500 watchlist items.
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {watchlist.length === 0 ? (
        <div className="text-center py-20">
          <Heart className="h-20 w-20 mx-auto text-muted-foreground mb-4" />
          <h2 className="text-2xl font-semibold mb-2">Your watchlist is empty</h2>
          <p className="text-muted-foreground mb-6">
            Start adding items to your watchlist by clicking the heart icon on listings
          </p>
          <Button onClick={() => navigate("/market")} variant="default">
            Browse Marketplace
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {watchlist.map((item) => {
            const listing = item.listings;
            if (!listing) return null;

            const inventoryItem = listing.inventory_items;
            const seller = listing.profiles;

            return (
              <Card key={item.id} className="group relative overflow-hidden hover:shadow-lg transition-shadow">
                <Link to={`/l/${listing.id}`}>
                  <div className="aspect-[3/4] overflow-hidden bg-muted">
                    <img
                      src={getListingImage(listing)}
                      alt={getListingTitle(listing)}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  </div>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <h3 className="font-semibold line-clamp-2 text-sm">
                        {getListingTitle(listing)}
                      </h3>
                    </div>
                    
                    {inventoryItem && (
                      <div className="flex flex-wrap gap-1 mb-2">
                        {inventoryItem.condition && (
                          <Badge variant="secondary" className="text-xs">
                            {inventoryItem.condition}
                          </Badge>
                        )}
                        {inventoryItem.is_slab && inventoryItem.grading_company && (
                          <Badge variant="secondary" className="text-xs">
                            {inventoryItem.grading_company} {inventoryItem.grade}
                          </Badge>
                        )}
                      </div>
                    )}

                    <div className="flex items-center justify-between">
                      <p className="text-lg font-bold text-primary">
                        {listing.price_cents ? formatCents(listing.price_cents) : "—"}
                      </p>
                      {seller?.is_verified_seller && (
                        <Badge variant="default" className="text-xs">
                          Verified
                        </Badge>
                      )}
                    </div>

                    {seller?.username && (
                      <p className="text-xs text-muted-foreground mt-1">
                        by {seller.username}
                      </p>
                    )}

                    {listing.status !== 'active' && (
                      <Badge variant="destructive" className="mt-2">
                        {listing.status}
                      </Badge>
                    )}
                  </CardContent>
                </Link>
                
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute top-2 right-2 bg-background/80 backdrop-blur-sm hover:bg-destructive hover:text-destructive-foreground z-10"
                  onClick={(e) => {
                    e.preventDefault();
                    removeFromWatchlist(item.id);
                  }}
                  aria-label="Remove from watchlist"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </Card>
            );
          })}
        </div>
      )}
    </main>
  );
}
