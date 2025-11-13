import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "sonner";
import { Trash2, Plus, ArrowUp, ArrowDown } from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";

interface FeaturedShop {
  id: string;
  seller_id: string;
  rank: number;
  active: boolean;
  profiles: {
    username: string;
    avatar_url: string | null;
  };
}

export default function AdminFeaturedShops() {
  const { user } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [shops, setShops] = useState<FeaturedShop[]>([]);
  const [newSellerEmail, setNewSellerEmail] = useState("");
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    checkAdmin();
  }, [user]);

  useEffect(() => {
    if (isAdmin) {
      fetchFeaturedShops();
    }
  }, [isAdmin]);

  const checkAdmin = async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .eq("role", "admin")
        .single();

      if (error) throw error;
      setIsAdmin(!!data);
    } catch (error) {
      console.error("Error checking admin status:", error);
      setIsAdmin(false);
    } finally {
      setLoading(false);
    }
  };

  const fetchFeaturedShops = async () => {
    try {
      const { data: featuredData, error: featuredError } = await supabase
        .from("seller_featured")
        .select("id, seller_id, rank, active")
        .order("rank", { ascending: true });

      if (featuredError) throw featuredError;
      if (!featuredData || featuredData.length === 0) {
        setShops([]);
        return;
      }

      const sellerIds = featuredData.map(f => f.seller_id);
      const { data: profilesData, error: profilesError } = await supabase
        .from("profiles")
        .select("user_id, username, avatar_url")
        .in("user_id", sellerIds);

      if (profilesError) throw profilesError;

      const shopsWithProfiles = featuredData.map(featured => {
        const profile = profilesData?.find(p => p.user_id === featured.seller_id);
        return {
          ...featured,
          profiles: {
            username: profile?.username || "Unknown Shop",
            avatar_url: profile?.avatar_url || null,
          }
        };
      });

      setShops(shopsWithProfiles);
    } catch (error) {
      console.error("Error fetching featured shops:", error);
      toast.error("Failed to load featured shops");
    }
  };

  const addFeaturedShop = async () => {
    if (!newSellerEmail.trim()) {
      toast.error("Please enter a seller email or username");
      return;
    }

    setAdding(true);
    try {
      // Find user by email or username
      const { data: profiles, error: profileError } = await supabase
        .from("profiles")
        .select("user_id")
        .or(`username.ilike.%${newSellerEmail}%`)
        .limit(1);

      if (profileError) throw profileError;
      if (!profiles || profiles.length === 0) {
        toast.error("Seller not found");
        return;
      }

      const maxRank = shops.length > 0 ? Math.max(...shops.map(s => s.rank)) : 0;

      const { error } = await supabase.from("seller_featured").insert({
        seller_id: profiles[0].user_id,
        rank: maxRank + 1,
        active: true,
      });

      if (error) throw error;

      toast.success("Featured shop added");
      setNewSellerEmail("");
      fetchFeaturedShops();
    } catch (error) {
      console.error("Error adding featured shop:", error);
      toast.error("Failed to add featured shop");
    } finally {
      setAdding(false);
    }
  };

  const removeFeaturedShop = async (id: string) => {
    try {
      const { error } = await supabase
        .from("seller_featured")
        .delete()
        .eq("id", id);

      if (error) throw error;

      toast.success("Featured shop removed");
      fetchFeaturedShops();
    } catch (error) {
      console.error("Error removing featured shop:", error);
      toast.error("Failed to remove featured shop");
    }
  };

  const updateRank = async (id: string, newRank: number) => {
    try {
      const { error } = await supabase
        .from("seller_featured")
        .update({ rank: newRank })
        .eq("id", id);

      if (error) throw error;

      fetchFeaturedShops();
    } catch (error) {
      console.error("Error updating rank:", error);
      toast.error("Failed to update rank");
    }
  };

  const moveUp = (index: number) => {
    if (index === 0) return;
    const current = shops[index];
    const previous = shops[index - 1];
    updateRank(current.id, previous.rank);
    updateRank(previous.id, current.rank);
  };

  const moveDown = (index: number) => {
    if (index === shops.length - 1) return;
    const current = shops[index];
    const next = shops[index + 1];
    updateRank(current.id, next.rank);
    updateRank(next.id, current.rank);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Alert variant="destructive" className="max-w-md">
          <AlertDescription>
            You do not have permission to access this page.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <AppLayout>
      <div className="container mx-auto px-4 py-12">
        <h1 className="text-4xl font-bold text-foreground mb-8">Manage Featured Shops</h1>

        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Add Featured Shop</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4">
              <Input
                placeholder="Enter seller username or email"
                value={newSellerEmail}
                onChange={(e) => setNewSellerEmail(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && addFeaturedShop()}
              />
              <Button onClick={addFeaturedShop} disabled={adding}>
                <Plus className="w-4 h-4 mr-2" />
                Add
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Current Featured Shops ({shops.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {shops.map((shop, index) => (
                <div
                  key={shop.id}
                  className="flex items-center justify-between p-4 border border-border rounded-lg"
                >
                  <div className="flex items-center gap-4">
                    <span className="text-2xl font-bold text-muted-foreground">
                      #{shop.rank}
                    </span>
                    <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center overflow-hidden">
                      {shop.profiles.avatar_url ? (
                        <img
                          src={shop.profiles.avatar_url}
                          alt={shop.profiles.username}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span className="text-lg font-bold text-primary">
                          {shop.profiles.username?.[0]?.toUpperCase()}
                        </span>
                      )}
                    </div>
                    <div>
                      <p className="font-semibold text-foreground">
                        {shop.profiles.username}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {shop.active ? "Active" : "Inactive"}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      size="icon"
                      variant="outline"
                      onClick={() => moveUp(index)}
                      disabled={index === 0}
                    >
                      <ArrowUp className="w-4 h-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="outline"
                      onClick={() => moveDown(index)}
                      disabled={index === shops.length - 1}
                    >
                      <ArrowDown className="w-4 h-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="destructive"
                      onClick={() => removeFeaturedShop(shop.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
