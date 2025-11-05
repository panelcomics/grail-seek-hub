import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Search, ShieldCheck, ShieldX } from "lucide-react";

interface UserProfile {
  user_id: string;
  username: string | null;
  trade_override_allow: boolean;
  completed_sales_count: number;
  completed_purchases_count: number;
  stripe_account_verified: boolean;
}

export const AdminTradeOverrides = () => {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("user_id, username, trade_override_allow, completed_sales_count, completed_purchases_count, stripe_account_verified")
        .not("username", "is", null)
        .order("username", { ascending: true });

      if (error) throw error;
      setUsers(data || []);
    } catch (error) {
      console.error("Error fetching users:", error);
      toast.error("Failed to load users");
    } finally {
      setLoading(false);
    }
  };

  const toggleOverride = async (userId: string, currentValue: boolean) => {
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ trade_override_allow: !currentValue })
        .eq("user_id", userId);

      if (error) throw error;

      toast.success(`Trade override ${!currentValue ? 'enabled' : 'disabled'}`);
      fetchUsers();
    } catch (error: any) {
      console.error("Error updating override:", error);
      toast.error(error.message || "Failed to update override");
    }
  };

  const filteredUsers = users.filter(user => 
    user.username?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return <div className="text-center py-8">Loading users...</div>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ShieldCheck className="h-5 w-5" />
          Trade Overrides
        </CardTitle>
        <CardDescription>
          Grant or revoke trading access for specific users
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search users..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        <div className="space-y-2 max-h-96 overflow-y-auto">
          {filteredUsers.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No users found</p>
          ) : (
            filteredUsers.map((user) => (
              <div
                key={user.user_id}
                className="flex items-center justify-between p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="font-medium">{user.username}</p>
                    {user.trade_override_allow && (
                      <Badge variant="default" className="text-xs">
                        <ShieldCheck className="h-3 w-3 mr-1" />
                        Override Active
                      </Badge>
                    )}
                  </div>
                  <div className="flex gap-4 text-sm text-muted-foreground">
                    <span>{user.completed_sales_count + user.completed_purchases_count} deals</span>
                    <span>
                      {user.stripe_account_verified ? '✓ Stripe verified' : '✗ Not verified'}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Label htmlFor={`override-${user.user_id}`} className="sr-only">
                    Toggle trade override
                  </Label>
                  <Switch
                    id={`override-${user.user_id}`}
                    checked={user.trade_override_allow}
                    onCheckedChange={() => toggleOverride(user.user_id, user.trade_override_allow)}
                  />
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
};
