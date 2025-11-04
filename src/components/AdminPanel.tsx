import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PayoutManagement } from "./PayoutManagement";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Shield, Plus, Trash2, User } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface InfluencerCode {
  id: string;
  code: string;
  user_id: string | null;
  discount_rate: number;
  monthly_cap: number;
  is_active: boolean;
  created_at: string;
}

export const AdminPanel = () => {
  const { user } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [codes, setCodes] = useState<InfluencerCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [newCode, setNewCode] = useState("");
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    checkAdmin();
  }, [user]);

  const checkAdmin = async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    const { data } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .single();

    setIsAdmin(!!data);
    if (data) {
      fetchCodes();
    } else {
      setLoading(false);
    }
  };

  const fetchCodes = async () => {
    try {
      const { data, error } = await supabase
        .from("influencer_codes")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setCodes(data || []);
    } catch (error) {
      console.error("Error fetching codes:", error);
      toast.error("Failed to load discount codes");
    } finally {
      setLoading(false);
    }
  };

  const createCode = async () => {
    if (!newCode.trim()) {
      toast.error("Please enter a code name");
      return;
    }

    setCreating(true);
    try {
      const { error } = await supabase.from("influencer_codes").insert({
        code: newCode.toUpperCase(),
        discount_rate: 2.0,
        monthly_cap: 500.0,
        is_active: true,
        approved_by: user?.id,
        approved_at: new Date().toISOString(),
      });

      if (error) throw error;

      toast.success("Discount code created successfully");
      setNewCode("");
      fetchCodes();
    } catch (error: any) {
      console.error("Error creating code:", error);
      toast.error(error.message || "Failed to create code");
    } finally {
      setCreating(false);
    }
  };

  const toggleCodeStatus = async (codeId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from("influencer_codes")
        .update({ is_active: !currentStatus })
        .eq("id", codeId);

      if (error) throw error;

      toast.success(`Code ${!currentStatus ? "activated" : "deactivated"}`);
      fetchCodes();
    } catch (error) {
      console.error("Error toggling code:", error);
      toast.error("Failed to update code status");
    }
  };

  if (loading) {
    return <div className="text-muted-foreground">Loading admin panel...</div>;
  }

  if (!isAdmin) {
    return (
      <Alert>
        <Shield className="h-4 w-4" />
        <AlertDescription>
          You don't have permission to access the admin panel.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <Tabs defaultValue="discount-codes" className="space-y-6">
      <TabsList>
        <TabsTrigger value="discount-codes">Discount Codes</TabsTrigger>
        <TabsTrigger value="payouts">Payout Management</TabsTrigger>
      </TabsList>

      <TabsContent value="discount-codes">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Discount Codes
            </CardTitle>
            <CardDescription>
              Manage influencer discount codes and track usage
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Input
                placeholder="Enter new code (e.g., CLANMCDONALDS)"
                value={newCode}
                onChange={(e) => setNewCode(e.target.value.toUpperCase())}
                onKeyDown={(e) => e.key === "Enter" && createCode()}
                disabled={creating}
              />
              <Button onClick={createCode} disabled={creating}>
                <Plus className="h-4 w-4 mr-2" />
                Create
              </Button>
            </div>

            <div className="space-y-2">
              {codes.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No discount codes created yet
                </div>
              ) : (
                codes.map((code) => (
                  <Card key={code.id}>
                    <CardContent className="pt-6">
                      <div className="flex items-center justify-between">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-semibold">{code.code}</span>
                            <Badge variant={code.is_active ? "default" : "secondary"}>
                              {code.is_active ? "Active" : "Inactive"}
                            </Badge>
                            {code.user_id && (
                              <Badge variant="outline" className="flex items-center gap-1">
                                <User className="h-3 w-3" />
                                Assigned
                              </Badge>
                            )}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {code.discount_rate}% rate • ${code.monthly_cap}/mo cap
                          </div>
                        </div>
                        <Button
                          variant={code.is_active ? "destructive" : "default"}
                          size="sm"
                          onClick={() => toggleCodeStatus(code.id, code.is_active)}
                        >
                          {code.is_active ? "Deactivate" : "Activate"}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="payouts">
        <PayoutManagement />
      </TabsContent>
    </Tabs>
  );
};
