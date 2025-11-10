import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Search, Shield } from "lucide-react";

interface Seller {
  user_id: string;
  username: string;
  email: string;
  is_verified_seller: boolean;
  custom_fee_rate: number | null;
  completed_sales_count: number;
}

export function AdminVerifiedSellers() {
  const [sellers, setSellers] = useState<Seller[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedSeller, setSelectedSeller] = useState<Seller | null>(null);
  const [customFeeRate, setCustomFeeRate] = useState("");

  useEffect(() => {
    fetchSellers();
  }, []);

  const fetchSellers = async () => {
    try {
      const { data: profileData, error } = await supabase
        .from("profiles")
        .select("user_id, username, is_verified_seller, custom_fee_rate, completed_sales_count")
        .order("completed_sales_count", { ascending: false })
        .limit(50);

      if (error) throw error;

      // Fetch email addresses
      const sellersWithEmail = await Promise.all(
        (profileData || []).map(async (profile) => {
          const { data: userData } = await supabase.auth.admin.getUserById(profile.user_id);
          return {
            ...profile,
            email: userData.user?.email || "N/A",
          };
        })
      );

      setSellers(sellersWithEmail);
    } catch (error) {
      console.error("Error fetching sellers:", error);
      toast.error("Failed to load sellers");
    } finally {
      setLoading(false);
    }
  };

  const toggleVerifiedStatus = async (sellerId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ is_verified_seller: !currentStatus })
        .eq("user_id", sellerId);

      if (error) throw error;

      toast.success(`Seller ${!currentStatus ? "verified" : "unverified"} successfully`);
      fetchSellers();
    } catch (error) {
      console.error("Error updating verified status:", error);
      toast.error("Failed to update seller status");
    }
  };

  const updateCustomFee = async () => {
    if (!selectedSeller) return;

    const feeRate = customFeeRate ? parseFloat(customFeeRate) : null;

    if (feeRate && (feeRate < 0 || feeRate > 1)) {
      toast.error("Fee rate must be between 0 and 1 (0% to 100%)");
      return;
    }

    try {
      const { error } = await supabase
        .from("profiles")
        .update({ custom_fee_rate: feeRate })
        .eq("user_id", selectedSeller.user_id);

      if (error) throw error;

      toast.success("Custom fee rate updated successfully");
      setSelectedSeller(null);
      setCustomFeeRate("");
      fetchSellers();
    } catch (error) {
      console.error("Error updating custom fee:", error);
      toast.error("Failed to update custom fee rate");
    }
  };

  const filteredSellers = sellers.filter((seller) =>
    seller.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
    seller.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return <div className="text-center py-12">Loading sellers...</div>;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Verified Sellers Management
          </CardTitle>
          <CardDescription>
            Manage verified seller status and custom fee rates for VIP sellers
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center gap-2">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by username or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="space-y-4">
            {filteredSellers.map((seller) => (
              <Card key={seller.user_id}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <p className="font-medium">{seller.username}</p>
                        {seller.is_verified_seller && (
                          <Shield className="h-4 w-4 text-primary" />
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">{seller.email}</p>
                      <p className="text-sm text-muted-foreground">
                        Sales: {seller.completed_sales_count} • 
                        Fee: {seller.custom_fee_rate 
                          ? `${(seller.custom_fee_rate * 100).toFixed(2)}%` 
                          : "Default (6.5%)"}
                      </p>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2">
                        <Label htmlFor={`verified-${seller.user_id}`} className="text-sm">
                          Verified
                        </Label>
                        <Switch
                          id={`verified-${seller.user_id}`}
                          checked={seller.is_verified_seller}
                          onCheckedChange={() =>
                            toggleVerifiedStatus(seller.user_id, seller.is_verified_seller)
                          }
                        />
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setSelectedSeller(seller);
                          setCustomFeeRate(
                            seller.custom_fee_rate
                              ? (seller.custom_fee_rate * 100).toString()
                              : ""
                          );
                        }}
                      >
                        Set Fee
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>

      {selectedSeller && (
        <Card>
          <CardHeader>
            <CardTitle>Set Custom Fee for {selectedSeller.username}</CardTitle>
            <CardDescription>
              Enter a custom platform fee rate (0-100%). Leave empty to use default rate.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="custom-fee">Custom Fee Rate (%)</Label>
              <Input
                id="custom-fee"
                type="number"
                min="0"
                max="100"
                step="0.1"
                placeholder="e.g., 3.5 for 3.5%"
                value={customFeeRate}
                onChange={(e) => setCustomFeeRate(e.target.value)}
              />
              <p className="text-sm text-muted-foreground">
                Current: {selectedSeller.custom_fee_rate 
                  ? `${(selectedSeller.custom_fee_rate * 100).toFixed(2)}%` 
                  : "Default (6.5%)"}
              </p>
            </div>
            <div className="flex gap-2">
              <Button onClick={updateCustomFee}>Update Fee</Button>
              <Button variant="outline" onClick={() => setSelectedSeller(null)}>
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
