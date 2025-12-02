import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { Loader2, ArrowRight, Package } from "lucide-react";
import { Json } from "@/integrations/supabase/types";

interface InventoryItem {
  id: string;
  title: string | null;
  series: string | null;
  issue_number: string | null;
  images: Json | null;
  user_id: string;
}

interface ListingWithOwner {
  id: string;
  title: string | null;
  series: string | null;
  issue_number: string | null;
  images: Json | null;
  user_id: string;
  inventory_item_id: string;
}

export default function TradeCreate() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  
  const requestedItemId = searchParams.get("item");
  
  const [requestedListing, setRequestedListing] = useState<ListingWithOwner | null>(null);
  const [myInventory, setMyInventory] = useState<InventoryItem[]>([]);
  const [selectedOfferedItem, setSelectedOfferedItem] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!user) {
      toast.error("Please log in to propose a trade");
      navigate("/auth");
      return;
    }
    
    if (!requestedItemId) {
      toast.error("No item specified for trade");
      navigate("/marketplace");
      return;
    }
    
    fetchData();
  }, [user, requestedItemId]);

  const fetchData = async () => {
    try {
      // Fetch the listing the user wants to trade for
      const { data: listingData, error: listingError } = await supabase
        .from("listings")
        .select(`
          id,
          user_id,
          inventory_item_id,
          inventory_items!inner(
            id,
            title,
            series,
            issue_number,
            images,
            user_id
          )
        `)
        .eq("id", requestedItemId)
        .eq("status", "active")
        .maybeSingle();

      if (listingError || !listingData) {
        toast.error("Listing not found or no longer available");
        navigate("/marketplace");
        return;
      }

      // Check if user is trying to trade for their own item
      if (listingData.user_id === user?.id) {
        toast.error("You cannot trade for your own item");
        navigate(`/l/${requestedItemId}`);
        return;
      }

      setRequestedListing({
        id: listingData.id,
        title: listingData.inventory_items?.title || "Unknown",
        series: listingData.inventory_items?.series || "",
        issue_number: listingData.inventory_items?.issue_number || "",
        images: listingData.inventory_items?.images as any,
        user_id: listingData.user_id,
        inventory_item_id: listingData.inventory_item_id,
      });

      // Fetch user's own inventory items that are available for trade
      const { data: inventoryData, error: inventoryError } = await supabase
        .from("inventory_items")
        .select("id, title, series, issue_number, images, user_id")
        .eq("user_id", user?.id)
        .eq("is_for_trade", true)
        .is("sold_at", null);

      if (inventoryError) throw inventoryError;

      setMyInventory(inventoryData || []);
    } catch (error) {
      console.error("Error fetching trade data:", error);
      toast.error("Failed to load trade data");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!user || !requestedListing || !selectedOfferedItem) {
      toast.error("Please select an item to offer");
      return;
    }

    setSubmitting(true);

    try {
      const { error } = await supabase
        .from("inventory_trade_offers")
        .insert({
          offered_item_id: selectedOfferedItem,
          requested_item_id: requestedListing.inventory_item_id,
          initiator_user_id: user.id,
          target_user_id: requestedListing.user_id,
          message: message.trim() || null,
          status: "pending",
        });

      if (error) throw error;

      toast.success("Trade offer sent successfully!");
      navigate("/trades");
    } catch (error: any) {
      console.error("Error creating trade offer:", error);
      toast.error(error.message || "Failed to create trade offer");
    } finally {
      setSubmitting(false);
    }
  };

  const getItemImageUrl = (item: InventoryItem | ListingWithOwner) => {
    const images = item.images as { primary?: string; others?: string[] } | null;
    if (images?.primary) return images.primary;
    if (images?.others?.[0]) return images.others[0];
    return "/placeholder.svg";
  };

  if (loading) {
    return (
      <AppLayout>
        <main className="container py-8">
          <div className="max-w-4xl mx-auto space-y-6">
            <Skeleton className="h-8 w-64" />
            <div className="grid md:grid-cols-2 gap-6">
              <Skeleton className="h-64" />
              <Skeleton className="h-64" />
            </div>
          </div>
        </main>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <Helmet>
        <title>Propose a Trade | GrailSeeker</title>
        <meta name="description" content="Propose a trade for a comic book listing" />
      </Helmet>

      <main className="container py-8">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold mb-6">Propose a Trade</h1>

          {/* Trade Visualization */}
          <div className="grid md:grid-cols-[1fr,auto,1fr] gap-4 items-center mb-8">
            {/* Your Offered Item */}
            <Card className={selectedOfferedItem ? "border-primary" : ""}>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">You Offer</CardTitle>
              </CardHeader>
              <CardContent>
                {selectedOfferedItem ? (
                  (() => {
                    const item = myInventory.find(i => i.id === selectedOfferedItem);
                    if (!item) return null;
                    return (
                      <div className="text-center">
                        <img
                          src={getItemImageUrl(item)}
                          alt={item.title}
                          className="w-32 h-44 object-cover mx-auto rounded-md mb-2"
                        />
                        <p className="font-medium text-sm">
                          {item.title || item.series}
                          {item.issue_number && ` #${item.issue_number}`}
                        </p>
                      </div>
                    );
                  })()
                ) : (
                  <div className="h-44 flex items-center justify-center text-muted-foreground text-sm">
                    Select an item below
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Arrow */}
            <div className="hidden md:flex items-center justify-center">
              <ArrowRight className="h-8 w-8 text-muted-foreground" />
            </div>

            {/* Requested Item */}
            <Card className="border-secondary">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">You Want</CardTitle>
              </CardHeader>
              <CardContent>
                {requestedListing && (
                  <div className="text-center">
                    <img
                      src={getItemImageUrl(requestedListing)}
                      alt={requestedListing.title}
                      className="w-32 h-44 object-cover mx-auto rounded-md mb-2"
                    />
                    <p className="font-medium text-sm">
                      {requestedListing.title || requestedListing.series}
                      {requestedListing.issue_number && ` #${requestedListing.issue_number}`}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Select Item to Offer */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Select an Item from Your Inventory</CardTitle>
              <p className="text-sm text-muted-foreground">
                Only items marked as "Available for Trade" are shown below.
              </p>
            </CardHeader>
            <CardContent>
              {myInventory.length === 0 ? (
                <div className="text-center py-8">
                  <Package className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                  <p className="text-muted-foreground mb-4">
                    You don't have any items available for trade.
                  </p>
                  <Button variant="outline" onClick={() => navigate("/inventory")}>
                    Go to My Inventory
                  </Button>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                  {myInventory.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => setSelectedOfferedItem(item.id)}
                      className={`p-2 rounded-lg border-2 transition-all text-left ${
                        selectedOfferedItem === item.id
                          ? "border-primary bg-primary/5"
                          : "border-border hover:border-primary/50"
                      }`}
                    >
                      <img
                        src={getItemImageUrl(item)}
                        alt={item.title}
                        className="w-full aspect-[2/3] object-cover rounded mb-2"
                      />
                      <p className="text-xs font-medium truncate">
                        {item.title || item.series}
                      </p>
                      {item.issue_number && (
                        <p className="text-xs text-muted-foreground">
                          #{item.issue_number}
                        </p>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Message */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Add a Message (Optional)</CardTitle>
            </CardHeader>
            <CardContent>
              <Label htmlFor="message" className="sr-only">Message</Label>
              <Textarea
                id="message"
                placeholder="Add a note to the seller about your trade offer..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={3}
              />
            </CardContent>
          </Card>

          {/* Submit */}
          <div className="flex gap-4">
            <Button
              variant="outline"
              onClick={() => navigate(-1)}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={!selectedOfferedItem || submitting}
              className="flex-1"
            >
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Send Trade Offer
            </Button>
          </div>
        </div>
      </main>
    </AppLayout>
  );
}
