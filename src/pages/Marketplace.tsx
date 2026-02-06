import { useState, useCallback, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, SlidersHorizontal } from "lucide-react";
import { MobileFilterBar } from "@/components/MobileFilterBar";
import ItemCard from "@/components/ItemCard";
import { ListingCardSkeleton } from "@/components/ui/listing-card-skeleton";
import { resolvePrice } from "@/lib/listingPriceUtils";
import { getListingImageUrl } from "@/lib/sellerUtils";
import { useMarketplaceListings, MarketplaceSortOption } from "@/hooks/useMarketplaceListings";

export default function Marketplace() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  
  // State synced with URL params
  const [search, setSearch] = useState(searchParams.get("q") || "");
  const [sortBy, setSortBy] = useState<MarketplaceSortOption>(
    (searchParams.get("sort") as MarketplaceSortOption) || "newest"
  );
  const [minPrice, setMinPrice] = useState(searchParams.get("minPrice") || "");
  const [maxPrice, setMaxPrice] = useState(searchParams.get("maxPrice") || "");
  const [showFilters, setShowFilters] = useState(false);
  
  // Debounced filters for server-side query
  const [debouncedSearch, setDebouncedSearch] = useState(search);
  const [searchTimer, setSearchTimer] = useState<ReturnType<typeof setTimeout> | null>(null);
  const [debouncedMinPrice, setDebouncedMinPrice] = useState(minPrice);
  const [debouncedMaxPrice, setDebouncedMaxPrice] = useState(maxPrice);
  const [priceTimer, setPriceTimer] = useState<ReturnType<typeof setTimeout> | null>(null);

  // Filters object for the hook (uses debounced values to avoid hammering DB)
  const filters = useMemo(() => ({
    search: debouncedSearch,
    sortBy,
    minPrice: debouncedMinPrice,
    maxPrice: debouncedMaxPrice,
  }), [debouncedSearch, sortBy, debouncedMinPrice, debouncedMaxPrice]);

  const { listings, loading, loadingMore, hasMore, loadMore } = useMarketplaceListings(filters);

  // Sync state to URL params
  const updateUrlParams = useCallback((updates: Record<string, string>) => {
    setSearchParams(prev => {
      const next = new URLSearchParams(prev);
      Object.entries(updates).forEach(([key, value]) => {
        if (value) next.set(key, value);
        else next.delete(key);
      });
      return next;
    }, { replace: true });
  }, [setSearchParams]);

  // Handlers with debounce for search/price
  const handleSearchChange = (value: string) => {
    setSearch(value);
    updateUrlParams({ q: value });
    if (searchTimer) clearTimeout(searchTimer);
    const timer = setTimeout(() => setDebouncedSearch(value), 400);
    setSearchTimer(timer);
  };

  const handleSortChange = (value: MarketplaceSortOption) => {
    setSortBy(value);
    updateUrlParams({ sort: value === "newest" ? "" : value });
  };

  const handleMinPriceChange = (value: string) => {
    setMinPrice(value);
    updateUrlParams({ minPrice: value });
    if (priceTimer) clearTimeout(priceTimer);
    const timer = setTimeout(() => setDebouncedMinPrice(value), 500);
    setPriceTimer(timer);
  };

  const handleMaxPriceChange = (value: string) => {
    setMaxPrice(value);
    updateUrlParams({ maxPrice: value });
    if (priceTimer) clearTimeout(priceTimer);
    const timer = setTimeout(() => setDebouncedMaxPrice(value), 500);
    setPriceTimer(timer);
  };

  const clearFilters = () => {
    setSearch("");
    setSortBy("newest");
    setMinPrice("");
    setMaxPrice("");
    setDebouncedSearch("");
    setDebouncedMinPrice("");
    setDebouncedMaxPrice("");
    setSearchParams({}, { replace: true });
  };

  const hasActiveFilters = !!search || !!minPrice || !!maxPrice || sortBy !== "newest";

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
                onChange={(e) => handleSearchChange(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex gap-2">
              <Select value={sortBy} onValueChange={(v: any) => handleSortChange(v)}>
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
                variant={showFilters ? "default" : "outline"}
                size="icon"
                onClick={() => setShowFilters(!showFilters)}
              >
                <SlidersHorizontal className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {showFilters && (
            <div className="flex flex-wrap items-end gap-3 p-4 rounded-lg border border-border bg-muted/30">
              <div className="flex-1 min-w-[120px]">
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Min Price ($)</label>
                <Input
                  type="number"
                  placeholder="0"
                  value={minPrice}
                  onChange={(e) => handleMinPriceChange(e.target.value)}
                  min="0"
                  step="1"
                  className="h-9"
                />
              </div>
              <div className="flex-1 min-w-[120px]">
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Max Price ($)</label>
                <Input
                  type="number"
                  placeholder="Any"
                  value={maxPrice}
                  onChange={(e) => handleMaxPriceChange(e.target.value)}
                  min="0"
                  step="1"
                  className="h-9"
                />
              </div>
              {hasActiveFilters && (
                <Button variant="ghost" size="sm" onClick={clearFilters} className="h-9">
                  Clear All
                </Button>
              )}
            </div>
          )}
        </div>

        {loading ? (
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {[...Array(12)].map((_, i) => (
              <ListingCardSkeleton key={i} />
            ))}
          </div>
        ) : listings.length === 0 ? (
          <div className="text-center py-16 px-4">
            <div className="max-w-md mx-auto">
              <p className="text-2xl font-bold mb-2">🔍 Nothing here yet!</p>
              <p className="text-muted-foreground mb-4">
                We couldn't find any grails matching your search. Try adjusting your filters or broadening your criteria.
              </p>
              <Button onClick={clearFilters} variant="outline">
                Reset Filters & Browse All
              </Button>
            </div>
          </div>
        ) : (
          <>
            <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {listings.map((listing) => {
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
          onSortChange={handleSortChange}
          showFilters={showFilters}
          onToggleFilters={() => setShowFilters(!showFilters)}
          minPrice={minPrice}
          maxPrice={maxPrice}
          onMinPriceChange={handleMinPriceChange}
          onMaxPriceChange={handleMaxPriceChange}
          onClearFilters={clearFilters}
          hasActiveFilters={hasActiveFilters}
        />
      </main>
    </>
  );
}
