import { useState } from "react";
import { Calculator, Info } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

export const calculateSellerFee = (itemPrice: number, shippingMethod: 'local_pickup' | 'ship_nationwide'): number => {
  if (shippingMethod === 'local_pickup') {
    return 0;
  }
  
  // Flat 6.5% selling fee (including payment processing)
  return itemPrice * 0.065;
};

interface PricingCalculatorProps {
  defaultPrice?: number;
  onCalculate?: (price: number, fee: number, total: number, method: 'local_pickup' | 'ship_nationwide') => void;
}

export default function PricingCalculator({ defaultPrice = 50, onCalculate }: PricingCalculatorProps) {
  const [itemPrice, setItemPrice] = useState<string>(defaultPrice.toString());
  const [shippingMethod, setShippingMethod] = useState<'local_pickup' | 'ship_nationwide'>('ship_nationwide');

  const price = parseFloat(itemPrice) || 0;
  const sellerFee = calculateSellerFee(price, shippingMethod);
  const buyerPays = price;
  const sellerReceives = price - sellerFee;

  const handlePriceChange = (value: string) => {
    setItemPrice(value);
    const newPrice = parseFloat(value) || 0;
    const newFee = calculateSellerFee(newPrice, shippingMethod);
    onCalculate?.(newPrice, newFee, newPrice - newFee, shippingMethod);
  };

  const handleMethodChange = (value: string) => {
    const method = value as 'local_pickup' | 'ship_nationwide';
    setShippingMethod(method);
    const newFee = calculateSellerFee(price, method);
    onCalculate?.(price, newFee, price - newFee, method);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Calculator className="h-5 w-5 text-primary" />
          <CardTitle>Seller Fee Calculator</CardTitle>
        </div>
        <CardDescription>
          Calculate your earnings after platform fees (sales only)
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="item-price">Item Price ($)</Label>
          <Input
            id="item-price"
            type="number"
            min="0"
            step="0.01"
            value={itemPrice}
            onChange={(e) => handlePriceChange(e.target.value)}
            placeholder="50.00"
          />
        </div>

        <div className="space-y-3">
          <Label>Shipping Method</Label>
          <RadioGroup value={shippingMethod} onValueChange={handleMethodChange}>
            <div className="flex items-center space-x-2 p-3 rounded-lg border hover:bg-accent transition-colors">
              <RadioGroupItem value="local_pickup" id="local" />
              <Label htmlFor="local" className="flex-1 cursor-pointer">
                <div className="flex items-center justify-between">
                  <span className="font-medium">Local Pickup</span>
                  <Badge variant="secondary" className="bg-green-500/10 text-green-700 dark:text-green-400">
                    0% Fee
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  No platform fees for local transactions
                </p>
              </Label>
            </div>

            <div className="flex items-center space-x-2 p-3 rounded-lg border hover:bg-accent transition-colors">
              <RadioGroupItem value="ship_nationwide" id="ship" />
              <Label htmlFor="ship" className="flex-1 cursor-pointer">
                <div className="flex items-center justify-between">
                  <span className="font-medium">Ship Nationwide</span>
                  <Badge variant="outline">6.5% Total</Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Includes payment processing • No extra fees
                </p>
              </Label>
            </div>
          </RadioGroup>
        </div>

        <Separator />

        <div className="space-y-3">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Item Price</span>
            <span className="font-medium">${price.toFixed(2)}</span>
          </div>

          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground flex items-center gap-1">
              Seller Fee
            </span>
            <span className={`font-medium ${sellerFee > 0 ? 'text-orange-500' : 'text-green-500'}`}>
              -${sellerFee.toFixed(2)}
            </span>
          </div>

          <Separator />

          <div className="flex justify-between">
            <span className="font-semibold">Buyer Pays</span>
            <span className="font-bold text-lg">${buyerPays.toFixed(2)}</span>
          </div>

          <div className="flex justify-between">
            <span className="font-semibold">You Receive</span>
            <span className="font-bold text-lg text-green-600 dark:text-green-400">
              ${sellerReceives.toFixed(2)}
            </span>
          </div>
        </div>

        {shippingMethod === 'ship_nationwide' && (
          <div className="rounded-lg bg-blue-500/10 border border-blue-500/20 p-3">
            <div className="flex gap-2">
              <Info className="h-4 w-4 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-blue-700 dark:text-blue-300">
                Flat 6.5% selling fee (including payment processing). No extra percentage fees. Our cut comes out of that, not on top of it.
              </p>
            </div>
          </div>
        )}

        {shippingMethod === 'local_pickup' && (
          <div className="rounded-lg bg-green-500/10 border border-green-500/20 p-3">
            <div className="flex gap-2">
              <Info className="h-4 w-4 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-green-700 dark:text-green-300">
                Local pickup has no platform fees! Keep 100% of your sale price.
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
