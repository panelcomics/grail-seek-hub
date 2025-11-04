import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useTerms } from "@/hooks/useTerms";
import { TermsPopup } from "@/components/TermsPopup";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { 
  DollarSign, 
  Package, 
  TrendingUp, 
  Eye, 
  Send, 
  MessageSquare,
  Plus,
  ExternalLink
} from "lucide-react";
import Navbar from "@/components/Navbar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface ClaimSale {
  id: string;
  title: string;
  price: number;
  total_items: number;
  claimed_items: number;
  status: string;
  start_time: string;
  end_time: string;
  created_at: string;
}

interface RevenueStats {
  totalRevenue: number;
  totalSales: number;
  activeSales: number;
  completedSales: number;
  totalItemsSold: number;
}

const Dashboard = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { showTermsPopup, requireTerms, handleAcceptTerms, handleDeclineTerms } = useTerms();
  const [sales, setSales] = useState<ClaimSale[]>([]);
  const [stats, setStats] = useState<RevenueStats>({
    totalRevenue: 0,
    totalSales: 0,
    activeSales: 0,
    completedSales: 0,
    totalItemsSold: 0,
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      navigate("/auth");
      return;
    }
    fetchDashboardData();

    // Set up realtime subscription for claim sales
    const channel = supabase
      .channel("seller_claim_sales")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "claim_sales",
          filter: `seller_id=eq.${user.id}`,
        },
        () => {
          fetchDashboardData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, navigate]);

  const fetchDashboardData = async () => {
    try {
      setIsLoading(true);

      // Fetch all claim sales for this seller
      const { data: salesData, error: salesError } = await supabase
        .from("claim_sales")
        .select("*")
        .eq("seller_id", user?.id)
        .order("created_at", { ascending: false });

      if (salesError) throw salesError;

      setSales(salesData || []);

      // Calculate stats
      const totalRevenue = salesData?.reduce(
        (sum, sale) => sum + sale.claimed_items * sale.price,
        0
      ) || 0;

      const activeSales = salesData?.filter(s => s.status === "active").length || 0;
      const completedSales = salesData?.filter(s => s.status === "closed").length || 0;
      const totalItemsSold = salesData?.reduce((sum, sale) => sum + sale.claimed_items, 0) || 0;

      setStats({
        totalRevenue,
        totalSales: salesData?.length || 0,
        activeSales,
        completedSales,
        totalItemsSold,
      });
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
      toast.error("Failed to load dashboard");
    } finally {
      setIsLoading(false);
    }
  };

  const handleViewClaims = (saleId: string) => {
    navigate(`/claim-sale/${saleId}`);
  };

  const handleSendInvoiceAction = async (sale: ClaimSale) => {
    // Placeholder for invoice functionality
    toast.success(`Invoice functionality coming soon for ${sale.title}`);
  };

  const handleSendInvoice = (sale: ClaimSale) => {
    requireTerms(() => handleSendInvoiceAction(sale));
  };

  const handleMessageBuyersAction = async (sale: ClaimSale) => {
    // Navigate to messages filtered by this sale
    navigate(`/messages?sale=${sale.id}`);
  };

  const handleMessageBuyers = (sale: ClaimSale) => {
    requireTerms(() => handleMessageBuyersAction(sale));
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return <Badge className="bg-green-500">Active</Badge>;
      case "closed":
        return <Badge variant="secondary">Closed</Badge>;
      case "upcoming":
        return <Badge variant="outline">Upcoming</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "text-green-600 dark:text-green-400";
      case "closed":
        return "text-muted-foreground";
      case "upcoming":
        return "text-blue-600 dark:text-blue-400";
      default:
        return "";
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto py-12 px-4 mt-20">
          <p className="text-center text-muted-foreground">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <div className="container mx-auto py-8 px-4 mt-20">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold mb-2">Seller Dashboard</h1>
            <p className="text-muted-foreground">
              Manage your claim sales and track revenue
            </p>
          </div>
          <Button onClick={() => navigate("/sell/claim-sale")} className="gap-2">
            <Plus className="h-4 w-4" />
            New Claim Sale
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                ${stats.totalRevenue.toFixed(2)}
              </div>
              <p className="text-xs text-muted-foreground">
                From {stats.totalItemsSold} items sold
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Sales</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.activeSales}</div>
              <p className="text-xs text-muted-foreground">
                Currently running
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Completed Sales</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.completedSales}</div>
              <p className="text-xs text-muted-foreground">
                Total claim sales
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Items Sold</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalItemsSold}</div>
              <p className="text-xs text-muted-foreground">
                Total items claimed
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Sales Table */}
        <Card>
          <CardHeader>
            <CardTitle>Your Claim Sales</CardTitle>
            <CardDescription>
              View and manage all your claim sales
            </CardDescription>
          </CardHeader>
          <CardContent>
            {sales.length === 0 ? (
              <div className="text-center py-12">
                <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground mb-4">
                  You haven't created any claim sales yet
                </p>
                <Button onClick={() => navigate("/sell/claim-sale")}>
                  <Plus className="mr-2 h-4 w-4" />
                  Create Your First Claim Sale
                </Button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Title</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Price</TableHead>
                      <TableHead className="text-right">Items</TableHead>
                      <TableHead className="text-right">Claimed</TableHead>
                      <TableHead className="text-right">Revenue</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sales.map((sale) => {
                      const revenue = sale.claimed_items * sale.price;
                      const claimRate = sale.total_items > 0
                        ? Math.round((sale.claimed_items / sale.total_items) * 100)
                        : 0;

                      return (
                        <TableRow key={sale.id}>
                          <TableCell>
                            <div>
                              <div className="font-medium">{sale.title}</div>
                              <div className="text-sm text-muted-foreground">
                                {new Date(sale.created_at).toLocaleDateString()}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            {getStatusBadge(sale.status)}
                          </TableCell>
                          <TableCell className="text-right">
                            ${sale.price.toFixed(2)}
                          </TableCell>
                          <TableCell className="text-right">
                            {sale.total_items}
                          </TableCell>
                          <TableCell className="text-right">
                            <div>
                              <div className="font-medium">{sale.claimed_items}</div>
                              <div className="text-xs text-muted-foreground">
                                {claimRate}%
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className={`font-semibold ${getStatusColor(sale.status)}`}>
                              ${revenue.toFixed(2)}
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleViewClaims(sale.id)}
                                className="gap-1"
                              >
                                <Eye className="h-3 w-3" />
                                View
                              </Button>
                              {sale.claimed_items > 0 && (
                                <>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleSendInvoice(sale)}
                                    className="gap-1"
                                  >
                                    <Send className="h-3 w-3" />
                                    Invoice
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleMessageBuyers(sale)}
                                    className="gap-1"
                                  >
                                    <MessageSquare className="h-3 w-3" />
                                    Message
                                  </Button>
                                </>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Links */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
          <Card className="cursor-pointer hover:bg-accent transition-colors" onClick={() => navigate("/seller/dashboard")}>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Package className="h-5 w-5" />
                View Winners
              </CardTitle>
              <CardDescription>
                See winners from closed sales
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="cursor-pointer hover:bg-accent transition-colors" onClick={() => navigate("/messages")}>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                Messages
              </CardTitle>
              <CardDescription>
                Chat with your buyers
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="cursor-pointer hover:bg-accent transition-colors" onClick={() => navigate("/portfolio")}>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Eye className="h-5 w-5" />
                My Collection
              </CardTitle>
              <CardDescription>
                View your portfolio
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      </div>

      {/* Terms Popup */}
      <TermsPopup
        open={showTermsPopup}
        onAccept={handleAcceptTerms}
        onDecline={handleDeclineTerms}
      />
    </div>
  );
};

export default Dashboard;
