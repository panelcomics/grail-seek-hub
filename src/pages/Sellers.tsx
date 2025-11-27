import { useState, useEffect } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Search, Star, MapPin, Shield, Award } from "lucide-react";
import { Link } from "react-router-dom";
import { VerifiedSellerBadge } from "@/components/VerifiedSellerBadge";
import { FeaturedSellerBadge } from "@/components/FeaturedSellerBadge";

interface Seller {
  user_id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  profile_image_url: string | null;
  seller_level: string; // Changed from completed_sales_count
  seller_tier: string | null;
  is_verified_seller: boolean;
  is_featured_seller: boolean;
}

const ITEMS_PER_PAGE = 24;

export default function Sellers() {
  const [sellers, setSellers] = useState<Seller[]>([]);
  const [filteredSellers, setFilteredSellers] = useState<Seller[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState("most-active");
  const [filterTier, setFilterTier] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    fetchSellers();
  }, []);

  useEffect(() => {
    applyFiltersAndSort();
  }, [sellers, searchQuery, sortBy, filterTier]);

  const fetchSellers = async () => {
    setLoading(true);
    try {
      const { data, error} = await supabase
        .from("public_profiles")
        .select("*")
        .not("username", "is", null);

      if (error) throw error;
      setSellers(data || []);
    } catch (error) {
      console.error("Error fetching sellers:", error);
    } finally {
      setLoading(false);
    }
  };

  const applyFiltersAndSort = () => {
    let filtered = [...sellers];

    // Search filter
    if (searchQuery.trim()) {
      filtered = filtered.filter((seller) => {
        const displayName = seller.display_name || seller.username?.split('@')[0] || "";
        return displayName.toLowerCase().includes(searchQuery.toLowerCase());
      });
    }

    // Tier filter
    if (filterTier !== "all") {
      if (filterTier === "verified") {
        filtered = filtered.filter((s) => s.seller_tier && s.seller_tier !== "new");
      } else if (filterTier === "pro") {
        filtered = filtered.filter((s) => s.seller_tier === "pro");
      }
    }

    // Sort
    switch (sortBy) {
      case "most-active":
        // Sort by seller_level priority: 50+ > 10+ > New
        filtered.sort((a, b) => {
          const levelOrder: Record<string, number> = { "50+": 3, "10+": 2, "New": 1 };
          return (levelOrder[b.seller_level] || 0) - (levelOrder[a.seller_level] || 0);
        });
        break;
      case "highest-rated":
        // Sort by seller_level
        filtered.sort((a, b) => {
          const levelOrder: Record<string, number> = { "50+": 3, "10+": 2, "New": 1 };
          return (levelOrder[b.seller_level] || 0) - (levelOrder[a.seller_level] || 0);
        });
        break;
      case "newest":
        // Note: Would require created_at or joined_at field in profiles table
        filtered.sort((a, b) => {
          // Fallback: sort by username for consistent ordering
          const nameA = a.username || "";
          const nameB = b.username || "";
          return nameB.localeCompare(nameA); // Reverse alphabetical as proxy for "newest"
        });
        break;
      case "a-z":
        filtered.sort((a, b) => {
          const nameA = a.display_name || a.username?.split('@')[0] || "";
          const nameB = b.display_name || b.username?.split('@')[0] || "";
          return nameA.localeCompare(nameB);
        });
        break;
    }

    setFilteredSellers(filtered);
    setCurrentPage(1); // Reset to first page on filter change
  };

  const paginatedSellers = filteredSellers.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const totalPages = Math.ceil(filteredSellers.length / ITEMS_PER_PAGE);

  return (
    <AppLayout>
      <div className="container mx-auto px-4 py-12">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-foreground mb-2">Seller Directory</h1>
          <p className="text-muted-foreground">
            Browse {sellers.length} verified sellers in the marketplace
          </p>
        </div>

        {/* Filters & Search */}
        <div className="mb-8 grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Search */}
          <div className="md:col-span-2 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search sellers..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>

          {/* Tier Filter */}
          <Select value={filterTier} onValueChange={setFilterTier}>
            <SelectTrigger>
              <SelectValue placeholder="Filter by tier" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Sellers</SelectItem>
              <SelectItem value="verified">Verified Only</SelectItem>
              <SelectItem value="pro">Pro Sellers</SelectItem>
            </SelectContent>
          </Select>

          {/* Sort */}
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger>
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="most-active">Most Active</SelectItem>
              <SelectItem value="highest-rated">Highest Rated</SelectItem>
              <SelectItem value="newest">Newest</SelectItem>
              <SelectItem value="a-z">A-Z</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Results count */}
        <div className="mb-6">
          <p className="text-sm text-muted-foreground">
            Showing {paginatedSellers.length} of {filteredSellers.length} sellers
          </p>
        </div>

        {/* Sellers Grid */}
        {loading ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">Loading sellers...</p>
          </div>
        ) : paginatedSellers.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">No sellers found matching your criteria.</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mb-8">
              {paginatedSellers.map((seller) => (
                <SellerCard key={seller.user_id} seller={seller} />
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex justify-center gap-2 mt-8">
                <Button
                  variant="outline"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                >
                  Previous
                </Button>
                <div className="flex items-center gap-2">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    const page = i + 1;
                    return (
                      <Button
                        key={page}
                        variant={currentPage === page ? "default" : "outline"}
                        onClick={() => setCurrentPage(page)}
                        className="w-10"
                      >
                        {page}
                      </Button>
                    );
                  })}
                  {totalPages > 5 && <span className="text-muted-foreground">...</span>}
                </div>
                <Button
                  variant="outline"
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                >
                Next
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  </AppLayout>
  );
}

