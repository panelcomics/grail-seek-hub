import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Package, TrendingUp, User } from "lucide-react";
import { calculateTradeFee } from "@/lib/fees";

interface EbayBookModalProps {
  item: {
    itemId: string;
    title: string;
    price?: { value: string; currency: string };
    image?: { imageUrl: string };
    condition?: string;
    seller?: {
      username: string;
      feedbackPercentage: string;
      feedbackScore: number;
    };
  } | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EbayBookModal({ item, open, onOpenChange }: EbayBookModalProps) {
  if (!item) return null;

  const priceValue = parseFloat(item.price?.value || "0");
  const tradeFee = calculateTradeFee(priceValue * 2);
  const estimatedShipping = priceValue < 50 ? 5 : priceValue < 200 ? 8 : 12;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl pr-8">{item.title}</DialogTitle>
        </DialogHeader>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Image */}
          <div className="aspect-[3/4] bg-muted rounded-lg overflow-hidden">
            {item.image?.imageUrl ? (
              <img
                src={item.image.imageUrl}
                alt={item.title}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="h-full w-full flex items-center justify-center">
                <span className="text-muted-foreground">No Image</span>
              </div>
            )}
          </div>

          {/* Details */}
          <div className="space-y-4">
            {/* Price & Condition */}
            <div>
              <div className="text-3xl font-bold text-primary mb-2">
                ${priceValue.toFixed(2)}
              </div>
              {item.condition && (
                <Badge variant="outline" className="mb-2">
                  {item.condition}
                </Badge>
              )}
            </div>

            <Separator />

            {/* Seller Info */}
            {item.seller && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">Seller:</span>
                  <span>{item.seller.username}</span>
                </div>
                <div className="text-sm text-success pl-6">
                  {item.seller.feedbackPercentage}% positive ({item.seller.feedbackScore.toLocaleString()} reviews)
                </div>
              </div>
            )}

            <Separator />

            {/* Trade Fee Calculator */}
            <div className="space-y-3 bg-muted/50 rounded-lg p-4">
              <div className="flex items-center gap-2 font-semibold">
                <TrendingUp className="h-4 w-4 text-primary" />
                Trade Cost Breakdown
              </div>
              
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Book Value:</span>
                  <span className="font-medium">${priceValue.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Platform Fee (your share):</span>
                  <span className="font-medium">${tradeFee.each_user_fee.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Est. Shipping:</span>
                  <span className="font-medium">${estimatedShipping.toFixed(2)}</span>
                </div>
                <Separator />
                <div className="flex justify-between text-base font-bold">
                  <span>Total Cost to Swap:</span>
                  <span className="text-primary">${(tradeFee.each_user_fee + estimatedShipping).toFixed(2)}</span>
                </div>
              </div>

              <div className="text-xs text-muted-foreground">
                <Package className="h-3 w-3 inline mr-1" />
                Fee tier: {tradeFee.tier_info}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-2 pt-2">
              <Button className="w-full" size="lg">
                Initiate Trade Proposal
              </Button>
              <Button variant="outline" className="w-full" onClick={() => onOpenChange(false)}>
                Close
              </Button>
            </div>

            <p className="text-xs text-muted-foreground">
              This listing is sourced from eBay. Use our platform to propose a trade with a matching item from your collection.
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
