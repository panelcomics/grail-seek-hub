import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { ArrowRight, Check, X, Ban } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface TradeOffer {
  id: string;
  offered_item_id: string;
  requested_item_id: string;
  initiator_user_id: string;
  target_user_id: string;
  status: string;
  message: string | null;
  created_at: string;
  updated_at: string;
  // Joined data
  offered_item?: {
    title: string;
    series: string;
    issue_number: string;
    images: { primary?: string; others?: string[] } | null;
  };
  requested_item?: {
    title: string;
    series: string;
    issue_number: string;
    images: { primary?: string; others?: string[] } | null;
  };
  initiator?: {
    username: string;
  };
  target?: {
    username: string;
  };
}

export default function MyTrades() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  
  const [sentOffers, setSentOffers] = useState<TradeOffer[]>([]);
  const [receivedOffers, setReceivedOffers] = useState<TradeOffer[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading) return;
    
    if (!user) {
      toast.error("Please log in to view your trades");
      navigate("/auth");
      return;
    }
    
    fetchTrades();
  }, [user, authLoading]);

  const fetchTrades = async () => {
    if (!user) return;
    
    try {
      // Fetch trades where user is the initiator (sent)
      const { data: sentData, error: sentError } = await supabase
        .from("inventory_trade_offers")
        .select("*")
        .eq("initiator_user_id", user.id)
        .order("created_at", { ascending: false });

      if (sentError) throw sentError;

      // Fetch trades where user is the target (received)
      const { data: receivedData, error: receivedError } = await supabase
        .from("inventory_trade_offers")
        .select("*")
        .eq("target_user_id", user.id)
        .order("created_at", { ascending: false });

      if (receivedError) throw receivedError;

      // Enrich with item details
      const allOfferIds = [...(sentData || []), ...(receivedData || [])];
      const itemIds = new Set<string>();
      const userIds = new Set<string>();
      
      allOfferIds.forEach(offer => {
        itemIds.add(offer.offered_item_id);
        itemIds.add(offer.requested_item_id);
        userIds.add(offer.initiator_user_id);
        userIds.add(offer.target_user_id);
      });

      // Fetch inventory items
      const { data: itemsData } = await supabase
        .from("inventory_items")
        .select("id, title, series, issue_number, images")
        .in("id", Array.from(itemIds));

      // Fetch user profiles
      const { data: usersData } = await supabase
        .from("profiles")
        .select("user_id, username")
        .in("user_id", Array.from(userIds));

      const itemsMap = new Map(itemsData?.map(i => [i.id, i]) || []);
      const usersMap = new Map(usersData?.map(u => [u.user_id, u]) || []);

      // Enrich offers
      const enrichOffer = (offer: any): TradeOffer => ({
        ...offer,
        offered_item: itemsMap.get(offer.offered_item_id),
        requested_item: itemsMap.get(offer.requested_item_id),
        initiator: usersMap.get(offer.initiator_user_id),
        target: usersMap.get(offer.target_user_id),
      });

      setSentOffers((sentData || []).map(enrichOffer));
      setReceivedOffers((receivedData || []).map(enrichOffer));
    } catch (error) {
      console.error("Error fetching trades:", error);
      toast.error("Failed to load trades");
    } finally {
      setLoading(false);
    }
  };

  const updateTradeStatus = async (tradeId: string, newStatus: string) => {
    setUpdatingId(tradeId);
    
    try {
      const { error } = await supabase
        .from("inventory_trade_offers")
        .update({ status: newStatus })
        .eq("id", tradeId);

      if (error) throw error;

      toast.success(`Trade offer ${newStatus}`);
      fetchTrades();
    } catch (error: any) {
      console.error("Error updating trade:", error);
      toast.error(error.message || "Failed to update trade");
    } finally {
      setUpdatingId(null);
    }
  };

  const getItemImageUrl = (item?: { images: { primary?: string; others?: string[] } | null }) => {
    if (!item) return "/placeholder.svg";
    if (item.images?.primary) return item.images.primary;
    if (item.images?.others?.[0]) return item.images.others[0];
    return "/placeholder.svg";
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge variant="outline" className="bg-yellow-500/10 text-yellow-600 border-yellow-500/30">Pending</Badge>;
      case "accepted":
        return <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/30">Accepted</Badge>;
      case "rejected":
        return <Badge variant="outline" className="bg-red-500/10 text-red-600 border-red-500/30">Rejected</Badge>;
      case "cancelled":
        return <Badge variant="outline" className="bg-muted text-muted-foreground">Cancelled</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const TradeCard = ({ trade, type }: { trade: TradeOffer; type: "sent" | "received" }) => (
    <Card className="mb-4">
      <CardContent className="p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Items visualization */}
          <div className="flex items-center gap-3 flex-1">
            {/* Offered Item */}
            <div className="text-center flex-1">
              <img
                src={getItemImageUrl(trade.offered_item)}
                alt={trade.offered_item?.title || "Offered item"}
                className="w-20 h-28 object-cover mx-auto rounded mb-1"
              />
              <p className="text-xs font-medium truncate max-w-[100px] mx-auto">
                {trade.offered_item?.title || trade.offered_item?.series || "Unknown"}
              </p>
              {trade.offered_item?.issue_number && (
                <p className="text-xs text-muted-foreground">#{trade.offered_item.issue_number}</p>
              )}
              <p className="text-xs text-muted-foreground mt-1">
                {type === "sent" ? "Your offer" : `From @${trade.initiator?.username || "User"}`}
              </p>
            </div>

            <ArrowRight className="h-5 w-5 text-muted-foreground flex-shrink-0" />

            {/* Requested Item */}
            <div className="text-center flex-1">
              <img
                src={getItemImageUrl(trade.requested_item)}
                alt={trade.requested_item?.title || "Requested item"}
                className="w-20 h-28 object-cover mx-auto rounded mb-1"
              />
              <p className="text-xs font-medium truncate max-w-[100px] mx-auto">
                {trade.requested_item?.title || trade.requested_item?.series || "Unknown"}
              </p>
              {trade.requested_item?.issue_number && (
                <p className="text-xs text-muted-foreground">#{trade.requested_item.issue_number}</p>
              )}
              <p className="text-xs text-muted-foreground mt-1">
                {type === "sent" ? `From @${trade.target?.username || "User"}` : "Your item"}
              </p>
            </div>
          </div>

          {/* Status and Actions */}
          <div className="flex flex-col justify-between items-end gap-2 min-w-[120px]">
            <div className="text-right">
              {getStatusBadge(trade.status)}
              <p className="text-xs text-muted-foreground mt-1">
                {formatDistanceToNow(new Date(trade.created_at), { addSuffix: true })}
              </p>
            </div>

            {trade.status === "pending" && (
              <div className="flex gap-2">
                {type === "sent" ? (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => updateTradeStatus(trade.id, "cancelled")}
                    disabled={updatingId === trade.id}
                  >
                    <Ban className="h-4 w-4 mr-1" />
                    Cancel
                  </Button>
                ) : (
                  <>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => updateTradeStatus(trade.id, "rejected")}
                      disabled={updatingId === trade.id}
                    >
                      <X className="h-4 w-4 mr-1" />
                      Reject
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => updateTradeStatus(trade.id, "accepted")}
                      disabled={updatingId === trade.id}
                    >
                      <Check className="h-4 w-4 mr-1" />
                      Accept
                    </Button>
                  </>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Message */}
        {trade.message && (
          <div className="mt-3 pt-3 border-t">
            <p className="text-sm text-muted-foreground">
              <span className="font-medium">Message:</span> {trade.message}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );

  if (authLoading || loading) {
    return (
      <AppLayout>
        <main className="container py-8">
          <div className="max-w-4xl mx-auto space-y-4">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-32 w-full" />
          </div>
        </main>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <Helmet>
        <title>My Trades | GrailSeeker</title>
        <meta name="description" content="View and manage your trade offers" />
      </Helmet>

      <main className="container py-8">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold mb-6">My Trades</h1>

          <Tabs defaultValue="received" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="received">
                Offers Received
                {receivedOffers.filter(t => t.status === "pending").length > 0 && (
                  <Badge variant="destructive" className="ml-2 h-5 min-w-[20px] px-1.5">
                    {receivedOffers.filter(t => t.status === "pending").length}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="sent">
                Offers Sent
              </TabsTrigger>
            </TabsList>

            <TabsContent value="received">
              {receivedOffers.length === 0 ? (
                <Card>
                  <CardContent className="py-12 text-center">
                    <p className="text-muted-foreground mb-4">
                      You haven't received any trade offers yet.
                    </p>
                    <Button variant="outline" onClick={() => navigate("/marketplace")}>
                      Browse Marketplace
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                receivedOffers.map((trade) => (
                  <TradeCard key={trade.id} trade={trade} type="received" />
                ))
              )}
            </TabsContent>

            <TabsContent value="sent">
              {sentOffers.length === 0 ? (
                <Card>
                  <CardContent className="py-12 text-center">
                    <p className="text-muted-foreground mb-4">
                      You haven't sent any trade offers yet.
                    </p>
                    <Button variant="outline" onClick={() => navigate("/marketplace")}>
                      Find Items to Trade For
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                sentOffers.map((trade) => (
                  <TradeCard key={trade.id} trade={trade} type="sent" />
                ))
              )}
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </AppLayout>
  );
}
