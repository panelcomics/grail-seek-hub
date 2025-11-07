import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Loader2, SlidersHorizontal } from "lucide-react";
import { formatCents } from "@/lib/fees";

export default function Marketplace() {
  const navigate = useNavigate();
  const [listings, setListings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<"newest" | "price_asc" | "price_desc" | "title">("newest");
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    fetchListings();
    logMarketplaceView();
  }, []);

  const logMarketplaceView = async () => {
    try {
      await supabase.from("event_logs").insert({
        event: "marketplace_view",
        meta: { page: "marketplace" }
      });
    } catch (error) {
      console.error("Error logging marketplace view:", error);
    }
  };

  const fetchListings = async () => {
    try {
      const { data, error } = await supabase
        .from("listings")
        .select(`
          *,
          inventory_items!inventory_item_id(*),
          profiles!user_id(display_name, username, avatar_url)
        `)
        .eq("status", "active")
        .gt("quantity", 0)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setListings(data || []);
    } catch (error) {
      console.error("Error fetching listings:", error);
    } finally {
      setLoading(false);
    }
  };

  const filteredAndSortedListings = (() => {
    let filtered = search
      ? listings.filter((listing) =>
          listing.title?.toLowerCase().includes(search.toLowerCase()) ||
          listing.inventory_items?.title?.toLowerCase().includes(search.toLowerCase()) ||
          listing.details?.toLowerCase().includes(search.toLowerCase())
        )
      : listings;

    // Sort
    switch (sortBy) {
      case "price_asc":
        filtered = [...filtered].sort((a, b) => (a.price_cents || 0) - (b.price_cents || 0));
        break;
      case "price_desc":
        filtered = [...filtered].sort((a, b) => (b.price_cents || 0) - (a.price_cents || 0));
        break;
      case "title":
        filtered = [...filtered].sort((a, b) => 
          (a.title || a.inventory_items?.title || "").localeCompare(b.title || b.inventory_items?.title || "")
        );
        break;
      case "newest":
      default:
        // Already sorted by created_at desc
        break;
    }

    return filtered;
  })();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Helmet>
        <title>Comic & Collectibles Marketplace | Buy & Sell</title>
        <meta name="description" content="Discover comics, cards, and collectibles from verified sellers. Browse thousands of listings with secure payments and buyer protection." />
        <meta property="og:title" content="Comic & Collectibles Marketplace" />
        <meta property="og:description" content="Buy and sell comics, cards, and collectibles with confidence" />
        <meta property="og:type" content="website" />
        <meta name="twitter:card" content="summary_large_image" />
        <link rel="canonical" href={`${window.location.origin}/market`} />
      </Helmet>

      <Navbar />

      <main className="flex-1 container py-4 md:py-8">
        <div className="mb-6 md:mb-8">
          <h1 className="text-2xl md:text-3xl font-bold mb-2">Marketplace</h1>
          <p className="text-sm md:text-base text-muted-foreground">Buy comics and collectibles from the community</p>
        </div>

        <div className="mb-6 space-y-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search listings..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex gap-2">
              <Select value={sortBy} onValueChange={(v: any) => setSortBy(v)}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="newest">Newest First</SelectItem>
                  <SelectItem value="price_asc">Price: Low to High</SelectItem>
                  <SelectItem value="price_desc">Price: High to Low</SelectItem>
                  <SelectItem value="title">Title A-Z</SelectItem>
                </SelectContent>
              </Select>
              <Button
                variant="outline"
                size="icon"
                onClick={() => setShowFilters(!showFilters)}
              >
                <SlidersHorizontal className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        {filteredAndSortedListings.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">
              {search ? "No listings found matching your search" : "No active listings yet"}
            </p>
          </div>
        ) : (
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filteredAndSortedListings.map((listing) => {
              const sellerName = listing.profiles?.display_name || listing.profiles?.username || "Seller";
              const imageUrl = listing.image_url || listing.inventory_items?.images?.[0]?.url;
              
              return (
                <Card
                  key={listing.id}
                  className="cursor-pointer hover:shadow-lg transition-shadow"
                  onClick={() => navigate(`/l/${listing.id}`)}
                >
                  <CardContent className="p-4">
                    {imageUrl ? (
                      <img
                        src={imageUrl}
                        alt={listing.title || listing.inventory_items?.title}
                        className="aspect-[2/3] w-full object-cover rounded-md mb-3"
                        loading="lazy"
                      />
                    ) : (
                      <div className="aspect-[2/3] bg-muted rounded-md mb-3 flex items-center justify-center text-muted-foreground">
                        No image
                      </div>
                    )}
                    <h3 className="font-semibold line-clamp-2 mb-1 text-sm md:text-base">
                      {listing.title || listing.inventory_items?.title}
                    </h3>
                    {listing.issue_number && (
                      <p className="text-xs md:text-sm text-muted-foreground mb-2">
                        Issue #{listing.issue_number}
                      </p>
                    )}
                    {listing.details && (
                      <p className="text-xs text-muted-foreground mb-1 line-clamp-1">
                        {listing.details}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground mb-2">
                      by {sellerName}
                    </p>
                    <div className="flex items-center justify-between mt-3">
                      <span className="text-lg font-bold text-primary">
                        {formatCents(listing.price_cents)}
                      </span>
                      <Button size="sm" variant="outline">
                        View
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}
