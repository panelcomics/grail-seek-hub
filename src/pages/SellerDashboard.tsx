import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Copy, DollarSign, Package } from "lucide-react";
import Navbar from "@/components/Navbar";
import { ShareButton } from "@/components/ShareButton";
import { SellerOrderManagement } from "@/components/SellerOrderManagement";
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
  shipping_tier_id: string | null;
  end_time: string;
}

interface Winner {
  id: string;
  user_id: string;
  claim_id: string;
  username: string;
  email: string;
  has_order: boolean;
}

const SellerDashboard = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [sales, setSales] = useState<ClaimSale[]>([]);
  const [selectedSale, setSelectedSale] = useState<ClaimSale | null>(null);
  const [winners, setWinners] = useState<Winner[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreatingOrders, setIsCreatingOrders] = useState(false);

  useEffect(() => {
    if (!user) {
      navigate("/auth");
      return;
    }
    fetchSales();
  }, [user, navigate]);

  const fetchSales = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from("claim_sales")
        .select(`
          *,
          shipping_tiers (
            cost
          )
        `)
        .eq("seller_id", user?.id)
        .eq("status", "closed")
        .order("end_time", { ascending: false });

      if (error) throw error;
      setSales(data || []);
    } catch (error) {
      console.error("Error fetching sales:", error);
      toast.error("Failed to load sales");
    } finally {
      setIsLoading(false);
    }
  };

  const fetchWinners = async (saleId: string) => {
    try {
      // Fetch winners with their profile info
      const { data: claimsData, error: claimsError } = await supabase
        .from("claims")
        .select(`
          id,
          user_id,
          profiles!claims_user_id_fkey (username)
        `)
        .eq("claim_sale_id", saleId)
        .eq("is_winner", true);

      if (claimsError) throw claimsError;

      // Fetch existing orders for this sale
      const { data: ordersData, error: ordersError } = await supabase
        .from("orders")
        .select("claim_id")
        .eq("claim_sale_id", saleId);

      if (ordersError) throw ordersError;

      const orderClaimIds = new Set(ordersData.map(o => o.claim_id));

      // Fetch user emails from auth (using RPC or profile if email is stored there)
      const formattedWinners = await Promise.all(
        claimsData.map(async (claim: any) => {
          // Note: In production, you'd fetch email from profiles table or use a backend function
          return {
            id: claim.id,
            user_id: claim.user_id,
            claim_id: claim.id,
            username: claim.profiles?.username || "Unknown",
            email: "", // Email would need to be fetched via backend
            has_order: orderClaimIds.has(claim.id),
          };
        })
      );

      setWinners(formattedWinners);
    } catch (error) {
      console.error("Error fetching winners:", error);
      toast.error("Failed to load winners");
    }
  };

  const handleSelectSale = (sale: ClaimSale) => {
    setSelectedSale(sale);
    fetchWinners(sale.id);
  };

  const createInvoice = async (winner: Winner) => {
    if (!selectedSale) return;

    try {
      setIsCreatingOrders(true);

      // Fetch shipping tier cost
      let shippingCost = 0;
      if (selectedSale.shipping_tier_id) {
        const { data: tierData, error: tierError } = await supabase
          .from("shipping_tiers")
          .select("cost")
          .eq("id", selectedSale.shipping_tier_id)
          .single();

        if (!tierError && tierData) {
          shippingCost = tierData.cost;
        }
      }

      const { error } = await supabase.from("orders").insert({
        claim_id: winner.claim_id,
        buyer_id: winner.user_id,
        seller_id: user?.id,
        claim_sale_id: selectedSale.id,
        amount: selectedSale.price,
        shipping_amount: shippingCost,
        payment_status: "pending",
      });

      if (error) throw error;

      toast.success("Invoice created!");
      fetchWinners(selectedSale.id); // Refresh winners list
    } catch (error) {
      console.error("Error creating invoice:", error);
      toast.error("Failed to create invoice");
    } finally {
      setIsCreatingOrders(false);
    }
  };

  const copyPayPalLink = (winner: Winner) => {
    if (!selectedSale) return;

    // Need to fetch shipping cost for PayPal link
    const getShippingCost = async () => {
      if (selectedSale.shipping_tier_id) {
        const { data } = await supabase
          .from("shipping_tiers")
          .select("cost")
          .eq("id", selectedSale.shipping_tier_id)
          .single();
        return data?.cost || 0;
      }
      return 0;
    };

    getShippingCost().then((shippingCost) => {
      const total = (selectedSale.price + shippingCost).toFixed(2);
      const note = `Grail Seeker Claim Sale: ${selectedSale.title} - Winner #${winners.findIndex(w => w.id === winner.id) + 1}`;
      
      // PayPal.me link format (seller would need to set their PayPal.me username)
      const paypalLink = `https://www.paypal.com/paypalme/YOUR_PAYPAL_USERNAME/${total}?note=${encodeURIComponent(note)}`;
      
      navigator.clipboard.writeText(paypalLink);
      toast.success("PayPal link copied! (Update with your PayPal.me username)");
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto py-12 px-4">
          <p className="text-center text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <div className="container mx-auto py-8 px-4 max-w-7xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Seller Dashboard</h1>
          <p className="text-muted-foreground">Manage your sales, orders, and payouts</p>
        </div>

        <Tabs defaultValue="invoices" className="space-y-6">
          <TabsList>
            <TabsTrigger value="invoices">Sales & Invoices</TabsTrigger>
            <TabsTrigger value="orders">Order Management</TabsTrigger>
          </TabsList>

          <TabsContent value="invoices">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Sales List */}
              <Card className="lg:col-span-1">
                <CardHeader>
                  <CardTitle>Closed Sales</CardTitle>
                  <CardDescription>{sales.length} sales</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {sales.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-8">
                        No closed sales yet
                      </p>
                    ) : (
                      sales.map((sale) => (
                        <Button
                          key={sale.id}
                          variant={selectedSale?.id === sale.id ? "default" : "outline"}
                          className="w-full justify-start"
                          onClick={() => handleSelectSale(sale)}
                        >
                          <div className="text-left">
                            <p className="font-semibold">{sale.title}</p>
                            <p className="text-xs opacity-70">
                              {sale.claimed_items} claimed • ${sale.price} each
                            </p>
                          </div>
                        </Button>
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Winners & Invoices */}
              <Card className="lg:col-span-2">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>
                        {selectedSale ? `Winners: ${selectedSale.title}` : "Select a sale"}
                      </CardTitle>
                      <CardDescription>
                        {selectedSale && `${winners.length} winners • $${selectedSale.price} per item`}
                      </CardDescription>
                    </div>
                    {selectedSale && (
                      <ShareButton 
                        url={`/claim-sale/${selectedSale.id}`}
                        title={selectedSale.title}
                        variant="secondary"
                        size="sm"
                      />
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  {!selectedSale ? (
                    <p className="text-center text-muted-foreground py-8">
                      Select a closed sale to view winners and send invoices
                    </p>
                  ) : winners.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">
                      No winners found
                    </p>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Rank</TableHead>
                          <TableHead>Winner</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {winners.map((winner, idx) => (
                          <TableRow key={winner.id}>
                            <TableCell>#{idx + 1}</TableCell>
                            <TableCell>@{winner.username}</TableCell>
                            <TableCell>
                              {winner.has_order ? (
                                <Badge variant="secondary">Invoice Sent</Badge>
                              ) : (
                                <Badge variant="outline">No Invoice</Badge>
                              )}
                            </TableCell>
                            <TableCell className="text-right space-x-2">
                              {!winner.has_order ? (
                                <Button
                                  size="sm"
                                  onClick={() => createInvoice(winner)}
                                  disabled={isCreatingOrders}
                                >
                                  <DollarSign className="h-4 w-4 mr-1" />
                                  Create Invoice
                                </Button>
                              ) : (
                                <>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => copyPayPalLink(winner)}
                                  >
                                    <Copy className="h-4 w-4 mr-1" />
                                    PayPal Link
                                  </Button>
                                </>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="orders">
            <SellerOrderManagement />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default SellerDashboard;
