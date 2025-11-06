import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Loader2 } from "lucide-react";
import { formatCents } from "@/lib/fees";

export default function Marketplace() {
  const navigate = useNavigate();
  const [listings, setListings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetchListings();
  }, []);

  const fetchListings = async () => {
    try {
      const { data, error } = await supabase
        .from("listings")
        .select("*, inventory_items!inventory_item_id(*)")
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

  const filteredListings = search
    ? listings.filter((listing) =>
        listing.title?.toLowerCase().includes(search.toLowerCase()) ||
        listing.inventory_items?.title?.toLowerCase().includes(search.toLowerCase())
      )
    : listings;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />

      <main className="flex-1 container py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Marketplace</h1>
          <p className="text-muted-foreground">Buy comics and collectibles from the community</p>
        </div>

        <div className="mb-6">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search listings..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {filteredListings.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">
              {search ? "No listings found matching your search" : "No active listings yet"}
            </p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filteredListings.map((listing) => (
              <Card
                key={listing.id}
                className="cursor-pointer hover:shadow-lg transition-shadow"
                onClick={() => navigate(`/listing/${listing.id}`)}
              >
                <CardContent className="p-4">
                  <div className="aspect-[2/3] bg-muted rounded-md mb-3" />
                  <h3 className="font-semibold line-clamp-2 mb-1">
                    {listing.title || listing.inventory_items?.title}
                  </h3>
                  {listing.issue_number && (
                    <p className="text-sm text-muted-foreground mb-2">
                      Issue #{listing.issue_number}
                    </p>
                  )}
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
            ))}
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}
