import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ShieldCheck, Package, Truck, DollarSign } from "lucide-react";

interface CheckoutSummaryProps {
  itemPrice: number;
  shippingCost: number;
  platformFeeRate?: number;
  protectionFee?: number;
  itemTitle?: string;
}

export const CheckoutSummary = ({
  itemPrice,
  shippingCost,
  platformFeeRate = 0.065,
  protectionFee = 1.99,
  itemTitle = "Item",
}: CheckoutSummaryProps) => {
  const subtotal = itemPrice + shippingCost;
  const platformFee = Math.round(subtotal * platformFeeRate * 100) / 100;
  const total = subtotal + protectionFee;

  return (
    <Card className="border-primary/20">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Package className="h-5 w-5" />
          Order Summary
        </CardTitle>
        <CardDescription>{itemTitle}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-3">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <Package className="h-4 w-4 text-muted-foreground" />
              <span>Item Price</span>
            </div>
            <span className="font-semibold">${itemPrice.toFixed(2)}</span>
          </div>

          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <Truck className="h-4 w-4 text-muted-foreground" />
              <span>Shipping</span>
            </div>
            <span className="font-semibold">${shippingCost.toFixed(2)}</span>
          </div>

          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Subtotal</span>
            <span className="font-semibold">${subtotal.toFixed(2)}</span>
          </div>

          <Separator />

          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-primary" />
              <span>Buyer Protection</span>
            </div>
            <span className="font-semibold text-primary">${protectionFee.toFixed(2)}</span>
          </div>

          <div className="p-3 bg-primary/5 border border-primary/20 rounded-lg">
            <div className="flex items-start gap-2">
              <ShieldCheck className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-semibold text-primary">Protected by Grail Seeker</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Your purchase is protected. Get a full refund if the item doesn't arrive or isn't as described.
                </p>
              </div>
            </div>
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-primary" />
              <span className="text-lg font-bold">Total</span>
            </div>
            <div className="text-right">
              <span className="text-2xl font-bold text-primary">
                ${total.toFixed(2)}
              </span>
              <p className="text-xs text-muted-foreground mt-1">
                Flat 6.5% selling fee (including payment processing). No extra fees.
              </p>
            </div>
          </div>
        </div>

        <div className="pt-2">
          <Badge variant="outline" className="w-full justify-center py-2">
            Secure Checkout
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
};