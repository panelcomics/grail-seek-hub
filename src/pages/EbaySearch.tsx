import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Search, ExternalLink } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { AppLayout } from "@/components/layout/AppLayout";

interface EbayItem {
  itemId: string;
  title: string;
  price?: {
    value: string;
    currency: string;
  };
  image?: {
    imageUrl: string;
  };
  itemWebUrl: string;
  condition?: string;
  seller?: {
    username: string;
    feedbackPercentage: string;
    feedbackScore: number;
  };
}

export default function EbaySearch() {
  const [keyword, setKeyword] = useState("rare alchemy tome");
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<EbayItem[]>([]);
  const { toast } = useToast();

  const handleSearch = async () => {
    if (!keyword.trim()) {
      toast({
        title: "Please enter a search term",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("ebay-search", {
        body: { keyword: keyword.trim() },
      });

      if (error) throw error;

      setItems(data.items || []);
      toast({
        title: `Found ${data.count || 0} books`,
        description: `Search results for "${keyword}"`,
      });
    } catch (error: any) {
      console.error("eBay search error:", error);
      toast({
        title: "Search failed",
        description: error.message || "Unable to search eBay",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppLayout>
      <main className="flex-1 container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold mb-2">eBay Book Search</h1>
          <p className="text-muted-foreground mb-6">
            Search for rare books on eBay using our integrated Browse API
          </p>

          <div className="flex gap-2 mb-8">
            <Input
              placeholder="Enter search keywords (e.g., rare alchemy tome)"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              className="flex-1"
            />
            <Button onClick={handleSearch} disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Searching...
                </>
              ) : (
                <>
                  <Search className="mr-2 h-4 w-4" />
                  Search
                </>
              )}
            </Button>
          </div>

          {items.length === 0 && !loading && (
            <div className="text-center py-12 text-muted-foreground">
              Enter a search term to find books on eBay
            </div>
          )}

          <div className="grid gap-4 md:grid-cols-2">
            {items.map((item) => (
              <Card key={item.itemId} className="overflow-hidden">
                <CardHeader className="p-4 pb-2">
                  <CardTitle className="text-base line-clamp-2">
                    {item.title}
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4 pt-2">
                  {item.image?.imageUrl && (
                    <img
                      src={item.image.imageUrl}
                      alt={item.title}
                      className="w-full h-48 object-cover rounded-md mb-3"
                    />
                  )}
                  <div className="space-y-2">
                    {item.price && (
                      <p className="text-xl font-bold text-primary">
                        {item.price.currency} ${item.price.value}
                      </p>
                    )}
                    {item.condition && (
                      <p className="text-sm text-muted-foreground">
                        Condition: {item.condition}
                      </p>
                    )}
                    {item.seller && (
                      <p className="text-sm text-muted-foreground">
                        Seller: {item.seller.username} (
                        {item.seller.feedbackPercentage}% positive)
                      </p>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full"
                      onClick={() => window.open(item.itemWebUrl, "_blank")}
                    >
                      View on eBay
                      <ExternalLink className="ml-2 h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </main>
    </AppLayout>
  );
}
