import { useState, useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  TrendingUp, 
  DollarSign, 
  Package, 
  Truck, 
  Percent,
  Download,
  Calendar,
  ChevronLeft,
  Loader2
} from "lucide-react";
import { format, subMonths, startOfMonth, endOfMonth, isWithinInterval } from "date-fns";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useMarketplaceRails } from "@/hooks/useMarketplaceRails";

interface EarningsSummary {
  grossSalesCents: number;
  platformFeesCents: number;
  shippingCollectedCents: number;
  shippingCostCents: number;
  netPayoutCents: number;
  orderCount: number;
}

export default function SellerEarnings() {
  const { user } = useAuth();
  const navigate = useNavigate();
  
  // Check feature flag from database
  const { shouldShowEarnings, loading: flagsLoading } = useMarketplaceRails();
  
  const [startDate, setStartDate] = useState(() => 
    format(startOfMonth(subMonths(new Date(), 2)), "yyyy-MM-dd")
  );
  const [endDate, setEndDate] = useState(() => 
    format(endOfMonth(new Date()), "yyyy-MM-dd")
  );

  // Fetch orders within date range
  const { data: orders, isLoading } = useQuery({
    queryKey: ["seller-earnings", user?.id, startDate, endDate],
    queryFn: async () => {
      if (!user) return [];
      
      const { data, error } = await supabase
        .from("orders")
        .select("id, amount_cents, status, payment_status, created_at, paid_at")
        .eq("seller_id", user.id)
        .or("payment_status.eq.paid,status.eq.paid")
        .gte("created_at", startDate)
        .lte("created_at", endDate + "T23:59:59")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!user && shouldShowEarnings && !flagsLoading,
  });

  // Calculate summary
  const summary: EarningsSummary = useMemo(() => {
    if (!orders || orders.length === 0) {
      return {
        grossSalesCents: 0,
        platformFeesCents: 0,
        shippingCollectedCents: 0,
        shippingCostCents: 0,
        netPayoutCents: 0,
        orderCount: 0,
      };
    }

    const grossSalesCents = orders.reduce((sum, o) => sum + (o.amount_cents || 0), 0);
    // Estimate 6.5% platform fee
    const platformFeesCents = Math.round(grossSalesCents * 0.065);
    // Shipping estimation (would need actual data)
    const shippingCollectedCents = 0;
    const shippingCostCents = 0;
    const netPayoutCents = grossSalesCents - platformFeesCents;

    return {
      grossSalesCents,
      platformFeesCents,
      shippingCollectedCents,
      shippingCostCents,
      netPayoutCents,
      orderCount: orders.length,
    };
  }, [orders]);

  // Group by month for chart data
  const monthlyData = useMemo(() => {
    if (!orders) return [];
    
    const grouped: Record<string, { month: string; gross: number; net: number; count: number }> = {};
    
    orders.forEach(order => {
      const monthKey = format(new Date(order.created_at), "yyyy-MM");
      const monthLabel = format(new Date(order.created_at), "MMM yyyy");
      
      if (!grouped[monthKey]) {
        grouped[monthKey] = { month: monthLabel, gross: 0, net: 0, count: 0 };
      }
      
      grouped[monthKey].gross += order.amount_cents || 0;
      grouped[monthKey].net += Math.round((order.amount_cents || 0) * 0.935);
      grouped[monthKey].count += 1;
    });

    return Object.values(grouped).sort((a, b) => 
      new Date(b.month).getTime() - new Date(a.month).getTime()
    );
  }, [orders]);

  // CSV Export
  const handleExportCSV = () => {
    if (!orders || orders.length === 0) return;

    const headers = ["Order ID", "Date", "Gross Amount", "Est. Fee (6.5%)", "Est. Net"];
    const rows = orders.map(order => [
      order.id,
      format(new Date(order.created_at), "yyyy-MM-dd"),
      (order.amount_cents / 100).toFixed(2),
      ((order.amount_cents * 0.065) / 100).toFixed(2),
      ((order.amount_cents * 0.935) / 100).toFixed(2),
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map(row => row.join(",")),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `earnings_${startDate}_to_${endDate}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (flagsLoading) {
    return (
      <main className="container mx-auto px-4 py-8 max-w-4xl flex justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </main>
    );
  }

  if (!shouldShowEarnings) {
    return (
      <main className="container mx-auto px-4 py-8 max-w-4xl">
        <Card className="text-center py-12">
          <CardContent>
            <p className="text-muted-foreground">This feature is not currently enabled.</p>
            <Button variant="outline" onClick={() => navigate("/seller")} className="mt-4">
              Back to Dashboard
            </Button>
          </CardContent>
        </Card>
      </main>
    );
  }

  const formatDollars = (cents: number) => `$${(cents / 100).toFixed(2)}`;

  return (
    <main className="container mx-auto px-4 py-8 max-w-6xl">
      <div className="mb-6">
        <Button variant="ghost" onClick={() => navigate("/seller")} className="mb-4">
          <ChevronLeft className="h-4 w-4 mr-1" />
          Back to Dashboard
        </Button>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <TrendingUp className="h-8 w-8" />
              Earnings Dashboard
            </h1>
            <p className="text-muted-foreground mt-1">
              Track your sales performance and download reports
            </p>
          </div>
          <Button onClick={handleExportCSV} disabled={!orders || orders.length === 0}>
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* Date Range Filter */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Date Range
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            <div className="space-y-2">
              <Label htmlFor="startDate">Start Date</Label>
              <Input
                id="startDate"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="endDate">End Date</Label>
              <Input
                id="endDate"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Gross Sales
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-green-600" />
              <span className="text-2xl font-bold">{formatDollars(summary.grossSalesCents)}</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {summary.orderCount} orders
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Platform Fees
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Percent className="h-5 w-5 text-red-500" />
              <span className="text-2xl font-bold">{formatDollars(summary.platformFeesCents)}</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              6.5% intro rate
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Shipping Collected
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Truck className="h-5 w-5 text-blue-500" />
              <span className="text-2xl font-bold">{formatDollars(summary.shippingCollectedCents)}</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              From buyers
            </p>
          </CardContent>
        </Card>

        <Card className="border-primary">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Net Payout
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              <span className="text-2xl font-bold text-primary">
                {formatDollars(summary.netPayoutCents)}
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              After fees
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Monthly Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Monthly Breakdown</CardTitle>
          <CardDescription>Sales performance by month</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="animate-pulse space-y-3">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-16 bg-muted rounded-lg" />
              ))}
            </div>
          ) : monthlyData.length === 0 ? (
            <div className="text-center py-8">
              <Package className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
              <p className="text-muted-foreground">No sales in this date range</p>
            </div>
          ) : (
            <div className="space-y-3">
              {monthlyData.map((month) => (
                <div key={month.month} className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
                  <div>
                    <p className="font-medium">{month.month}</p>
                    <p className="text-sm text-muted-foreground">{month.count} orders</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-lg">{formatDollars(month.net)}</p>
                    <p className="text-sm text-muted-foreground">
                      Gross: {formatDollars(month.gross)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
