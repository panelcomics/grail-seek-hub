import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Trash2, ExternalLink } from "lucide-react";

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

interface CartItemCardProps {
  listing: CartListingDetails;
  onRemove: () => void;
}

// Helper to get the primary image URL
function getImageUrl(images: any): string | null {
  if (!images) return null;
  
  if (typeof images === "string") {
    try {
      const parsed = JSON.parse(images);
      return parsed.front || parsed.primary || Object.values(parsed)[0] || null;
    } catch {
      return images;
    }
  }
  
  if (typeof images === "object") {
    return images.front || images.primary || Object.values(images)[0] || null;
  }
  
  return null;
}

export function CartItemCard({ listing, onRemove }: CartItemCardProps) {
  const navigate = useNavigate();
  const imageUrl = getImageUrl(listing.images);
  
  const displayTitle = listing.title || `${listing.series || "Unknown"} #${listing.issue_number || "?"}`;
  const price = listing.price || 0;
  const shippingPrice = listing.shipping_price || 0;

  const handleBuyNow = () => {
    // Navigate to listing detail page to complete purchase
    navigate(`/l/${listing.id}`);
  };

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-0">
        <div className="flex gap-4 p-4">
          {/* Image */}
          <div 
            className="w-24 h-32 flex-shrink-0 bg-muted rounded-md overflow-hidden cursor-pointer"
            onClick={() => navigate(`/l/${listing.id}`)}
          >
            {imageUrl ? (
              <img
                src={imageUrl}
                alt={displayTitle}
                className="w-full h-full object-cover hover:scale-105 transition-transform"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-muted-foreground text-xs">
                No Image
              </div>
            )}
          </div>

          {/* Details */}
          <div className="flex-1 min-w-0">
            <h3 
              className="font-semibold text-base truncate cursor-pointer hover:underline"
              onClick={() => navigate(`/l/${listing.id}`)}
            >
              {displayTitle}
            </h3>
            
            {listing.series && listing.issue_number && (
              <p className="text-sm text-muted-foreground truncate">
                {listing.series} #{listing.issue_number}
              </p>
            )}

            {/* Pricing */}
            <div className="mt-2 space-y-1">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Price:</span>
                <span className="font-semibold">${price.toFixed(2)}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Shipping:</span>
                <span>
                  {shippingPrice > 0 ? `$${shippingPrice.toFixed(2)}` : "Calculated at checkout"}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between border-t bg-muted/30 px-4 py-3">
          <Button
            variant="ghost"
            size="sm"
            className="text-destructive hover:text-destructive hover:bg-destructive/10"
            onClick={onRemove}
          >
            <Trash2 className="h-4 w-4 mr-1" />
            Remove
          </Button>

          <Button size="sm" onClick={handleBuyNow}>
            Buy Now
            <ExternalLink className="h-4 w-4 ml-1" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
