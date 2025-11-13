import { useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { ArrowLeft, Plus, Check, Loader2, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { useState, useEffect } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface ComicDetailState {
  id: number;
  name: string;
  issue_number: string;
  volume: string;
  cover_date: string;
  image: string | null;
  description?: string;
  userPhotoBase64?: string;
  ocrText?: string;
}

export default function ResultDetail() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [adding, setAdding] = useState(false);
  const [isInCollection, setIsInCollection] = useState(false);
  const [savedItemId, setSavedItemId] = useState<string | null>(null);
  const [conditionNotes, setConditionNotes] = useState("");
  const [forTrade, setForTrade] = useState(false);
  const [inSearchOf, setInSearchOf] = useState("");
  const [tradeNotes, setTradeNotes] = useState("");

  const comic = location.state as ComicDetailState;

  useEffect(() => {
    if (!comic || authLoading) return;
    checkIfInCollection();
  }, [comic, user, authLoading]);

  async function checkIfInCollection() {
    if (!user || !comic?.id) return;
    
    const { data } = await supabase
      .from("inventory_items")
      .select("id")
      .eq("user_id", user.id)
      .eq("comicvine_issue_id", comic.id.toString())
      .maybeSingle();

    if (data) {
      setIsInCollection(true);
      setSavedItemId(data.id);
    }
  }

  async function uploadPhotoToStorage(base64: string): Promise<string | null> {
    if (!user) return null;

    try {
      const response = await fetch(`data:image/jpeg;base64,${base64}`);
      const blob = await response.blob();
      
      const fileName = `${Date.now()}.jpg`;
      const filePath = `${user.id}/${fileName}`;

      const { error } = await supabase.storage
        .from("comic-photos")
        .upload(filePath, blob, {
          contentType: "image/jpeg",
          upsert: false
        });

      if (error) throw error;

      const { data: { publicUrl } } = supabase.storage
        .from("comic-photos")
        .getPublicUrl(filePath);

      return publicUrl;
    } catch (error) {
      console.error("Error uploading photo:", error);
      return null;
    }
  }

  async function handleAddToCollection() {
    if (!user) {
      toast.error("Please sign in to save scanned books to your collection");
      return;
    }

    if (!comic) {
      toast.error("Comic data not found");
      return;
    }

    // Validate trade settings
    if (forTrade && !inSearchOf.trim()) {
      toast.error("Please specify what you're looking for in trade");
      return;
    }

    setAdding(true);

    try {
      // Upload user's scanned photo if available
      let imageUrl = null;
      if (comic.userPhotoBase64) {
        imageUrl = await uploadPhotoToStorage(comic.userPhotoBase64);
      }

      // Prepare images object
      const images = imageUrl ? { front: imageUrl } : null;

      const { data: newItem, error } = await supabase
        .from("inventory_items")
        .insert({
          user_id: user.id,
          comicvine_issue_id: comic.id.toString(),
          title: comic.name,
          series: comic.volume || comic.name,
          issue_number: comic.issue_number || null,
          cover_date: comic.cover_date || null,
          images: images,
          condition: conditionNotes.trim() || "Good",
          details: comic.ocrText || null,
          is_for_trade: forTrade,
          in_search_of: forTrade ? inSearchOf.trim() : null,
          trade_notes: forTrade ? tradeNotes.trim() : null,
        })
        .select()
        .single();

      if (error) {
        console.error("Save error:", error);
        if (error.code === "23505") {
          toast.error("This comic is already in your collection");
        } else {
          toast.error("We couldn't save this item. Please check that you're signed in and try again.");
        }
        return;
      }

      if (newItem) {
        setSavedItemId(newItem.id);
        setIsInCollection(true);
        
        if (forTrade) {
          toast.success("Added to collection and listed for trade!");
          navigate("/my-inventory");
        } else {
          toast.success("Added to collection!");
          navigate("/my-collection");
        }
      }
    } catch (err) {
      console.error("Unexpected error:", err);
      toast.error("We couldn't save this item. Please check that you're signed in and try again.");
    } finally {
      setAdding(false);
    }
  }

  // Show auth prompt if not logged in
  if (!authLoading && !user) {
    return (
      <AppLayout>
        <main className="flex-1 container py-8">
...
        </main>
      </AppLayout>
    );
  }

  if (!comic) {
    return (
      <AppLayout>
        <main className="flex-1 container py-8">
...
        </main>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      
      <main className="flex-1 container py-8">
        <div className="max-w-3xl mx-auto space-y-6">
          <Button
            variant="ghost"
            onClick={() => navigate("/scanner")}
            className="mb-4"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Scanner
          </Button>

          <Card>
            <CardHeader>
              <CardTitle>Comic Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {comic.userPhotoBase64 && (
                <div className="w-full flex justify-center">
                  <img
                    src={`data:image/jpeg;base64,${comic.userPhotoBase64}`}
                    alt={comic.name}
                    className="max-w-full w-auto max-h-[500px] rounded-lg shadow-lg"
                  />
                </div>
              )}

              <div className="space-y-4">
                <div>
                  <h2 className="text-2xl font-bold">{comic.name}</h2>
                  {comic.issue_number && (
                    <Badge variant="secondary" className="mt-2">
                      Issue #{comic.issue_number}
                    </Badge>
                  )}
                </div>

                {comic.volume && (
                  <div>
                    <span className="text-sm text-muted-foreground">Volume:</span>
                    <p className="font-medium">{comic.volume}</p>
                  </div>
                )}

                {comic.cover_date && (
                  <div>
                    <span className="text-sm text-muted-foreground">Cover Date:</span>
                    <p className="font-medium">
                      {new Date(comic.cover_date).toLocaleDateString()}
                    </p>
                  </div>
                )}
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="condition-notes">
                    Condition Notes (optional)
                  </Label>
                  <Textarea
                    id="condition-notes"
                    placeholder="e.g. Minor spine ticks, CGC 9.8 candidate"
                    value={conditionNotes}
                    onChange={(e) => setConditionNotes(e.target.value)}
                    rows={3}
                    disabled={isInCollection}
                  />
                </div>

                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="space-y-1">
                    <Label htmlFor="for-trade">List for Trade</Label>
                    <p className="text-sm text-muted-foreground">
                      Make this available in the Trading Post
                    </p>
                  </div>
                  <Switch
                    id="for-trade"
                    checked={forTrade}
                    onCheckedChange={setForTrade}
                    disabled={isInCollection}
                  />
                </div>

                {forTrade && !isInCollection && (
                  <div className="space-y-3 pl-4 border-l-2 border-primary">
                    <div className="space-y-2">
                      <Label htmlFor="in-search-of" className="text-sm">
                        In Search Of <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        id="in-search-of"
                        placeholder="e.g., Amazing Spider-Man #300, Batman keys"
                        value={inSearchOf}
                        onChange={(e) => setInSearchOf(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="trade-notes" className="text-sm">
                        Trade Notes (optional)
                      </Label>
                      <Textarea
                        id="trade-notes"
                        placeholder="Any specific trade preferences or requirements"
                        value={tradeNotes}
                        onChange={(e) => setTradeNotes(e.target.value)}
                        rows={2}
                      />
                    </div>
                  </div>
                )}
              </div>

              <div className="pt-4 space-y-3">
                <Button
                  onClick={handleAddToCollection}
                  disabled={adding || isInCollection}
                  className="w-full"
                  size="lg"
                  variant={isInCollection ? "outline" : "default"}
                >
                  {isInCollection ? (
                    <>
                      <Check className="mr-2 h-5 w-5" />
                      In Your Collection
                    </>
                  ) : adding ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Plus className="mr-2 h-5 w-5" />
                      Add to My Collection
                    </>
                  )}
                </Button>

                {isInCollection && savedItemId && (
                  <Button
                    onClick={() => navigate("/my-inventory")}
                    className="w-full"
                    size="lg"
                    variant="outline"
                  >
                    View in My Inventory
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </AppLayout>
  );
}
