import { useState } from "react";
import { AppHeader } from "@/components/layout/AppHeader";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Loader2, Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { EbayBookCard } from "@/components/EbayBookCard";
import { EbayBookModal } from "@/components/EbayBookModal";
import Footer from "@/components/Footer";

interface EbayItem {
  itemId: string;
  title: string;
  price?: { value: string; currency: string };
  image?: { imageUrl: string };
  itemWebUrl: string;
  condition?: string;
  seller?: {
    username: string;
    feedbackPercentage: string;
    feedbackScore: number;
  };
}

const PRICE_TIERS = [
  { label: "All Prices", min: 0, max: null },
  { label: "$0 - $50", min: 0, max: 50 },
  { label: "$50 - $100", min: 50, max: 100 },
  { label: "$100 - $250", min: 100, max: 250 },
  { label: "$250 - $500", min: 250, max: 500 },
  { label: "$500 - $1,000", min: 500, max: 1000 },
  { label: "$1,000 - $5,000", min: 1000, max: 5000 },
  { label: "$5,000 - $10,000", min: 5000, max: 10000 },
  { label: "$10,000+", min: 10000, max: null },
];

export default function HomePage() {
  const [keyword, setKeyword] = useState("");
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<EbayItem[]>([]);
  const [selectedTier, setSelectedTier] = useState("all");
  const [selectedCondition, setSelectedCondition] = useState("all");
  const [selectedItem, setSelectedItem] = useState<EbayItem | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const { toast } = useToast();

  const handleSearch = async () => {
    if (!keyword.trim()) {
      toast({
        title: "Enter a search term",
        description: "Try searching for 'rare alchemy tome' or your favorite book",
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
        title: `Found ${data.count || 0} rare books`,
        description: `Showing results for "${keyword}"`,
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

  const filteredItems = items.filter((item) => {
    const price = parseFloat(item.price?.value || "0");
    
    // Price tier filter
    if (selectedTier !== "all") {
      const tier = PRICE_TIERS.find(t => `${t.min}-${t.max}` === selectedTier);
      if (tier) {
        if (tier.max === null) {
          if (price < tier.min) return false;
        } else {
          if (price < tier.min || price > tier.max) return false;
        }
      }
    }

    // Condition filter
    if (selectedCondition !== "all" && item.condition) {
      if (!item.condition.toLowerCase().includes(selectedCondition.toLowerCase())) {
        return false;
      }
    }

    return true;
  });

  const groupedByTier = PRICE_TIERS.slice(1).map(tier => {
    const tierItems = filteredItems.filter(item => {
      const price = parseFloat(item.price?.value || "0");
      if (tier.max === null) return price >= tier.min;
      return price >= tier.min && price <= tier.max;
    });
    return { tier, items: tierItems };
  }).filter(group => group.items.length > 0);

  return (
    <div className="min-h-screen flex flex-col">
      <AppHeader />
      
      {/* Hero Search Section */}
      <section className="bg-gradient-to-br from-primary/10 via-background to-accent/5 border-b">
        <div className="container mx-auto px-4 py-12 md:py-20">
          <div className="max-w-4xl mx-auto text-center space-y-6">
            <h1 className="text-4xl md:text-6xl font-bold tracking-tight">
              Hunt Your <span className="text-primary">Grail</span>
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto">
              Discover rare books, propose trades, and build your dream collection. Search thousands of curated listings.
            </p>

            {/* Search Bar */}
            <div className="flex flex-col sm:flex-row gap-3 max-w-2xl mx-auto">
              <Input
                placeholder="Search rare books (e.g., 'first edition alchemy')"
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                className="flex-1 h-12 text-base"
              />
              <Button onClick={handleSearch} disabled={loading} size="lg" className="h-12 px-8">
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Searching...
                  </>
                ) : (
                  <>
                    <Search className="mr-2 h-5 w-5" />
                    Search
                  </>
                )}
              </Button>
            </div>

            <div className="flex flex-wrap gap-2 justify-center">
              <Badge variant="outline" className="cursor-pointer hover:bg-accent" onClick={() => setKeyword("rare alchemy tome")}>
                Alchemy
              </Badge>
              <Badge variant="outline" className="cursor-pointer hover:bg-accent" onClick={() => setKeyword("first edition philosophy")}>
                Philosophy
              </Badge>
              <Badge variant="outline" className="cursor-pointer hover:bg-accent" onClick={() => setKeyword("antique natural history")}>
                Natural History
              </Badge>
              <Badge variant="outline" className="cursor-pointer hover:bg-accent" onClick={() => setKeyword("signed limited edition")}>
                Signed Editions
              </Badge>
            </div>
          </div>
        </div>
      </section>

      {/* Filters & Results */}
      {items.length > 0 && (
        <section className="container mx-auto px-4 py-8">
          <div className="flex flex-col sm:flex-row gap-4 mb-8">
            <Select value={selectedTier} onValueChange={setSelectedTier}>
              <SelectTrigger className="w-full sm:w-[200px]">
                <SelectValue placeholder="Price Range" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Prices</SelectItem>
                {PRICE_TIERS.slice(1).map((tier) => (
                  <SelectItem key={`${tier.min}-${tier.max}`} value={`${tier.min}-${tier.max}`}>
                    {tier.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={selectedCondition} onValueChange={setSelectedCondition}>
              <SelectTrigger className="w-full sm:w-[200px]">
                <SelectValue placeholder="Condition" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Conditions</SelectItem>
                <SelectItem value="new">New</SelectItem>
                <SelectItem value="like new">Like New</SelectItem>
                <SelectItem value="very good">Very Good</SelectItem>
                <SelectItem value="good">Good</SelectItem>
                <SelectItem value="acceptable">Acceptable</SelectItem>
              </SelectContent>
            </Select>

            <div className="flex-1 flex items-center gap-2 text-sm text-muted-foreground">
              <span className="font-medium">{filteredItems.length}</span> 
              {filteredItems.length === 1 ? 'result' : 'results'}
            </div>
          </div>

          {/* Curated Galleries by Price Tier */}
          {groupedByTier.length > 0 ? (
            <div className="space-y-12">
              {groupedByTier.map(({ tier, items: tierItems }) => (
                <div key={`${tier.min}-${tier.max}`}>
                  <div className="mb-6">
                    <h2 className="text-2xl font-bold mb-2">{tier.label} Gallery</h2>
                    <p className="text-muted-foreground">
                      {tierItems.length} {tierItems.length === 1 ? 'book' : 'books'} in this collection
                    </p>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                    {tierItems.map((item) => (
                      <EbayBookCard
                        key={item.itemId}
                        item={item}
                        onClick={() => {
                          setSelectedItem(item);
                          setModalOpen(true);
                        }}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-muted-foreground">No books match your current filters. Try adjusting your criteria.</p>
            </div>
          )}
        </section>
      )}

      {/* Empty State */}
      {!loading && items.length === 0 && (
        <section className="container mx-auto px-4 py-20 text-center">
          <div className="max-w-md mx-auto space-y-4">
            <div className="text-6xl">📚</div>
            <h2 className="text-2xl font-bold">Start Your Hunt</h2>
            <p className="text-muted-foreground">
              Search for rare books, first editions, and collectible volumes. Our platform connects you with thousands of listings.
            </p>
          </div>
        </section>
      )}

      {/* Book Detail Modal */}
      <EbayBookModal
        item={selectedItem}
        open={modalOpen}
        onOpenChange={setModalOpen}
      />

      <Footer />
    </div>
  );
}
