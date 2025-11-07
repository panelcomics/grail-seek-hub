import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Loader2, DollarSign, Gavel } from "lucide-react";
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

  useEffect(() => {
    // Wait for auth to finish loading before checking user
    if (authLoading) return;
    
    if (!user) {
      navigate("/auth");
      return;
    }
    fetchComic();
  }, [comicId, user, authLoading]);

  async function fetchComic() {
    if (!comicId) return;
    
    try {
      const { data, error } = await supabase
        .from("user_comics")
        .select("*")
        .eq("id", comicId)
        .single();

      if (error) throw error;
      
      if (data.user_id !== user?.id) {
        toast.error("You don't own this comic");
        navigate("/my-collection");
        return;
      }

      setComic(data);
      // Set suggested price based on estimated value (mock for now)
      const midValue = 175; // Average of 150-200
      setPrice(midValue.toString());
      setStartBid((midValue * 0.7).toFixed(0));
    } catch (error) {
      console.error("Error fetching comic:", error);
      toast.error("Failed to load comic");
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user || !comic) return;

    setSubmitting(true);

    try {
      const listingData: any = {
        user_id: user.id,
        comic_id: comic.id,
        type: listingType,
        image_url: comic.image_url,
        title: comic.title,
        issue_number: comic.issue_number,
        volume_name: comic.volume_name,
        cover_date: comic.cover_date,
        condition_notes: comic.condition_notes,
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

      const { error } = await supabase
        .from("listings")
        .insert(listingData);

      if (error) throw error;

      toast.success("Comic listed for sale!");
      navigate("/my-collection");
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
            <Button onClick={() => navigate("/my-collection")}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Collection
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
            onClick={() => navigate("/my-collection")}
            className="mb-4"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Collection
          </Button>

          <Card>
            <CardHeader>
              <CardTitle>Sell Your Comic</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Comic Preview */}
                <div className="space-y-4">
                  <div className="w-full max-w-md mx-auto">
                    <ComicImageCarousel 
                      comicId={comic.id}
                      fallbackUrl={comic.image_url}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    {(() => {
                      const { withYear, storyTitle, publisher } = formatComicDisplay({
                        volume: { name: comic.volume_name },
                        title: comic.title,
                        issue_number: comic.issue_number,
                        cover_date: comic.cover_date,
                      });
                      
                      return (
                        <>
                          <h3 className="text-xl font-bold">{withYear}</h3>
                          {storyTitle && (
                            <p className="italic text-sm text-muted-foreground">
                              Story: {storyTitle}
                            </p>
                          )}
                        </>
                      );
                    })()}

                    <div className="text-sm text-muted-foreground space-y-1">
                      {comic.cover_date && (
                        <div>Cover Date: {new Date(comic.cover_date).toLocaleDateString()}</div>
                      )}
                      {comic.volume_name && (
                        <div>Volume: {comic.volume_name}</div>
                      )}
                    </div>

                    {comic.details && (
                      <p className="text-sm pt-2">
                        <span className="font-medium">Details:</span> {comic.details}
                      </p>
                    )}

                    {comic.condition_notes && (
                      <p className="text-sm pt-2">
                        <span className="font-medium">Condition:</span> {comic.condition_notes}
                      </p>
                    )}
                  </div>

                  {/* Price Guide */}
                  <div className="bg-primary/5 p-4 rounded-lg border border-primary/20">
                    <p className="text-sm font-medium text-primary">
                      Estimated Fair Market Value: {estimatedValue}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Based on recent sales data
                    </p>
                  </div>
                </div>

                {/* Listing Type Toggle */}
                <div className="space-y-4 border-t pt-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {listingType === "fixed" ? (
                        <DollarSign className="h-5 w-5 text-primary" />
                      ) : (
                        <Gavel className="h-5 w-5 text-primary" />
                      )}
                      <Label className="text-base">
                        {listingType === "fixed" ? "Fixed Price" : "Auction"}
                      </Label>
                    </div>
                    <Switch
                      checked={listingType === "auction"}
                      onCheckedChange={(checked) =>
                        setListingType(checked ? "auction" : "fixed")
                      }
                    />
                  </div>

                  {listingType === "fixed" ? (
                    <div className="space-y-2">
                      <Label htmlFor="price">Sale Price ($)</Label>
                      <Input
                        id="price"
                        type="number"
                        step="0.01"
                        min="1"
                        value={price}
                        onChange={(e) => setPrice(e.target.value)}
                        placeholder="175.00"
                        required
                      />
                      <p className="text-xs text-muted-foreground">
                        Suggested: ${price} (based on FMV)
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="startBid">Starting Bid ($)</Label>
                        <Input
                          id="startBid"
                          type="number"
                          step="0.01"
                          min="1"
                          value={startBid}
                          onChange={(e) => setStartBid(e.target.value)}
                          placeholder="120.00"
                          required
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
                      required
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

                <Button
                  type="submit"
                  disabled={submitting}
                  className="w-full"
                  size="lg"
                  variant="premium"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      Listing...
                    </>
                  ) : (
                    <>List for Sale</>
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
