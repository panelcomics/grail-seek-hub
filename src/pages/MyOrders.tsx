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
  Package, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  Truck,
  DollarSign,
  MessageSquare,
  AlertCircle
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

interface ClaimWithDetails {
  id: string;
  claimed_at: string;
  total_price: number;
  shipping_method: string;
  is_winner: boolean | null;
  claim_sale_id: string;
  sale_title: string;
  sale_price: number;
  seller_id: string;
  order_id: string | null;
  payment_status: string | null;
  order_total: number | null;
}

type ClaimStatus = 'pending' | 'won' | 'lost' | 'paid' | 'shipped';

const MyOrders = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { showTermsPopup, requireTerms, handleAcceptTerms, handleDeclineTerms } = useTerms();
  const [claims, setClaims] = useState<ClaimWithDetails[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      navigate("/auth");
      return;
    }
    fetchClaims();

    // Set up realtime subscription for claims updates
    const channel = supabase
      .channel("user_claims")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "claims",
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          fetchClaims();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, navigate]);

  const fetchClaims = async () => {
    try {
      setIsLoading(true);

      // Fetch claims with joined claim_sales and orders data
      const { data: claimsData, error: claimsError } = await supabase
        .from("claims")
        .select(`
          id,
          claimed_at,
          total_price,
          shipping_method,
          is_winner,
          claim_sale_id,
          claim_sales (
            title,
            price,
            seller_id
          )
        `)
        .eq("user_id", user?.id)
        .order("claimed_at", { ascending: false });

      if (claimsError) throw claimsError;

      // Fetch orders for these claims
      const claimIds = claimsData?.map(c => c.id) || [];
      const { data: ordersData, error: ordersError } = await supabase
        .from("orders")
        .select("claim_id, id, payment_status, total")
        .in("claim_id", claimIds);

      if (ordersError) throw ordersError;

      // Combine data
      const ordersMap = new Map(ordersData?.map(o => [o.claim_id, o]) || []);
      
      const enrichedClaims: ClaimWithDetails[] = claimsData?.map(claim => {
        const order = ordersMap.get(claim.id);
        const sale = claim.claim_sales as any;
        
        return {
          id: claim.id,
          claimed_at: claim.claimed_at,
          total_price: claim.total_price,
          shipping_method: claim.shipping_method,
          is_winner: claim.is_winner,
          claim_sale_id: claim.claim_sale_id,
          sale_title: sale?.title || "Unknown Sale",
          sale_price: sale?.price || 0,
          seller_id: sale?.seller_id || "",
          order_id: order?.id || null,
          payment_status: order?.payment_status || null,
          order_total: order?.total || null,
        };
      }) || [];

      setClaims(enrichedClaims);
    } catch (error) {
      console.error("Error fetching claims:", error);
      toast.error("Failed to load your orders");
    } finally {
      setIsLoading(false);
    }
  };

  const getClaimStatus = (claim: ClaimWithDetails): ClaimStatus => {
    // Lost if not a winner
    if (claim.is_winner === false) {
      return 'lost';
    }

    // Check order status
    if (claim.order_id && claim.payment_status) {
      if (claim.payment_status === 'paid') {
        // For now, we'll assume paid orders are shipped
        // In the future, you could add a 'shipping_status' field
        return 'shipped';
      }
      if (claim.payment_status === 'pending') {
        return 'pending';
      }
    }

    // Winner but no order yet
    if (claim.is_winner === true) {
      return 'won';
    }

    // Default pending (waiting for winner determination)
    return 'pending';
  };

  const getStatusBadge = (status: ClaimStatus) => {
    switch (status) {
      case 'won':
        return (
          <Badge className="bg-green-500 gap-1">
            <CheckCircle2 className="h-3 w-3" />
            Won - Awaiting Payment
          </Badge>
        );
      case 'paid':
        return (
          <Badge className="bg-blue-500 gap-1">
            <DollarSign className="h-3 w-3" />
            Paid
          </Badge>
        );
      case 'shipped':
        return (
          <Badge className="bg-purple-500 gap-1">
            <Truck className="h-3 w-3" />
            Shipped
          </Badge>
        );
      case 'lost':
        return (
          <Badge variant="destructive" className="gap-1">
            <XCircle className="h-3 w-3" />
            Not Selected
          </Badge>
        );
      case 'pending':
        return (
          <Badge variant="secondary" className="gap-1">
            <Clock className="h-3 w-3" />
            Pending
          </Badge>
        );
    }
  };

  const getStatusIcon = (status: ClaimStatus) => {
    switch (status) {
      case 'won':
        return <CheckCircle2 className="h-5 w-5 text-green-500" />;
      case 'paid':
      case 'shipped':
        return <Truck className="h-5 w-5 text-blue-500" />;
      case 'lost':
        return <XCircle className="h-5 w-5 text-destructive" />;
      case 'pending':
        return <Clock className="h-5 w-5 text-muted-foreground" />;
    }
  };

  const handlePayNowAction = async (claim: ClaimWithDetails) => {
    if (claim.order_id) {
      navigate(`/order/${claim.order_id}`);
    } else {
      toast.error("Order not yet created. Please contact the seller.");
    }
  };

  const handlePayNow = (claim: ClaimWithDetails) => {
    requireTerms(() => handlePayNowAction(claim));
  };

  const handleMessageSellerAction = async (claim: ClaimWithDetails) => {
    try {
      // Check if conversation already exists
      const { data: existingConv, error: convError } = await supabase
        .from("conversations")
        .select("id")
        .eq("buyer_id", user?.id)
        .eq("seller_id", claim.seller_id)
        .eq("sale_id", claim.claim_sale_id)
        .maybeSingle();

      if (convError) throw convError;

      let conversationId = existingConv?.id;

      // Create conversation if it doesn't exist
      if (!conversationId) {
        const { data: newConv, error: createError } = await supabase
          .from("conversations")
          .insert({
            buyer_id: user?.id,
            seller_id: claim.seller_id,
            sale_id: claim.claim_sale_id,
          })
          .select("id")
          .single();

        if (createError) throw createError;
        conversationId = newConv.id;
      }

      // Navigate to messages
      navigate(`/messages?conversation=${conversationId}`);
    } catch (error: any) {
      console.error("Error creating conversation:", error);
      toast.error("Failed to start conversation");
    }
  };

  const handleMessageSeller = (claim: ClaimWithDetails) => {
    requireTerms(() => handleMessageSellerAction(claim));
  };

  const canPay = (status: ClaimStatus) => {
    return status === 'won' || status === 'pending';
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto py-12 px-4 mt-20">
          <p className="text-center text-muted-foreground">Loading your orders...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <div className="container mx-auto py-8 px-4 mt-20">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">My Orders</h1>
          <p className="text-muted-foreground">
            Track your claim sales purchases and payments
          </p>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Claims
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{claims.length}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Won
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                {claims.filter(c => getClaimStatus(c) === 'won' || getClaimStatus(c) === 'paid' || getClaimStatus(c) === 'shipped').length}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Awaiting Payment
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                {claims.filter(c => getClaimStatus(c) === 'won').length}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Completed
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                {claims.filter(c => getClaimStatus(c) === 'shipped').length}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Orders List */}
        <Card>
          <CardHeader>
            <CardTitle>Your Claims</CardTitle>
            <CardDescription>
              All your claim sale purchases and their current status
            </CardDescription>
          </CardHeader>
          <CardContent>
            {claims.length === 0 ? (
              <div className="text-center py-12">
                <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground mb-4">
                  You haven't claimed any items yet
                </p>
                <Button onClick={() => navigate("/")}>
                  Browse Claim Sales
                </Button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Sale</TableHead>
                      <TableHead>Claimed On</TableHead>
                      <TableHead>Method</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {claims.map((claim) => {
                      const status = getClaimStatus(claim);
                      
                      return (
                        <TableRow key={claim.id}>
                          <TableCell>
                            <div>
                              <div className="font-medium">{claim.sale_title}</div>
                              <div className="text-sm text-muted-foreground">
                                ${claim.sale_price.toFixed(2)} item
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="text-sm">
                              {new Date(claim.claimed_at).toLocaleDateString()}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {new Date(claim.claimed_at).toLocaleTimeString()}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-xs">
                              {claim.shipping_method === 'local_pickup' ? 'Local Pickup' : 'Ship'}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="font-semibold">
                              ${claim.total_price.toFixed(2)}
                            </div>
                          </TableCell>
                          <TableCell>
                            {getStatusBadge(status)}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              {canPay(status) && (
                                <Button
                                  size="sm"
                                  onClick={() => handlePayNow(claim)}
                                  className="gap-1"
                                >
                                  <DollarSign className="h-3 w-3" />
                                  Pay Now
                                </Button>
                              )}
                              {status !== 'lost' && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleMessageSeller(claim)}
                                  className="gap-1"
                                >
                                  <MessageSquare className="h-3 w-3" />
                                  Message
                                </Button>
                              )}
                              {status === 'lost' && (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => navigate("/claim-sale/" + claim.claim_sale_id)}
                                  className="gap-1"
                                >
                                  View Sale
                                </Button>
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

        {/* Help Section */}
        <Card className="mt-8 bg-muted/50">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <AlertCircle className="h-5 w-5" />
              Order Status Guide
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 text-sm">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5" />
                <div>
                  <span className="font-semibold">Won - Awaiting Payment:</span> You won this claim! Pay now to secure your item.
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Clock className="h-4 w-4 text-muted-foreground mt-0.5" />
                <div>
                  <span className="font-semibold">Pending:</span> Waiting for the seller to finalize winners or create your invoice.
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Truck className="h-4 w-4 text-blue-500 mt-0.5" />
                <div>
                  <span className="font-semibold">Shipped:</span> Your payment is complete and the item has been shipped or is ready for pickup.
                </div>
              </div>
              <div className="flex items-start gap-3">
                <XCircle className="h-4 w-4 text-destructive mt-0.5" />
                <div>
                  <span className="font-semibold">Not Selected:</span> Unfortunately, you weren't selected as the winner for this claim.
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
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

export default MyOrders;
