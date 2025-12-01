import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Loader2, Truck, Clock } from "lucide-react";
import { toast } from "sonner";
import { debugLog } from "@/lib/debug";

interface ShippingRate {
  rate_id: string;
  provider: string;
  servicelevel: string;
  duration_terms: string;
  estimated_days: number;
  label_cost_cents: number;
  shipping_charged_cents: number;
  shipping_margin_cents: number;
  display_price: string;
}

interface ShippingRateSelectorProps {
  fromAddress: {
    name: string;
    street1: string;
    city: string;
    state: string;
    zip: string;
    country: string;
  };
  toAddress: {
    name: string;
    street1: string;
    city: string;
    state: string;
    zip: string;
    country: string;
  };
  parcel: {
    length: string;
    width: string;
    height: string;
    distance_unit: string;
    weight: string;
    mass_unit: string;
  };
  onRateSelected: (rate: ShippingRate | null) => void;
}

export const ShippingRateSelector = ({
  fromAddress,
  toAddress,
  parcel,
  onRateSelected,
}: ShippingRateSelectorProps) => {
  const [rates, setRates] = useState<ShippingRate[]>([]);
  const [selectedRateId, setSelectedRateId] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchShippingRates();
  }, [
    fromAddress.name,
    fromAddress.street1,
    fromAddress.city,
    fromAddress.state,
    fromAddress.zip,
    fromAddress.country,
    toAddress.name,
    toAddress.street1,
    toAddress.city,
    toAddress.state,
    toAddress.zip,
    toAddress.country,
    parcel.length,
    parcel.width,
    parcel.height,
    parcel.distance_unit,
    parcel.weight,
    parcel.mass_unit,
  ]);


  const fetchShippingRates = async () => {
    try {
      // Basic validation to avoid calling Shippo with incomplete addresses
      if (!toAddress?.zip || toAddress.zip.trim().length < 5) {
        console.warn("[SHIPPING] Skipping rate fetch, incomplete destination ZIP:", toAddress);
        setRates([]);
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      debugLog("[SHIPPING] Fetching rates with addresses:", { fromAddress, toAddress, parcel });
      
      const { data, error } = await supabase.functions.invoke("get-shipping-rates", {
        body: {
          fromAddress,
          toAddress,
          parcel,
        },
      });

      if (error) {
        console.error("[SHIPPING] Edge function error:", error);
        throw error;
      }

      console.log("[SHIPPING] Response data:", data);

      if (data?.rates) {
        console.log(`[SHIPPING] Found ${data.rates.length} rates`);
        setRates(data.rates);
        // Auto-select cheapest rate
        if (data.rates.length > 0) {
          const cheapest = data.rates[0];
          setSelectedRateId(cheapest.rate_id);
          onRateSelected(cheapest);
        }
      } else {
        console.warn("[SHIPPING] No rates in response");
      }
    } catch (error) {
      console.error("[SHIPPING] Error fetching shipping rates:", error);
      toast.error("Failed to load shipping rates. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleRateChange = (rateId: string) => {
    setSelectedRateId(rateId);
    const selectedRate = rates.find((r) => r.rate_id === rateId);
    onRateSelected(selectedRate || null);
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Truck className="h-5 w-5" />
            Shipping Options
          </CardTitle>
          <CardDescription>Loading available shipping rates...</CardDescription>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  if (rates.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Truck className="h-5 w-5" />
            Shipping Options
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            No shipping rates available. Please contact support.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Truck className="h-5 w-5" />
          Select Shipping Method
        </CardTitle>
        <CardDescription>
          Prepaid shipping label provided by GrailSeeker
        </CardDescription>
      </CardHeader>
      <CardContent>
        <RadioGroup value={selectedRateId} onValueChange={handleRateChange}>
          <div className="space-y-3">
            {rates.map((rate) => (
              <div
                key={rate.rate_id}
                className={`relative flex items-start space-x-3 rounded-lg border p-4 transition-colors cursor-pointer ${
                  selectedRateId === rate.rate_id
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-primary/50"
                }`}
                onClick={() => handleRateChange(rate.rate_id)}
              >
                <RadioGroupItem
                  value={rate.rate_id}
                  id={rate.rate_id}
                  className="mt-1"
                />
                <Label
                  htmlFor={rate.rate_id}
                  className="flex-1 cursor-pointer"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold">{rate.provider}</span>
                        <Badge variant="outline" className="text-xs">
                          {rate.servicelevel}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        <span>{rate.duration_terms || `${rate.estimated_days} business days`}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-bold">{rate.display_price}</div>
                      <div className="text-xs text-muted-foreground">
                        Includes label
                      </div>
                    </div>
                  </div>
                </Label>
              </div>
            ))}
          </div>
        </RadioGroup>

        <div className="mt-4 p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
          <p className="text-xs text-blue-700 dark:text-blue-400">
            <strong>Prepaid Shipping:</strong> Your shipping label is included and will be automatically generated after purchase.
          </p>
        </div>
      </CardContent>
    </Card>
  );
};
