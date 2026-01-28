import { useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Store, Package, Trash2 } from "lucide-react";
import { CartItemCard } from "./CartItemCard";
import { BundleCheckoutDialog } from "./BundleCheckoutDialog";

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

interface SellerBundleCardProps {
  sellerId: string;
  sellerUsername: string | null;
  sellerAvatar: string | null;
  listings: CartListingDetails[];
  onRemoveItem: (listingId: string) => void;
}

export function SellerBundleCard({
  sellerId,
  sellerUsername,
  sellerAvatar,
  listings,
  onRemoveItem,
}: SellerBundleCardProps) {
  const [showBundleCheckout, setShowBundleCheckout] = useState(false);

  const totalPrice = listings.reduce((sum, l) => sum + (l.price || 0), 0);
  const canBundle = listings.length > 1;

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Store className="h-4 w-4 text-muted-foreground" />
              <Link
                to={`/seller/${sellerUsername}`}
                className="text-sm font-medium hover:underline"
              >
                {sellerUsername || "Seller"}
              </Link>
              <Badge variant="outline" className="text-xs">
                {listings.length} {listings.length === 1 ? "item" : "items"}
              </Badge>
            </div>

            {canBundle && (
              <Button
                size="sm"
                onClick={() => setShowBundleCheckout(true)}
                className="gap-1"
              >
                <Package className="h-4 w-4" />
                Checkout All (${totalPrice.toFixed(2)})
              </Button>
            )}
          </div>

          {canBundle && (
            <p className="text-xs text-muted-foreground mt-1">
              Save on shipping! Bundle checkout combines items into one shipment.
            </p>
          )}
        </CardHeader>

        <CardContent className="space-y-4 pt-0">
          {listings.map((listing, index) => (
            <div key={listing.id}>
              {index > 0 && <Separator className="my-4" />}
              <CartItemCard
                listing={listing}
                onRemove={() => onRemoveItem(listing.id)}
              />
            </div>
          ))}
        </CardContent>
      </Card>

      <BundleCheckoutDialog
        open={showBundleCheckout}
        onOpenChange={setShowBundleCheckout}
        listings={listings}
        sellerUsername={sellerUsername}
      />
    </>
  );
}
