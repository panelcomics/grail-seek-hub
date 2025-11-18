import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BlockUserButton } from "@/components/BlockUserButton";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { Check, X, Eye } from "lucide-react";
import { Helmet } from "react-helmet-async";

interface TradeOffer {
  id: string;
  message: string;
  cash_offer: number | null;
  items_offered: string | null;
  status: string;
  created_at: string;
  from_user_id: string;
  to_user_id: string;
  item_id: string;
  from_user?: { username: string };
  to_user?: { username: string };
  item?: { title: string; series: string; issue_number: string };
}

export default function TradeOffers() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [receivedOffers, setReceivedOffers] = useState<TradeOffer[]>([]);
  const [sentOffers, setSentOffers] = useState<TradeOffer[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      navigate("/auth");
      return;
    }
    fetchOffers();
  }, [user, navigate]);

  const fetchOffers = async () => {
    if (!user) return;

    try {
      // Fetch received offers
      const { data: received, error: recError } = await supabase
        .from("trade_offers")
        .select("*")
        .eq("to_user_id", user.id)
        .order("created_at", { ascending: false });

      if (recError) throw recError;

      // Fetch sent offers
      const { data: sent, error: sentError } = await supabase
        .from("trade_offers")
        .select("*")
        .eq("from_user_id", user.id)
        .order("created_at", { ascending: false });

      if (sentError) throw sentError;

      // Fetch usernames and item details
      const allOffers = [...(received || []), ...(sent || [])];
      if (allOffers.length > 0) {
        const userIds = [...new Set([
          ...allOffers.map(o => o.from_user_id),
          ...allOffers.map(o => o.to_user_id),
        ])];
        const itemIds = [...new Set(allOffers.map(o => o.item_id))];

        const [{ data: profiles }, { data: items }] = await Promise.all([
          supabase.from("public_profiles").select("user_id, username").in("user_id", userIds),
          supabase.from("inventory_items").select("id, title, series, issue_number").in("id", itemIds),
        ]);

        const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);
        const itemMap = new Map(items?.map(i => [i.id, i]) || []);

        const enrichOffers = (offers: any[]) =>
          offers.map(offer => ({
            ...offer,
            from_user: profileMap.get(offer.from_user_id),
            to_user: profileMap.get(offer.to_user_id),
            item: itemMap.get(offer.item_id),
          }));

        setReceivedOffers(enrichOffers(received || []));
        setSentOffers(enrichOffers(sent || []));
      }
    } catch (error) {
      console.error("Error fetching offers:", error);
      toast.error("Failed to load offers");
    } finally {
      setLoading(false);
    }
  };

  const updateOfferStatus = async (offerId: string, status: string) => {
    try {
      const { error } = await supabase
        .from("trade_offers")
        .update({ status })
        .eq("id", offerId);

      if (error) throw error;

      toast.success(`Offer ${status}!`);
      fetchOffers();
    } catch (error: any) {
      console.error("Error updating offer:", error);
      toast.error(error.message || "Failed to update offer");
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "accepted": return "bg-success/10 text-success border-success";
      case "declined": return "bg-destructive/10 text-destructive border-destructive";
      case "pending": return "bg-warning/10 text-warning border-warning";
      default: return "";
    }
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="container mx-auto px-4 py-8">
          <Skeleton className="h-96" />
        </div>
      </AppLayout>
    );
  }

  return (
    <>
      <Helmet>
        <title>Trade Offers - GrailSeeker</title>
        <meta name="description" content="Manage your trade offers" />
      </Helmet>

      <AppLayout>
        <div className="container mx-auto px-4 py-8">
          <h1 className="text-3xl font-bold mb-6">Trade Offers</h1>

          <Tabs defaultValue="received">
            <TabsList className="grid w-full grid-cols-2 max-w-md">
              <TabsTrigger value="received">
                Received ({receivedOffers.length})
              </TabsTrigger>
              <TabsTrigger value="sent">
                Sent ({sentOffers.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="received" className="space-y-4 mt-6">
              {receivedOffers.length === 0 ? (
                <Card className="p-12 text-center">
                  <p className="text-muted-foreground">No received offers yet</p>
                </Card>
              ) : (
                receivedOffers.map((offer) => (
                  <Card key={offer.id}>
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="space-y-1">
                          <CardTitle className="text-lg">
                            Offer for {offer.item?.series || offer.item?.title}
                            {offer.item?.issue_number && ` #${offer.item.issue_number}`}
                          </CardTitle>
                          <p className="text-sm text-muted-foreground">
                            From @{offer.from_user?.username || "User"}
                          </p>
                        </div>
                        <Badge className={getStatusColor(offer.status)}>
                          {offer.status}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <p className="text-sm font-medium">Message:</p>
                        <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                          {offer.message}
                        </p>
                      </div>
                      {offer.cash_offer && (
                        <div>
                          <p className="text-sm font-medium">Cash Offer:</p>
                          <p className="text-lg font-semibold text-primary">
                            ${offer.cash_offer.toFixed(2)}
                          </p>
                        </div>
                      )}
                      {offer.items_offered && (
                        <div>
                          <p className="text-sm font-medium">Items Offered:</p>
                          <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                            {offer.items_offered}
                          </p>
                        </div>
                      )}
                      {offer.status === "pending" && (
                        <div className="flex gap-2 pt-2">
                          <Button
                            onClick={() => updateOfferStatus(offer.id, "accepted")}
                            className="flex-1"
                          >
                            <Check className="mr-2 h-4 w-4" />
                            Accept
                          </Button>
                          <Button
                            onClick={() => updateOfferStatus(offer.id, "declined")}
                            variant="outline"
                            className="flex-1"
                          >
                            <X className="mr-2 h-4 w-4" />
                            Decline
                          </Button>
                          <BlockUserButton
                            userId={offer.from_user_id}
                            userName={offer.from_user?.username}
                            onBlock={() => {
                              updateOfferStatus(offer.id, "declined");
                            }}
                            variant="destructive"
                          />
                        </div>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => navigate(`/trade/${offer.item_id}`)}
                        className="w-full"
                      >
                        <Eye className="mr-2 h-4 w-4" />
                        View Listing
                      </Button>
                    </CardContent>
                  </Card>
                ))
              )}
            </TabsContent>

            <TabsContent value="sent" className="space-y-4 mt-6">
              {sentOffers.length === 0 ? (
                <Card className="p-12 text-center">
                  <p className="text-muted-foreground">No sent offers yet</p>
                </Card>
              ) : (
                sentOffers.map((offer) => (
                  <Card key={offer.id}>
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="space-y-1">
                          <CardTitle className="text-lg">
                            Offer for {offer.item?.series || offer.item?.title}
                            {offer.item?.issue_number && ` #${offer.item.issue_number}`}
                          </CardTitle>
                          <p className="text-sm text-muted-foreground">
                            To @{offer.to_user?.username || "User"}
                          </p>
                        </div>
                        <Badge className={getStatusColor(offer.status)}>
                          {offer.status}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <p className="text-sm font-medium">Your Message:</p>
                        <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                          {offer.message}
                        </p>
                      </div>
                      {offer.cash_offer && (
                        <div>
                          <p className="text-sm font-medium">Cash Offer:</p>
                          <p className="text-lg font-semibold text-primary">
                            ${offer.cash_offer.toFixed(2)}
                          </p>
                        </div>
                      )}
                      {offer.items_offered && (
                        <div>
                          <p className="text-sm font-medium">Items Offered:</p>
                          <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                            {offer.items_offered}
                          </p>
                        </div>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => navigate(`/trade/${offer.item_id}`)}
                        className="w-full"
                      >
                        <Eye className="mr-2 h-4 w-4" />
                        View Listing
                      </Button>
                    </CardContent>
                  </Card>
                ))
              )}
            </TabsContent>
          </Tabs>
        </div>
      </AppLayout>
    </>
  );
}
