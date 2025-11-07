import { useState } from "react";
import { AppHeader } from "@/components/layout/AppHeader";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, Search, Camera, Zap } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { ComicResultCard } from "@/components/ComicResultCard";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import Footer from "@/components/Footer";

interface ComicData {
  comicvine_id: number;
  title: string;
  issue_number: string;
  full_title: string;
  publisher: string;
  year: number | null;
  cover_image: string;
  cover_thumb: string;
  description: string;
  characters: string[];
  ebay_avg_price: number;
  trade_fee_total: number;
  trade_fee_each: number;
  fee_tier: string;
}

export default function Scanner() {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [comic, setComic] = useState<ComicData | null>(null);
  const { toast } = useToast();
  const navigate = useNavigate();
  const { session } = useAuth();

  const handleScan = async () => {
    if (!query.trim()) {
      toast({
        title: "Enter a search term",
        description: "Try 'Amazing Fantasy 15' or 'X-Men 1'",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    setComic(null);

    try {
      const { data, error } = await supabase.functions.invoke("comic-scanner", {
        body: { query: query.trim() },
      });

      if (error) throw error;

      if (!data.found) {
        toast({
          title: "No comic found",
          description: "Try a different search term or check the spelling",
          variant: "destructive",
        });
        return;
      }

      setComic(data.comic);
      toast({
        title: "Comic found!",
        description: data.comic.full_title,
      });
    } catch (error: any) {
      console.error("Comic scanner error:", error);
      toast({
        title: "Scan failed",
        description: error.message || "Unable to scan comic",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleListForSwap = async () => {
    if (!session) {
      toast({
        title: "Login required",
        description: "Please login to save comics to your grails",
        variant: "destructive",
      });
      navigate("/auth");
      return;
    }

    if (!comic) return;

    try {
      const { error } = await supabase.from("my_grails").insert({
        user_id: session.user.id,
        comicvine_id: comic.comicvine_id,
        title: comic.title,
        issue_number: comic.issue_number,
        full_title: comic.full_title,
        publisher: comic.publisher,
        year: comic.year,
        cover_image: comic.cover_image,
        cover_thumb: comic.cover_thumb,
        description: comic.description,
        characters: comic.characters,
        ebay_avg_price: comic.ebay_avg_price,
        trade_fee_total: comic.trade_fee_total,
        trade_fee_each: comic.trade_fee_each,
        fee_tier: comic.fee_tier,
      });

      if (error) throw error;

      toast({
        title: "Added to My Grails!",
        description: "Comic saved successfully",
      });

      // Navigate to trade matching or inventory
      navigate("/my-inventory");
    } catch (error: any) {
      console.error("Save comic error:", error);
      toast({
        title: "Save failed",
        description: error.message || "Unable to save comic",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <AppHeader />
      
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-primary/20 via-background to-accent/10 border-b-4 border-primary">
        <div className="container mx-auto px-4 py-12 md:py-16">
          <div className="max-w-3xl mx-auto text-center space-y-6">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-primary text-primary-foreground mb-4">
              <Zap className="h-10 w-10" />
            </div>
            
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight">
              Scan Your <span className="text-primary">Comic</span>
            </h1>
            
            <p className="text-lg text-muted-foreground max-w-xl mx-auto">
              Enter a title, issue number, or ISBN. We'll fetch Comic Vine data, calculate eBay pricing, and show your exact swap fees.
            </p>

            {/* Search Bar */}
            <div className="flex flex-col sm:flex-row gap-3 max-w-2xl mx-auto">
              <Input
                placeholder="e.g., 'Amazing Fantasy 15' or 'X-Men 1'"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleScan()}
                className="flex-1 h-14 text-lg border-2 border-primary/30 focus:border-primary"
              />
              <Button 
                onClick={handleScan} 
                disabled={loading} 
                size="lg" 
                className="h-14 px-8 font-bold"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Scanning...
                  </>
                ) : (
                  <>
                    <Search className="mr-2 h-5 w-5" />
                    Scan
                  </>
                )}
              </Button>
            </div>

            <div className="flex flex-wrap gap-2 justify-center">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setQuery("Amazing Spider-Man 300")}
              >
                Amazing Spider-Man #300
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setQuery("Batman 1")}
              >
                Batman #1
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setQuery("Incredible Hulk 181")}
              >
                Hulk #181
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Result Section */}
      {comic && (
        <section className="container mx-auto px-4 py-12">
          <ComicResultCard comic={comic} onListForSwap={handleListForSwap} />
        </section>
      )}

      {/* Empty State */}
      {!loading && !comic && (
        <section className="container mx-auto px-4 py-20">
          <Card className="max-w-md mx-auto border-2 border-dashed border-muted">
            <CardContent className="pt-12 pb-12 text-center space-y-4">
              <Camera className="h-16 w-16 mx-auto text-muted-foreground/50" />
              <h3 className="text-xl font-bold">Ready to Scan</h3>
              <p className="text-muted-foreground">
                Enter a comic title or issue to get started. We'll fetch all the data and pricing instantly.
              </p>
            </CardContent>
          </Card>
        </section>
      )}

      <Footer />
    </div>
  );
}
