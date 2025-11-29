import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Truck, Loader2, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

export const ShippingSettings = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [hasShippingAddress, setHasShippingAddress] = useState(false);
  const [shippingForm, setShippingForm] = useState({
    name: "",
    street1: "",
    street2: "",
    city: "",
    state: "",
    zip: "",
    country: "US",
    phone: "",
  });

  useEffect(() => {
    if (user) {
      fetchShippingAddress();
    }
  }, [user]);

  const fetchShippingAddress = async () => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("shipping_address")
        .eq("user_id", user?.id)
        .single();

      if (error) throw error;

      if (data?.shipping_address) {
        const addr = data.shipping_address as any;
        setShippingForm({
          name: addr.name || "",
          street1: addr.street1 || "",
          street2: addr.street2 || "",
          city: addr.city || "",
          state: addr.state || "",
          zip: addr.zip || "",
          country: addr.country || "US",
          phone: addr.phone || "",
        });
        setHasShippingAddress(true);
      }
    } catch (error) {
      console.error("Error fetching shipping address:", error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate required fields
    if (!shippingForm.name || !shippingForm.street1 || !shippingForm.city || 
        !shippingForm.state || !shippingForm.zip) {
      toast.error("Please fill in all required fields");
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase
        .from("profiles")
        .update({ 
          shipping_address: shippingForm 
        })
        .eq("user_id", user?.id);

      if (error) throw error;

      toast.success("Shipping address saved successfully!");
      setHasShippingAddress(true);
    } catch (error) {
      console.error("Error saving shipping address:", error);
      toast.error("Failed to save shipping address. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Truck className="h-5 w-5" />
          Shipping Address
        </CardTitle>
        <CardDescription>
          {hasShippingAddress 
            ? "Update your default ship-from address for all listings"
            : "Add your ship-from address to start selling and calculating accurate shipping rates"}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {hasShippingAddress && (
          <div className="flex items-center gap-2 p-3 bg-green-500/10 border border-green-500/20 rounded-lg mb-4">
            <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0" />
            <div>
              <p className="font-medium text-sm">Shipping Address on File</p>
              <p className="text-xs text-muted-foreground">
                {shippingForm.city && shippingForm.state 
                  ? `${shippingForm.city}, ${shippingForm.state} ${shippingForm.zip}` 
                  : "Address saved"}
              </p>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Full Name *</Label>
            <Input
              id="name"
              value={shippingForm.name}
              onChange={(e) => setShippingForm({ ...shippingForm, name: e.target.value })}
              placeholder="John Doe"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="street1">Street Address *</Label>
            <Input
              id="street1"
              value={shippingForm.street1}
              onChange={(e) => setShippingForm({ ...shippingForm, street1: e.target.value })}
              placeholder="123 Main St"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="street2">Apartment, Suite, etc. (Optional)</Label>
            <Input
              id="street2"
              value={shippingForm.street2}
              onChange={(e) => setShippingForm({ ...shippingForm, street2: e.target.value })}
              placeholder="Apt 4B"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="city">City *</Label>
              <Input
                id="city"
                value={shippingForm.city}
                onChange={(e) => setShippingForm({ ...shippingForm, city: e.target.value })}
                placeholder="New York"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="state">State *</Label>
              <Input
                id="state"
                value={shippingForm.state}
                onChange={(e) => setShippingForm({ ...shippingForm, state: e.target.value })}
                placeholder="NY"
                maxLength={2}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="zip">ZIP Code *</Label>
              <Input
                id="zip"
                value={shippingForm.zip}
                onChange={(e) => setShippingForm({ ...shippingForm, zip: e.target.value })}
                placeholder="10001"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Phone (Optional)</Label>
              <Input
                id="phone"
                value={shippingForm.phone}
                onChange={(e) => setShippingForm({ ...shippingForm, phone: e.target.value })}
                placeholder="(555) 123-4567"
              />
            </div>
          </div>

          <Button
            type="submit"
            disabled={loading}
            className="w-full"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                {hasShippingAddress ? "Update" : "Save"} Shipping Address
              </>
            )}
          </Button>
        </form>

        <p className="text-xs text-muted-foreground mt-4">
          This address will be used to calculate accurate shipping rates and generate prepaid labels for your sales.
        </p>
      </CardContent>
    </Card>
  );
};