import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useCart } from "@/contexts/CartContext";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ShoppingCart, Trash2, Loader2, AlertCircle, ArrowLeft, Store } from "lucide-react";
import { toast } from "sonner";
import { CartItemCard } from "@/components/cart/CartItemCard";

interface CartListingDetails {
  id: string;
  title: string;
  series: string | null;
  issue_number: string | null;
  price: number | null;
  shipping_price: number | null;
  status: string;
  images: any;
  seller_id: string;
  seller_username: string | null;
  seller_avatar: string | null;
}

const Cart = () => {
  const { items, isLoading: cartLoading, removeFromCart, refreshCart } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [listings, setListings] = useState<CartListingDetails[]>([]);
  const [isLoadingListings, setIsLoadingListings] = useState(true);

  // Fetch full listing details for cart items
  useEffect(() => {
    const fetchListingDetails = async () => {
      if (items.length === 0) {
        setListings([]);
        setIsLoadingListings(false);
        return;
      }

      setIsLoadingListings(true);

      try {
        const listingIds = items.map((item) => item.listing_id);

        const { data, error } = await supabase
          .from("listings")
          .select(`
            id,
            price,
            shipping_price,
            status,
            user_id,
            inventory_items!inner (
              title,
              series,
              issue_number,
              images
            ),
            profiles:user_id (
              username,
              avatar_url
            )
          `)
          .in("id", listingIds);

        if (error) {
          console.error("[CART] Error fetching listings:", error);
          toast.error("Failed to load cart items");
          return;
        }

        // Transform data and check for unavailable items
        const transformedListings: CartListingDetails[] = [];
        const unavailableIds: string[] = [];

        for (const listing of data || []) {
          const invItem = Array.isArray(listing.inventory_items) 
            ? listing.inventory_items[0] 
            : listing.inventory_items;
          const profile = listing.profiles as any;

          if (listing.status !== "active") {
            // Item is no longer available
            unavailableIds.push(listing.id);
            continue;
          }

          transformedListings.push({
            id: listing.id,
            title: invItem?.title || "Unknown Item",
            series: invItem?.series,
            issue_number: invItem?.issue_number,
            price: listing.price,
            shipping_price: listing.shipping_price,
            status: listing.status,
            images: invItem?.images,
            seller_id: listing.user_id,
            seller_username: profile?.username,
            seller_avatar: profile?.avatar_url,
          });
        }

        // Auto-remove unavailable items
        if (unavailableIds.length > 0) {
          for (const id of unavailableIds) {
            await removeFromCart(id);
          }
          toast.info(`${unavailableIds.length} item(s) removed - no longer available`);
        }

        // Check for items in cart but not found in DB (deleted listings)
        const foundIds = new Set(data?.map((l) => l.id) || []);
        const deletedIds = listingIds.filter((id) => !foundIds.has(id));
        for (const id of deletedIds) {
          await removeFromCart(id);
        }

        setListings(transformedListings);
      } catch (error) {
        console.error("[CART] Exception fetching listings:", error);
      } finally {
        setIsLoadingListings(false);
      }
    };

    if (!cartLoading) {
      fetchListingDetails();
    }
  }, [items, cartLoading, removeFromCart]);

  // Group listings by seller for future bundling feature
  const listingsBySeller = listings.reduce((acc, listing) => {
    const sellerId = listing.seller_id;
    if (!acc[sellerId]) {
      acc[sellerId] = {
        seller_id: sellerId,
        seller_username: listing.seller_username,
        seller_avatar: listing.seller_avatar,
        listings: [],
      };
    }
    acc[sellerId].listings.push(listing);
    return acc;
  }, {} as Record<string, { seller_id: string; seller_username: string | null; seller_avatar: string | null; listings: CartListingDetails[] }>);

  const isLoading = cartLoading || isLoadingListings;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <main className="container mx-auto px-4 py-8">
          <div className="flex justify-center items-center min-h-[400px]">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <main className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <ShoppingCart className="h-6 w-6" />
              Saved Items
            </h1>
            <p className="text-muted-foreground text-sm">
              {items.length} {items.length === 1 ? "item" : "items"} saved
            </p>
          </div>
        </div>

        {/* Important UX Notice */}
        <Card className="mb-6 border-primary/20 bg-primary/5">
          <CardContent className="py-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium text-primary">Each item checks out separately</p>
                <p className="text-muted-foreground">
                  Shipping is calculated per listing. Each purchase creates its own order.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Empty State */}
        {listings.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <ShoppingCart className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">Your saved items list is empty</h3>
              <p className="text-muted-foreground mb-4">
                Browse the marketplace and add items you're interested in
              </p>
              <Button onClick={() => navigate("/market")}>
                Browse Marketplace
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-8">
            {/* Listings grouped by seller */}
            {Object.values(listingsBySeller).map((sellerGroup) => (
              <div key={sellerGroup.seller_id} className="space-y-4">
                {/* Seller Header */}
                <div className="flex items-center gap-2">
                  <Store className="h-4 w-4 text-muted-foreground" />
                  <Link 
                    to={`/seller/${sellerGroup.seller_username}`}
                    className="text-sm font-medium hover:underline"
                  >
                    {sellerGroup.seller_username || "Seller"}
                  </Link>
                  <Badge variant="outline" className="text-xs">
                    {sellerGroup.listings.length} {sellerGroup.listings.length === 1 ? "item" : "items"}
                  </Badge>
                </div>

                {/* Seller's Listings */}
                <div className="space-y-4">
                  {sellerGroup.listings.map((listing) => (
                    <CartItemCard
                      key={listing.id}
                      listing={listing}
                      onRemove={() => removeFromCart(listing.id)}
                    />
                  ))}
                </div>

                <Separator />
              </div>
            ))}

            {/* Footer Note */}
            <div className="text-center text-sm text-muted-foreground py-4">
              <p>Click "Buy Now" on any item to proceed to checkout for that listing</p>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default Cart;
