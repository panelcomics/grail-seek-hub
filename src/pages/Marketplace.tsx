import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Loader2, SlidersHorizontal } from "lucide-react";
import { MobileFilterBar } from "@/components/MobileFilterBar";
import ItemCard from "@/components/ItemCard";
import { ListingCardSkeleton } from "@/components/ui/listing-card-skeleton";
import { resolvePrice } from "@/lib/listingPriceUtils";
import { getListingImageUrl } from "@/lib/sellerUtils";
import { debugLog } from "@/lib/debug";

export default function Marketplace() {
  const navigate = useNavigate();
  const [listings, setListings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<"newest" | "price_asc" | "price_desc" | "title">("newest");
  const [showFilters, setShowFilters] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [offset, setOffset] = useState(0);
  const ITEMS_PER_PAGE = 24;

  useEffect(() => {
    fetchListings(true);
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

  const fetchListings = async (reset = false) => {
    const currentOffset = reset ? 0 : offset;
    
    try {
      if (reset) {
        setLoading(true);
        setOffset(0);
      } else {
        setLoadingMore(true);
      }

      // Query with join and pagination
      const { data, error } = await supabase
        .from("listings")
        .select(`
          *,
          inventory_items!inner(
            id,
            title,
            series,
            issue_number,
            condition,
            cgc_grade,
            grading_company,
            certification_number,
            is_slab,
            details,
            variant_description,
            images,
            for_sale,
            for_auction,
            is_for_trade,
            offers_enabled,
            user_id,
            is_signed,
            signature_type,
            signed_by,
            signature_date,
            key_issue,
            key_details,
            key_type
          ),
          profiles!user_id(
            user_id,
            username,
            avatar_url,
            is_verified_seller,
            completed_sales_count
          )
        `)
        .eq("status", "active")
        .order("updated_at", { ascending: false })
        .range(currentOffset, currentOffset + ITEMS_PER_PAGE - 1);

      if (error) throw error;

      // Transform data to include inventory_items properties at top level
      const transformedData = (data || []).map(listing => {
        const item = listing.inventory_items;
        return {
          ...listing,
          ...item,
          listing_id: listing.id,
          price_cents: listing.price_cents,
          // Keep nested for backwards compatibility
          inventory_items: item,
        };
      });
      
      if (reset) {
        setListings(transformedData);
      } else {
        setListings(prev => [...prev, ...transformedData]);
      }
      
      setHasMore(transformedData.length === ITEMS_PER_PAGE);
      setOffset(currentOffset + ITEMS_PER_PAGE);
    } catch (error) {
      console.error("Error fetching listings:", error);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const loadMore = () => {
    if (!loadingMore && hasMore) {
      fetchListings(false);
    }
  };

  const filteredAndSortedListings = (() => {
    let filtered = search
      ? listings.filter((item) =>
          item.title?.toLowerCase().includes(search.toLowerCase()) ||
          item.series?.toLowerCase().includes(search.toLowerCase()) ||
          item.details?.toLowerCase().includes(search.toLowerCase())
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
          (a.title || a.series || "").localeCompare(b.title || b.series || "")
        );
        break;
      case "newest":
      default:
        // Already sorted by updated_at desc
        break;
    }

    return filtered;
  })();

  return (
    <>
      <Helmet>
        <title>Comic & Collectibles Marketplace | Buy & Sell</title>
        <meta name="description" content="Discover comics, cards, and collectibles from verified sellers. Browse thousands of listings with secure payments and buyer protection." />
        <meta property="og:title" content="Comic & Collectibles Marketplace" />
        <meta property="og:description" content="Buy and sell comics, cards, and collectibles with confidence" />
        <meta property="og:type" content="website" />
        <meta name="twitter:card" content="summary_large_image" />
        <link rel="canonical" href={`${window.location.origin}/market`} />
      </Helmet>

      <main className="flex-1 container py-4 md:py-8 pb-20 md:pb-8">
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

        {loading ? (
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {[...Array(12)].map((_, i) => (
              <ListingCardSkeleton key={i} />
            ))}
          </div>
        ) : filteredAndSortedListings.length === 0 ? (
          <div className="text-center py-16 px-4">
            <div className="max-w-md mx-auto">
              <p className="text-2xl font-bold mb-2">🔍 Nothing here yet!</p>
              <p className="text-muted-foreground mb-4">
                We couldn't find any grails matching your search. Try adjusting your filters or broadening your criteria.
              </p>
              <Button onClick={() => window.location.reload()} variant="outline">
                Reset Filters & Browse All
              </Button>
            </div>
          </div>
        ) : (
          <>
            <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {filteredAndSortedListings.map((listing) => {
                const price = resolvePrice(listing);
                const profile = listing.profiles;
                
                return (
                  <ItemCard
                    key={listing.listing_id}
                    id={listing.listing_id}
                    title={listing.title || listing.series || "Untitled"}
                    price={price === null ? undefined : price}
                    condition={listing.condition || listing.cgc_grade || "Unknown"}
                    image={getListingImageUrl(listing.inventory_items || listing)}
                    category="comic"
                    isAuction={listing.for_auction}
                    showMakeOffer={listing.offers_enabled}
                    showTradeBadge={listing.is_for_trade}
                    sellerName={profile?.username}
                    sellerCity={undefined}
                    isVerifiedSeller={profile?.is_verified_seller}
                    completedSalesCount={profile?.completed_sales_count || 0}
                    isSlab={listing.is_slab}
                    grade={listing.cgc_grade}
                    gradingCompany={listing.grading_company}
                    certificationNumber={listing.certification_number}
                    series={listing.series}
                    issueNumber={listing.issue_number}
                    keyInfo={listing.key_details || listing.variant_description || listing.details}
                    isSigned={listing.is_signed}
                    signatureType={listing.signature_type}
                    signedBy={listing.signed_by}
                    showFavorite={true}
                  />
                );
              })}
            </div>
            
            {hasMore && !loading && (
              <div className="flex justify-center mt-8">
                <Button 
                  onClick={loadMore} 
                  disabled={loadingMore}
                  size="lg"
                  variant="outline"
                >
                  {loadingMore ? "Loading..." : "Load More"}
                </Button>
              </div>
            )}
          </>
        )}
      
      <MobileFilterBar
        sortBy={sortBy}
        onSortChange={setSortBy}
        showFilters={showFilters}
        onToggleFilters={() => setShowFilters(!showFilters)}
      />
    </main>
    </>
  );
}
