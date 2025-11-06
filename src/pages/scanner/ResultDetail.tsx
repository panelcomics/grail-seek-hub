import { useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Plus, Check, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { useState, useEffect } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

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
  const { user } = useAuth();
  const [adding, setAdding] = useState(false);
  const [isInCollection, setIsInCollection] = useState(false);
  const [savedComicId, setSavedComicId] = useState<string | null>(null);
  const [conditionNotes, setConditionNotes] = useState("");

  const comic = location.state as ComicDetailState;

  useEffect(() => {
    if (!comic) return;
    checkIfInCollection();
  }, [comic, user]);

  async function checkIfInCollection() {
    if (!user || !comic?.id) return;
    
    const { data } = await supabase
      .from("user_comics")
      .select("id")
      .eq("user_id", user.id)
      .eq("comicvine_id", comic.id)
      .single();

    if (data) {
      setIsInCollection(true);
      setSavedComicId(data.id);
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
      toast.error("Please sign in to add to your collection");
      navigate("/auth");
      return;
    }

    if (!comic) {
      toast.error("Comic data not found");
      return;
    }

    setAdding(true);

    try {
      // Upload user's scanned photo if available
      let imageUrl = null;
      if (comic.userPhotoBase64) {
        imageUrl = await uploadPhotoToStorage(comic.userPhotoBase64);
        if (!imageUrl) {
          toast.error("Failed to upload photo");
          setAdding(false);
          return;
        }
      }

      const { error } = await supabase.from("user_comics").insert({
        user_id: user.id,
        comicvine_id: comic.id,
        title: comic.name,
        issue_number: comic.issue_number,
        volume_name: comic.volume,
        cover_date: comic.cover_date || null,
        image_url: imageUrl,
        ocr_text: comic.ocrText,
        condition_notes: conditionNotes.trim() || null,
        source: "comicvine_with_photo",
      });

      if (error) {
        if (error.code === "23505") {
          toast.error("This comic is already in your collection");
        } else {
          throw error;
        }
      } else {
        // Fetch the newly created comic ID
        const { data: savedComic } = await supabase
          .from("user_comics")
          .select("id")
          .eq("user_id", user.id)
          .eq("comicvine_id", comic.id)
          .single();
        
        if (savedComic) {
          setSavedComicId(savedComic.id);
        }
        
        toast.success("Added to collection!");
        setIsInCollection(true);
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to add to collection");
    } finally {
      setAdding(false);
    }
  }

  if (!comic) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <main className="flex-1 container py-8">
          <div className="max-w-2xl mx-auto text-center">
            <h1 className="text-2xl font-bold mb-4">Comic not found</h1>
            <Button onClick={() => navigate("/scanner")}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Scanner
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

              <div className="pt-4 space-y-3">
                <Button
                  onClick={handleAddToCollection}
                  disabled={adding || isInCollection}
                  className="w-full"
                  size="lg"
                  variant={isInCollection ? "outline" : "destructive"}
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

                {isInCollection && savedComicId && (
                  <Button
                    onClick={() => navigate(`/sell/${savedComicId}`)}
                    className="w-full"
                    size="lg"
                    variant="premium"
                  >
                    Sell This Comic
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
      
      <Footer />
    </div>
  );
}
