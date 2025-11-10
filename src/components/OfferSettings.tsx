import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { toast } from "sonner";

export default function OfferSettings() {
  const { user } = useAuth();
  const [acceptOffers, setAcceptOffers] = useState(false);
  const [minOfferPercentage, setMinOfferPercentage] = useState(10);
  const [autoDecline, setAutoDecline] = useState(true);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchSettings();
    }
  }, [user]);

  const fetchSettings = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from("seller_settings")
        .select("accept_offers, min_offer_percentage, auto_decline_below_min")
        .eq("seller_id", user.id)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setAcceptOffers(data.accept_offers);
        setMinOfferPercentage(data.min_offer_percentage);
        setAutoDecline(data.auto_decline_below_min);
      }
    } catch (error) {
      console.error("Error fetching offer settings:", error);
    } finally {
      setLoading(false);
    }
  };

  const updateSettings = async (field: string, value: any) => {
    if (!user) return;

    try {
      const { data: existing } = await supabase
        .from("seller_settings")
        .select("id")
        .eq("seller_id", user.id)
        .maybeSingle();

      if (existing) {
        // Update existing settings
        const { error } = await supabase
          .from("seller_settings")
          .update({ [field]: value })
          .eq("seller_id", user.id);

        if (error) throw error;
      } else {
        // Create new settings
        const { error } = await supabase
          .from("seller_settings")
          .insert({
            seller_id: user.id,
            [field]: value,
          });

        if (error) throw error;
      }

      toast.success("Settings updated");
    } catch (error) {
      console.error("Error updating offer settings:", error);
      toast.error("Failed to update settings");
    }
  };

  const handleAcceptOffersChange = (checked: boolean) => {
    setAcceptOffers(checked);
    updateSettings("accept_offers", checked);
  };

  const handleMinPercentageChange = (value: number[]) => {
    setMinOfferPercentage(value[0]);
    updateSettings("min_offer_percentage", value[0]);
  };

  const handleAutoDeclineChange = (checked: boolean) => {
    setAutoDecline(checked);
    updateSettings("auto_decline_below_min", checked);
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <p className="text-muted-foreground">Loading settings...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Offer Settings</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <Label htmlFor="accept-offers">Accept Offers</Label>
            <p className="text-sm text-muted-foreground">
              Allow buyers to make offers on your listings
            </p>
          </div>
          <Switch
            id="accept-offers"
            checked={acceptOffers}
            onCheckedChange={handleAcceptOffersChange}
          />
        </div>

        {acceptOffers && (
          <>
            <div className="space-y-4">
              <div>
                <Label>Minimum Offer Percentage</Label>
                <p className="text-sm text-muted-foreground mb-4">
                  Set the minimum acceptable offer as a percentage discount from your asking price
                </p>
                <Slider
                  value={[minOfferPercentage]}
                  onValueChange={handleMinPercentageChange}
                  min={5}
                  max={50}
                  step={5}
                  className="mb-2"
                />
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">
                    Minimum: {100 - minOfferPercentage}% of asking price
                  </span>
                  <span className="font-semibold text-primary">
                    {minOfferPercentage}% off max
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label htmlFor="auto-decline">Auto-Decline Low Offers</Label>
                <p className="text-sm text-muted-foreground">
                  Automatically decline offers below your minimum percentage
                </p>
              </div>
              <Switch
                id="auto-decline"
                checked={autoDecline}
                onCheckedChange={handleAutoDeclineChange}
              />
            </div>
          </>
        )}

        <div className="pt-4 border-t">
          <p className="text-sm text-muted-foreground">
            💡 Tip: Accepting offers can increase sales by up to 30%. Most successful sellers set their minimum between 10-20% off.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
