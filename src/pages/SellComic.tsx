import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Loader2, DollarSign, Gavel, Repeat2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import Navbar from "@/components/Navbar";
import { formatComicDisplay } from "@/lib/comics/format";
import Footer from "@/components/Footer";
import { ComicImageCarousel } from "@/components/ComicImageCarousel";

export default function SellComic() {
  const { comicId } = useParams();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  
  const [comic, setComic] = useState<any>(null);
  const [listingType, setListingType] = useState<"fixed" | "auction">("fixed");
  const [price, setPrice] = useState("");
  const [startBid, setStartBid] = useState("");
  const [reserve, setReserve] = useState("");
  const [durationDays, setDurationDays] = useState("7");
  const [shippingPrice, setShippingPrice] = useState("5.00");
  const [privateNotes, setPrivateNotes] = useState("");
  const [estimatedValue, setEstimatedValue] = useState("$150-200");
  
  // Trade/Sale toggles
  const [forSale, setForSale] = useState(false);
  const [forTrade, setForTrade] = useState(false);
  const [inSearchOf, setInSearchOf] = useState("");
  const [tradeNotes, setTradeNotes] = useState("");

  useEffect(() => {
    // Wait for auth to finish loading before checking user
    if (authLoading) return;
    
    if (!user) {
      navigate("/auth");
      return;
    }
    fetchComic();
  }, [comicId, authLoading]);

  async function fetchComic() {
    if (!comicId) return;
    
    try {
      const { data, error } = await supabase
        .from("inventory_items")
        .select("*")
        .eq("id", comicId)
        .single();

      if (error) throw error;
      
      if (data.user_id !== user?.id) {
        toast.error("You don't own this item");
        navigate("/my-inventory");
        return;
      }

      setComic(data);
      
      // Load existing values
      setForSale(data.listing_status === "listed");
      setForTrade(data.is_for_trade || false);
      setInSearchOf(data.in_search_of || "");
      setTradeNotes(data.trade_notes || "");
      
      if (data.listed_price) {
        setPrice(data.listed_price.toString());
      } else {
        // Set suggested price based on estimated value (mock for now)
        const midValue = 175; // Average of 150-200
        setPrice(midValue.toString());
        setStartBid((midValue * 0.7).toFixed(0));
      }
    } catch (error) {
      console.error("Error fetching item:", error);
      toast.error("Failed to load item");
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user || !comic) return;

    // Validation
    if (!forSale && !forTrade) {
      toast.error("Please select at least one: List for Sale or List for Trade");
      return;
    }

    if (forSale && !price) {
      toast.error("Please enter a sale price");
      return;
    }

    setSubmitting(true);

    try {
      // Update inventory item with sale/trade flags
      const inventoryUpdate: any = {
        listing_status: forSale ? "listed" : "not_listed",
        listed_price: forSale ? parseFloat(price) : null,
        is_for_trade: forTrade,
        in_search_of: forTrade ? inSearchOf.trim() : null,
        trade_notes: forTrade ? tradeNotes.trim() : null,
      };

      const { error: updateError } = await supabase
        .from("inventory_items")
        .update(inventoryUpdate)
        .eq("id", comic.id);

      if (updateError) throw updateError;

      // If listing for sale, create a listing in the listings table
      if (forSale) {
        const listingData: any = {
          user_id: user.id,
          comic_id: comic.id,
          inventory_item_id: comic.id,
          type: listingType,
          image_url: comic.images?.front || null,
          title: comic.title || comic.series,
          issue_number: comic.issue_number,
          volume_name: comic.series,
          cover_date: comic.cover_date,
          condition_notes: comic.condition,
          details: comic.details,
          shipping_price: parseFloat(shippingPrice),
          private_notes: privateNotes.trim() || null,
          status: "active",
        };

        if (listingType === "fixed") {
          listingData.price = parseFloat(price);
        } else {
          listingData.start_bid = parseFloat(startBid);
          listingData.reserve = reserve ? parseFloat(reserve) : null;
          listingData.duration_days = parseInt(durationDays);
          
          const endsAt = new Date();
          endsAt.setDate(endsAt.getDate() + parseInt(durationDays));
          listingData.ends_at = endsAt.toISOString();
        }

        const { error: listingError } = await supabase
          .from("listings")
          .insert(listingData);

        if (listingError) throw listingError;
      }

      const messages = [];
      if (forSale) messages.push("listed for sale");
      if (forTrade) messages.push("listed for trade");
      
      toast.success(`Item ${messages.join(" and ")}!`);
      navigate("/my-inventory");
    } catch (error) {
      console.error("Error creating listing:", error);
      toast.error("Failed to create listing");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading || authLoading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <main className="flex-1 container py-8 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin" />
        </main>
        <Footer />
      </div>
    );
  }

  if (!comic) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <main className="flex-1 container py-8">
          <div className="max-w-2xl mx-auto text-center">
            <h1 className="text-2xl font-bold mb-4">Comic not found</h1>
            <Button onClick={() => navigate("/my-inventory")}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Inventory
            </Button>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      
      <main className="flex-1 container py-8">
        <div className="max-w-4xl mx-auto space-y-6">
          <Button
            variant="ghost"
            onClick={() => navigate("/my-inventory")}
            className="mb-4"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Inventory
          </Button>

          <Card>
            <CardHeader>
              <CardTitle>List Your Item</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Comic Preview */}
                <div className="space-y-4">
                  <div className="w-full max-w-md mx-auto">
                    {comic.images?.front ? (
                      <img src={comic.images.front} alt={comic.title || comic.series} className="w-full rounded-lg" />
                    ) : (
                      <div className="aspect-[2/3] bg-muted rounded-lg flex items-center justify-center">
                        <p className="text-muted-foreground">No image</p>
                      </div>
                    )}
                  </div>
                  
                  <div className="space-y-2">
                    <h3 className="text-xl font-bold">
                      {comic.series || comic.title}
                      {comic.issue_number && ` #${comic.issue_number}`}
                    </h3>

                    <div className="text-sm text-muted-foreground space-y-1">
                      {comic.cover_date && (
                        <div>Cover Date: {new Date(comic.cover_date).toLocaleDateString()}</div>
                      )}
                      {comic.publisher && (
                        <div>Publisher: {comic.publisher}</div>
                      )}
                      {comic.grade && (
                        <div>Grade: {comic.grade}</div>
                      )}
                    </div>

                    {comic.details && (
                      <p className="text-sm pt-2">
                        <span className="font-medium">Details:</span> {comic.details}
                      </p>
                    )}

                    {comic.condition && (
                      <p className="text-sm pt-2">
                        <span className="font-medium">Condition:</span> {comic.condition}
                      </p>
                    )}
                  </div>
                </div>

                {/* List for Sale Section */}
                <div className="space-y-4 border-t pt-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <DollarSign className="h-5 w-5 text-primary" />
                      <Label htmlFor="for-sale" className="text-base font-semibold">
                        List for Sale
                      </Label>
                    </div>
                    <Switch
                      id="for-sale"
                      checked={forSale}
                      onCheckedChange={setForSale}
                    />
                  </div>

                  {forSale && (
                    <>
                      {/* Listing Type Toggle */}
                      <div className="space-y-4 pl-4 border-l-2 border-primary">
                        <div className="flex items-center justify-between">
                          <Label className="text-sm">
                            {listingType === "fixed" ? "Fixed Price" : "Auction"}
                          </Label>
                          <Switch
                            checked={listingType === "auction"}
                            onCheckedChange={(checked) =>
                              setListingType(checked ? "auction" : "fixed")
                            }
                          />
                        </div>

                        {listingType === "fixed" ? (
                          <div className="space-y-2">
                            <Label htmlFor="price">Sale Price ($) *</Label>
                            <Input
                              id="price"
                              type="number"
                              step="0.01"
                              min="1"
                              value={price}
                              onChange={(e) => setPrice(e.target.value)}
                              placeholder="175.00"
                              required={forSale}
                            />
                          </div>
                        ) : (
                          <div className="space-y-4">
                            <div className="space-y-2">
                              <Label htmlFor="startBid">Starting Bid ($) *</Label>
                              <Input
                                id="startBid"
                                type="number"
                                step="0.01"
                                min="1"
                                value={startBid}
                                onChange={(e) => setStartBid(e.target.value)}
                                placeholder="120.00"
                                required={forSale && listingType === "auction"}
                              />
                            </div>

                            <div className="space-y-2">
                              <Label htmlFor="reserve">Reserve Price ($ - Optional)</Label>
                              <Input
                                id="reserve"
                                type="number"
                                step="0.01"
                                min="1"
                                value={reserve}
                                onChange={(e) => setReserve(e.target.value)}
                                placeholder="150.00"
                              />
                              <p className="text-xs text-muted-foreground">
                                Minimum price you'll accept
                              </p>
                            </div>

                            <div className="space-y-2">
                              <Label htmlFor="duration">Auction Duration</Label>
                              <Select value={durationDays} onValueChange={setDurationDays}>
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="1">1 Day</SelectItem>
                                  <SelectItem value="3">3 Days</SelectItem>
                                  <SelectItem value="5">5 Days</SelectItem>
                                  <SelectItem value="7">7 Days</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                        )}

                        <div className="space-y-2">
                          <Label htmlFor="shipping">Shipping Price ($)</Label>
                          <Input
                            id="shipping"
                            type="number"
                            step="0.01"
                            min="0"
                            value={shippingPrice}
                            onChange={(e) => setShippingPrice(e.target.value)}
                            required={forSale}
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="privateNotes">
                            Private Notes (Visible to you only)
                          </Label>
                          <Textarea
                            id="privateNotes"
                            value={privateNotes}
                            onChange={(e) => setPrivateNotes(e.target.value)}
                            placeholder="e.g. Min acceptable offer, defects to note during packing..."
                            rows={3}
                          />
                        </div>
                      </div>
                    </>
                  )}
                </div>

                {/* List for Trade Section */}
                <div className="space-y-4 border-t pt-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Repeat2 className="h-5 w-5 text-primary" />
                      <Label htmlFor="for-trade" className="text-base font-semibold">
                        List for Trade / Swap
                      </Label>
                    </div>
                    <Switch
                      id="for-trade"
                      checked={forTrade}
                      onCheckedChange={setForTrade}
                    />
                  </div>

                  {forTrade && (
                    <div className="space-y-3 pl-4 border-l-2 border-primary">
                      <div className="space-y-2">
                        <Label htmlFor="in-search-of">
                          In Search Of
                        </Label>
                        <Input
                          id="in-search-of"
                          value={inSearchOf}
                          onChange={(e) => setInSearchOf(e.target.value)}
                          placeholder="(Optional) Tell others what you're looking for — e.g. ASM #300, Hulk #181, or Silver Age keys."
                        />
                        <p className="text-xs text-muted-foreground">
                          Adding what you're looking for helps attract better trade offers.
                        </p>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="trade-notes">Trade Notes (optional)</Label>
                        <Textarea
                          id="trade-notes"
                          value={tradeNotes}
                          onChange={(e) => setTradeNotes(e.target.value)}
                          placeholder="Extra details, preferences, or conditions for this trade."
                          rows={3}
                        />
                      </div>
                    </div>
                  )}
                </div>

                <Button
                  type="submit"
                  disabled={submitting}
                  className="w-full"
                  size="lg"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>Save Listing</>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </main>
      
      <Footer />
    </div>
  );
}
