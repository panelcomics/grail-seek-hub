import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Loader2, TrendingUp, Package, DollarSign, BarChart3 } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

interface SellerStats {
  total_scans: number;
  active_listings: number;
  items_sold: number;
  total_listed_value: number;
  gross_sales: number;
}

interface TopTitle {
  title: string;
  series: string | null;
  scan_count: number;
  listed_count: number;
  sold_count: number;
}

export default function SellerStats() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<SellerStats | null>(null);
  const [topTitles, setTopTitles] = useState<TopTitle[]>([]);

  useEffect(() => {
    if (!user) {
      navigate("/auth");
      return;
    }
    fetchStats();
  }, [user, navigate]);

  const fetchStats = async () => {
    try {
      // Fetch seller stats
      const { data: statsData, error: statsError } = await supabase
        .from("seller_stats")
        .select("*")
        .eq("user_id", user!.id)
        .single();

      if (statsError && statsError.code !== "PGRST116") throw statsError;

      // Fetch top titles
      const { data: titlesData, error: titlesError } = await supabase
        .from("top_scanned_titles")
        .select("*")
        .eq("user_id", user!.id)
        .order("scan_count", { ascending: false })
        .limit(10);

      if (titlesError) throw titlesError;

      setStats(statsData || {
        total_scans: 0,
        active_listings: 0,
        items_sold: 0,
        total_listed_value: 0,
        gross_sales: 0,
      });
      setTopTitles(titlesData || []);
    } catch (error) {
      console.error("Error fetching stats:", error);
      toast.error("Failed to load stats");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  const netPayout = stats ? stats.gross_sales * 0.95 : 0; // Assuming 5% platform fee

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      
      <main className="flex-1 container py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Seller Analytics</h1>
          <p className="text-muted-foreground">Track your inventory and sales performance</p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Scans</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.total_scans || 0}</div>
              <p className="text-xs text-muted-foreground mt-1">Items in inventory</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Active Listings</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.active_listings || 0}</div>
              <p className="text-xs text-muted-foreground mt-1">Currently for sale</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Items Sold</CardTitle>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.items_sold || 0}</div>
              <p className="text-xs text-muted-foreground mt-1">Completed sales</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Net Payouts</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${netPayout.toFixed(2)}</div>
              <p className="text-xs text-muted-foreground mt-1">After platform fees</p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Top 10 Titles</CardTitle>
          </CardHeader>
          <CardContent>
            {topTitles.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                No items scanned yet. Start scanning to see your top titles!
              </p>
            ) : (
              <div className="space-y-4">
                {topTitles.map((title, idx) => (
                  <div key={idx} className="flex items-center justify-between border-b pb-3 last:border-0">
                    <div className="flex-1">
                      <h3 className="font-semibold">{title.title}</h3>
                      {title.series && (
                        <p className="text-sm text-muted-foreground">{title.series}</p>
                      )}
                    </div>
                    <div className="flex gap-6 text-sm">
                      <div className="text-center">
                        <div className="font-bold">{title.scan_count}</div>
                        <div className="text-muted-foreground">Scanned</div>
                      </div>
                      <div className="text-center">
                        <div className="font-bold">{title.listed_count}</div>
                        <div className="text-muted-foreground">Listed</div>
                      </div>
                      <div className="text-center">
                        <div className="font-bold">{title.sold_count}</div>
                        <div className="text-muted-foreground">Sold</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </main>

      <Footer />
    </div>
  );
}
