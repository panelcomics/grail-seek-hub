import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Search, Shield, Star } from "lucide-react";
import { useAdminCheck } from "@/hooks/useAdminCheck";
import { useNavigate } from "react-router-dom";
import { VerifiedSellerBadge } from "@/components/VerifiedSellerBadge";
import { FeaturedSellerBadge } from "@/components/FeaturedSellerBadge";

interface SellerProfile {
  user_id: string;
  username: string | null;
  email?: string;
  is_verified_seller: boolean;
  is_featured_seller: boolean;
  custom_fee_rate: number | null;
}

export default function ManageSellers() {
  const [sellers, setSellers] = useState<SellerProfile[]>([]);
  const [filteredSellers, setFilteredSellers] = useState<SellerProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [saving, setSaving] = useState<string | null>(null);
  const { toast } = useToast();
  const { isAdmin, loading: adminLoading } = useAdminCheck();
  const navigate = useNavigate();

  useEffect(() => {
    if (!adminLoading && !isAdmin) {
      navigate("/");
      return;
    }
    if (isAdmin) {
      fetchSellers();
    }
  }, [isAdmin, adminLoading, navigate]);

  useEffect(() => {
    if (!searchQuery) {
      setFilteredSellers(sellers);
      return;
    }

    const query = searchQuery.toLowerCase();
    const filtered = sellers.filter(
      (seller) =>
        seller.username?.toLowerCase().includes(query) ||
        seller.email?.toLowerCase().includes(query) ||
        seller.user_id.toLowerCase().includes(query)
    );
    setFilteredSellers(filtered);
  }, [searchQuery, sellers]);

  const fetchSellers = async () => {
    try {
      // Fetch profiles
      const { data: profilesData, error: profilesError } = await supabase
        .from("profiles")
        .select("user_id, username, is_verified_seller, is_featured_seller, custom_fee_rate")
        .order("username");

      if (profilesError) throw profilesError;

      // Fetch user emails (from auth.users via admin query)
      const userIds = profilesData?.map((p) => p.user_id) || [];
      const sellersWithEmails = profilesData?.map((profile) => ({
        ...profile,
        email: profile.user_id, // Fallback to user_id if email not available
      })) || [];

      setSellers(sellersWithEmails);
      setFilteredSellers(sellersWithEmails);
    } catch (error: any) {
      console.error("Error fetching sellers:", error);
      toast({
        title: "Error loading sellers",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleToggleVerified = async (userId: string, currentValue: boolean) => {
    setSaving(userId);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ is_verified_seller: !currentValue })
        .eq("user_id", userId);

      if (error) throw error;

      setSellers((prev) =>
        prev.map((s) =>
          s.user_id === userId ? { ...s, is_verified_seller: !currentValue } : s
        )
      );

      toast({
        title: "Verification status updated",
        description: `Seller ${!currentValue ? "verified" : "unverified"} successfully`,
      });
    } catch (error: any) {
      console.error("Error updating verification:", error);
      toast({
        title: "Update failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSaving(null);
    }
  };

  const handleToggleFeatured = async (userId: string, currentValue: boolean) => {
    setSaving(userId);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ is_featured_seller: !currentValue })
        .eq("user_id", userId);

      if (error) throw error;

      setSellers((prev) =>
        prev.map((s) =>
          s.user_id === userId ? { ...s, is_featured_seller: !currentValue } : s
        )
      );

      toast({
        title: "Featured status updated",
        description: `Seller ${!currentValue ? "featured" : "unfeatured"} successfully`,
      });
    } catch (error: any) {
      console.error("Error updating featured status:", error);
      toast({
        title: "Update failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSaving(null);
    }
  };

  const handleUpdateFeeRate = async (userId: string, newRate: string) => {
    const rateValue = newRate.trim() === "" ? null : parseFloat(newRate);

    // Validate rate
    if (rateValue !== null && (isNaN(rateValue) || rateValue < 0 || rateValue > 1)) {
      toast({
        title: "Invalid fee rate",
        description: "Fee rate must be between 0 and 1 (e.g., 0.02 for 2%)",
        variant: "destructive",
      });
      return;
    }

    setSaving(userId);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ custom_fee_rate: rateValue })
        .eq("user_id", userId);

      if (error) throw error;

      setSellers((prev) =>
        prev.map((s) => (s.user_id === userId ? { ...s, custom_fee_rate: rateValue } : s))
      );

      toast({
        title: "Custom fee rate updated",
        description: rateValue !== null
          ? `Custom fee set to ${(rateValue * 100).toFixed(2)}%`
          : "Custom fee cleared, using default",
      });
    } catch (error: any) {
      console.error("Error updating fee rate:", error);
      toast({
        title: "Update failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSaving(null);
    }
  };

  if (adminLoading || loading) {
    return (
      <div className="container mx-auto py-8">
        <div className="flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">Manage Sellers</h1>
        <p className="text-muted-foreground">
          Control verified status, featured sellers, and custom fee rates
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Seller Management</CardTitle>
          <CardDescription>
            Toggle verification, featured status, and set custom platform fees
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Search */}
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by username, email, or user ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>

          {/* Table */}
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Seller</TableHead>
                  <TableHead>Username</TableHead>
                  <TableHead className="text-center">Verified</TableHead>
                  <TableHead className="text-center">Featured</TableHead>
                  <TableHead>Custom Fee Rate</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredSellers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground">
                      No sellers found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredSellers.map((seller) => (
                    <TableRow key={seller.user_id}>
                      <TableCell className="font-mono text-xs">
                        {seller.user_id.substring(0, 8)}...
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span>{seller.username || "No username"}</span>
                          {seller.is_verified_seller && (
                            <VerifiedSellerBadge showLabel={false} />
                          )}
                          {seller.is_featured_seller && (
                            <FeaturedSellerBadge showLabel={false} />
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex justify-center">
                          <Switch
                            checked={seller.is_verified_seller}
                            onCheckedChange={() =>
                              handleToggleVerified(seller.user_id, seller.is_verified_seller)
                            }
                            disabled={saving === seller.user_id}
                          />
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex justify-center">
                          <Switch
                            checked={seller.is_featured_seller}
                            onCheckedChange={() =>
                              handleToggleFeatured(seller.user_id, seller.is_featured_seller)
                            }
                            disabled={saving === seller.user_id}
                          />
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2 items-center">
                          <Input
                            type="number"
                            step="0.0001"
                            min="0"
                            max="1"
                            placeholder="0.02"
                            defaultValue={seller.custom_fee_rate || ""}
                            className="w-24"
                            disabled={saving === seller.user_id}
                            onBlur={(e) =>
                              handleUpdateFeeRate(seller.user_id, e.target.value)
                            }
                          />
                          <span className="text-xs text-muted-foreground">
                            {seller.custom_fee_rate
                              ? `${(seller.custom_fee_rate * 100).toFixed(2)}%`
                              : "Default"}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {saving === seller.user_id && (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