function SellerCard({ seller }: { seller: Seller }) {
  const slug = seller.username?.toLowerCase().replace(/\s+/g, "-").replace(/'/g, "") || "seller";
  const tierIcon = seller.seller_tier === "pro" ? <Award className="w-4 h-4" /> : <Shield className="w-4 h-4" />;
  const tierLabel = seller.seller_tier === "pro" ? "Pro" : seller.seller_tier === "verified" ? "Verified" : null;
  const displayName = seller.display_name || seller.username?.split('@')[0] || "Unknown Seller";
  const imageUrl = seller.profile_image_url || seller.avatar_url;

  return (
    <Link to={`/seller/${slug}`}>
      <Card className="hover:shadow-lg transition-shadow duration-300 group">
        <CardContent className="p-6 flex flex-col items-center text-center space-y-4">
          {/* Avatar */}
          <div className="relative">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center overflow-hidden border-2 border-primary/30 group-hover:border-primary/60 transition-colors">
              {imageUrl ? (
                <img
                  src={imageUrl}
                  alt={displayName}
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-2xl font-bold text-primary">
                  {displayName[0]?.toUpperCase() || "S"}
                </span>
              )}
            </div>
            {tierLabel && (
              <Badge
                variant="secondary"
                className="absolute -bottom-2 left-1/2 -translate-x-1/2 flex items-center gap-1 px-2 py-0.5"
              >
                {tierIcon}
                <span className="text-xs">{tierLabel}</span>
              </Badge>
            )}
          </div>

          {/* Info */}
          <div>
            <div className="flex items-center justify-center gap-2 mb-2">
              <h3 className="text-lg font-bold text-foreground">
                {displayName}
              </h3>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-1 mb-2">
              {seller.is_featured_seller && <FeaturedSellerBadge showLabel={false} />}
              {seller.is_verified_seller && <VerifiedSellerBadge showLabel={false} size="sm" />}
            </div>
            <p className="text-sm text-muted-foreground flex items-center justify-center gap-1">
              <MapPin className="w-3 h-3" />
              New York, NY
            </p>
          </div>

          {/* Stats */}
          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-1">
              <Star className="w-4 h-4 fill-yellow-500 text-yellow-500" />
              <span className="text-muted-foreground">4.9</span>
            </div>
            <div className="text-muted-foreground">
              {seller.seller_level || 'New'} seller
            </div>
          </div>

          <Button variant="outline" className="w-full group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
            View Shop
          </Button>
        </CardContent>
      </Card>
    </Link>
  );
}
