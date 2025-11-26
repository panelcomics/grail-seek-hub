import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ExternalLink } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface Offer {
  id: string;
  listing_id: string;
  offer_amount: number;
  status: string;
  created_at: string;
  listing_title?: string;
  listing_image?: string | null;
}

interface Trade {
  id: string;
  listing_id: string;
  status: string;
  created_at: string;
  offer_title: string;
  offer_issue?: string | null;
  listing_title?: string;
  listing_image?: string | null;
}

const MyOffersAndTrades = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [offers, setOffers] = useState<Offer[]>([]);
  const [trades, setTrades] = useState<Trade[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [offersError, setOffersError] = useState<string | null>(null);
  const [tradesError, setTradesError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      navigate("/auth");
      return;
    }
    loadData();
  }, [user, navigate]);

  const loadData = async () => {
    if (!user) return;

    setIsLoading(true);
    try {
      await Promise.all([
        fetchOffers(),
        fetchTrades(),
      ]);
    } catch (error) {
      console.error("[MY-OFFERS] Error loading data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchOffers = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from("offers")
        .select("id, listing_id, offer_amount, status, created_at")
        .eq("buyer_id", user.id)
        .order("created_at", { ascending: false })
        .limit(100);

      if (error) {
        console.error("[MY-OFFERS] Error fetching offers:", error);
        setOffersError("We couldn't load your offers. Please try again.");
        return;
      }

      // Fetch listing details for each offer
      const offersWithDetails = await Promise.all(
        (data || []).map(async (offer) => {
          const { data: listing } = await supabase
            .from("inventory_items")
            .select("title, images")
            .eq("id", offer.listing_id)
            .maybeSingle();

          // Extract front image URL
          let listingImage = null;
          if (listing?.images && typeof listing.images === 'object') {
            const images = listing.images as any;
            listingImage = images.front || null;
          }
          
          return {
            ...offer,
            listing_title: listing?.title || "Unknown Listing",
            listing_image: listingImage,
          };
        })
      );

      setOffers(offersWithDetails);
      setOffersError(null);
    } catch (error) {
      console.error("[MY-OFFERS] Error in fetchOffers:", error);
      setOffersError("We couldn't load your offers. Please try again.");
    }
  };

  const fetchTrades = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from("trade_requests")
        .select("id, listing_id, status, created_at, offer_title, offer_issue")
        .eq("buyer_id", user.id)
        .order("created_at", { ascending: false })
        .limit(100);

      if (error) {
        console.error("[MY-OFFERS] Error fetching trades:", error);
        setTradesError("We couldn't load your trades. Please try again.");
        return;
      }

      // Fetch listing details for each trade
      const tradesWithDetails = await Promise.all(
        (data || []).map(async (trade) => {
          const { data: listing } = await supabase
            .from("inventory_items")
            .select("title, images")
            .eq("id", trade.listing_id)
            .maybeSingle();

          // Extract front image URL
          let listingImage = null;
          if (listing?.images && typeof listing.images === 'object') {
            const images = listing.images as any;
            listingImage = images.front || null;
          }
          
          return {
            ...trade,
            listing_title: listing?.title || "Unknown Listing",
            listing_image: listingImage,
          };
        })
      );

      setTrades(tradesWithDetails);
      setTradesError(null);
    } catch (error) {
      console.error("[MY-OFFERS] Error in fetchTrades:", error);
      setTradesError("We couldn't load your trades. Please try again.");
    }
  };

  const getOfferStatusBadge = (status: string) => {
    switch (status.toLowerCase()) {
      case "pending":
        return <Badge variant="outline">Pending</Badge>;
      case "accepted":
        return <Badge className="bg-green-500 hover:bg-green-600">Accepted</Badge>;
      case "declined":
        return <Badge variant="destructive">Declined</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getTradeStatusBadge = (status: string) => {
    switch (status.toLowerCase()) {
      case "pending":
        return <Badge variant="outline">Pending</Badge>;
      case "approved":
        return <Badge className="bg-green-500 hover:bg-green-600">Approved</Badge>;
      case "declined":
        return <Badge variant="destructive">Declined</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="space-y-6">
          <div>
            <Skeleton className="h-10 w-64 mb-2" />
            <Skeleton className="h-6 w-96" />
          </div>
          <Skeleton className="h-[400px]" />
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight mb-2">My Offers & Trades</h1>
        <p className="text-muted-foreground">
          Track the status of your offers and trade requests.
        </p>
      </div>

      <Tabs defaultValue="offers" className="space-y-6">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="offers">
            Offers ({offers.length})
          </TabsTrigger>
          <TabsTrigger value="trades">
            Trades ({trades.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="offers">
          <Card>
            <CardHeader>
              <CardTitle>My Offers</CardTitle>
              <CardDescription>
                Price offers you've submitted to sellers
              </CardDescription>
            </CardHeader>
            <CardContent>
              {offersError ? (
                <p className="text-center text-muted-foreground py-8">{offersError}</p>
              ) : offers.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  You haven't submitted any offers yet.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Listing</TableHead>
                        <TableHead>Offer Amount</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead className="text-right">Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {offers.map((offer) => (
                        <TableRow key={offer.id}>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              {offer.listing_image && (
                                <img
                                  src={offer.listing_image}
                                  alt=""
                                  className="h-16 w-12 object-cover rounded border"
                                />
                              )}
                              <span className="font-medium">{offer.listing_title}</span>
                            </div>
                          </TableCell>
                          <TableCell className="font-semibold">
                            ${offer.offer_amount.toFixed(2)}
                          </TableCell>
                          <TableCell>{getOfferStatusBadge(offer.status)}</TableCell>
                          <TableCell>
                            {new Date(offer.created_at).toLocaleDateString()}
                          </TableCell>
                          <TableCell className="text-right">
                            <Link
                              to={`/l/${offer.listing_id}`}
                              className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
                            >
                              View Listing
                              <ExternalLink className="h-3 w-3" />
                            </Link>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="trades">
          <Card>
            <CardHeader>
              <CardTitle>My Trade Requests</CardTitle>
              <CardDescription>
                Comic trades you've proposed to sellers
              </CardDescription>
            </CardHeader>
            <CardContent>
              {tradesError ? (
                <p className="text-center text-muted-foreground py-8">{tradesError}</p>
              ) : trades.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  You haven't submitted any trade requests yet.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Listing (What You Want)</TableHead>
                        <TableHead>Your Offer</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead className="text-right">Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {trades.map((trade) => {
                        const yourOffer = trade.offer_issue 
                          ? `${trade.offer_title} #${trade.offer_issue}` 
                          : trade.offer_title;

                        return (
                          <TableRow key={trade.id}>
                            <TableCell>
                              <div className="flex items-center gap-3">
                                {trade.listing_image && (
                                  <img
                                    src={trade.listing_image}
                                    alt=""
                                    className="h-16 w-12 object-cover rounded border"
                                  />
                                )}
                                <span className="font-medium">{trade.listing_title}</span>
                              </div>
                            </TableCell>
                            <TableCell className="font-medium">{yourOffer}</TableCell>
                            <TableCell>{getTradeStatusBadge(trade.status)}</TableCell>
                            <TableCell>
                              {new Date(trade.created_at).toLocaleDateString()}
                            </TableCell>
                            <TableCell className="text-right">
                              <Link
                                to={`/l/${trade.listing_id}`}
                                className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
                              >
                                View Listing
                                <ExternalLink className="h-3 w-3" />
                              </Link>
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
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default MyOffersAndTrades;
