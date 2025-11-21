import { useState, useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";
import { ScanButton } from "@/components/scanner/ScanButton";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Search, SlidersHorizontal, ChevronDown, X } from "lucide-react";
import ItemCard from "@/components/ItemCard";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

const POPULAR_SEARCHES = [
  "Amazing Spider-Man #300",
  "Hulk 181",
  "Ultimate Fallout 4",
  "Batman 423",
  "X-Men keys",
];

const POPULAR_KEYS = [
  { id: "1", title: "Amazing Spider-Man #300", price: 450, condition: "CGC 9.8", image: "/covers/sample-asm.jpg", category: "comic" as const },
  { id: "2", title: "Incredible Hulk #181", price: 2800, condition: "CGC 9.0", image: "/covers/sample-hulk.jpg", category: "comic" as const },
  { id: "3", title: "Ultimate Fallout #4", price: 180, condition: "Raw NM", image: "/covers/sample-ff.jpg", category: "comic" as const },
  { id: "4", title: "Batman #423", price: 95, condition: "CGC 9.6", image: "/covers/sample-batman.jpg", category: "comic" as const },
];

const TRENDING_SERIES = [
  "Spider-Man",
  "X-Men",
  "Venom",
  "Batman",
];

export default function SearchPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [results, setResults] = useState<any[]>([]);
  const [recentSearches] = useState<string[]>(["Spider-Man #1", "Hulk #181"]);
  const [showFilters, setShowFilters] = useState(false);
  const [sortBy, setSortBy] = useState("ending-soon");
  
  // Filter states
  const [filterFormat, setFilterFormat] = useState<"all" | "slab" | "raw">("all");
  const [filterSaleType, setFilterSaleType] = useState<"all" | "auction" | "buynow">("all");
  const [filterLocalPickup, setFilterLocalPickup] = useState(false);
  const [filterPriceMin, setFilterPriceMin] = useState<string>("");
  const [filterPriceMax, setFilterPriceMax] = useState<string>("");
  
  const { toast } = useToast();
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        setShowDropdown(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSearch = async (query: string) => {
    const trimmed = query.trim();
    const normalized = trimmed.toLowerCase().replace(/#/g, " ");
    const tokens = normalized.split(/\s+/).filter(Boolean);
    const numberTokens = tokens.filter((t) => /^\d+$/.test(t));
    const textTokens = tokens.filter((t) => !/^\d+$/.test(t));
    const textTerm = textTokens.join(" ");
    const issueTerm = numberTokens[0];

    setIsSearching(true);
    setShowDropdown(false);

    try {
      let queryBuilder = supabase
        .from("inventory_items")
        .select(`
          *,
          profiles:owner_id (
            username,
            is_verified_seller,
            completed_sales_count
          )
        `)
        .eq("listing_status", "listed")
        .eq("for_sale", true)
        .limit(50);

      if (textTerm || issueTerm) {
        const orParts: string[] = [];
        if (textTerm) {
          orParts.push(`title.ilike.%${textTerm}%`);
          orParts.push(`series.ilike.%${textTerm}%`);
        }
        if (issueTerm) {
          orParts.push(`issue_number.ilike.%${issueTerm}%`);
        }
        const orFilter = orParts.join(",");
        queryBuilder = queryBuilder.or(orFilter);
      }

      const { data, error } = await queryBuilder;

      if (error) throw error;

      setResults(data || []);
    } catch (error: any) {
      console.error("Search error:", error);
      toast({
        title: "Search failed",
        description: error.message || "Unable to search",
        variant: "destructive",
      });
    }
  };

  const handleScanResult = async (searchText: string) => {
    setSearchQuery(searchText);
    handleSearch(searchText);
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleSearch(searchQuery);
  };

  const handlePopularSearchClick = (term: string) => {
    setSearchQuery(term);
    handleSearch(term);
  };

  const clearAllFilters = () => {
    setFilterFormat("all");
    setFilterSaleType("all");
    setFilterLocalPickup(false);
    setFilterPriceMin("");
    setFilterPriceMax("");
  };

  const getActiveFilters = () => {
    const active: { label: string; key: string }[] = [];
    if (filterFormat === "slab") active.push({ label: "Slab", key: "format" });
    if (filterFormat === "raw") active.push({ label: "Raw", key: "format" });
    if (filterSaleType === "auction") active.push({ label: "Auction", key: "saletype" });
    if (filterSaleType === "buynow") active.push({ label: "Buy Now", key: "saletype" });
    if (filterLocalPickup) active.push({ label: "Local Pickup", key: "local" });
    if (filterPriceMin || filterPriceMax) {
      const min = filterPriceMin ? `$${filterPriceMin}` : "";
      const max = filterPriceMax ? `$${filterPriceMax}` : "";
      const label = min && max ? `Price: ${min}–${max}` : min ? `Min: ${min}` : `Max: ${max}`;
      active.push({ label, key: "price" });
    }
    return active;
  };

  const removeFilter = (key: string) => {
    switch (key) {
      case "format": setFilterFormat("all"); break;
      case "saletype": setFilterSaleType("all"); break;
      case "local": setFilterLocalPickup(false); break;
      case "price": 
        setFilterPriceMin("");
        setFilterPriceMax("");
        break;
    }
  };

  const applyFilters = (items: any[]) => {
    return items.filter((item) => {
      // Format filter (Slab/Raw)
      if (filterFormat !== "all") {
        const condition = (item.cgc_grade || item.condition || "").toLowerCase();
        const isSlab = condition.includes('cgc') || condition.includes('cbcs') || condition.includes('slab');
        if (filterFormat === "slab" && !isSlab) return false;
        if (filterFormat === "raw" && isSlab) return false;
      }

      // Sale Type filter (Auction/Buy Now)
      if (filterSaleType !== "all") {
        const isAuction = item.for_auction === true;
        if (filterSaleType === "auction" && !isAuction) return false;
        if (filterSaleType === "buynow" && isAuction) return false;
      }

      // Local Pickup filter
      if (filterLocalPickup) {
        // Assuming there's a field for this - if not, this will always filter out
        // You may need to adjust based on actual schema
        if (!item.local_pickup) return false;
      }

      // Price Range filter
      const price = item.listed_price;
      if (price !== null && price !== undefined) {
        const min = filterPriceMin ? parseFloat(filterPriceMin) : null;
        const max = filterPriceMax ? parseFloat(filterPriceMax) : null;
        if (min !== null && price < min) return false;
        if (max !== null && price > max) return false;
      }

      return true;
    });
  };

  const activeFilters = getActiveFilters();
  const filteredResults = applyFilters(results);

  return (
    <main className="flex-1 bg-background">
      {/* Search Header */}
      <div className="bg-[hsl(var(--muted))] border-b border-border">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <form onSubmit={handleSearchSubmit} className="relative max-w-2xl mx-auto">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground pointer-events-none" />
              <Input
                ref={inputRef}
                type="text"
                placeholder="Search grails, keys, slabs, or creators…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => setShowDropdown(true)}
                className="h-14 pl-12 pr-16 text-base rounded-full shadow-md border-0 bg-background"
              />
              <div className="absolute right-2 top-1/2 -translate-y-1/2">
                <ScanButton onScanResult={handleScanResult} />
              </div>
            </div>

            {/* Dropdown for Recent/Popular Searches */}
            {showDropdown && !isSearching && (
              <div
                ref={dropdownRef}
                className="absolute top-full mt-2 w-full bg-background rounded-lg shadow-lg border border-border overflow-hidden z-50"
              >
                {recentSearches.length > 0 && (
                  <div className="p-3 border-b border-border">
                    <h3 className="text-xs font-semibold text-muted-foreground uppercase mb-2">
                      Recent Searches
                    </h3>
                    <div className="space-y-1">
                      {recentSearches.map((term, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => handlePopularSearchClick(term)}
                          className="w-full text-left px-3 py-2 rounded hover:bg-muted text-sm transition-colors"
                        >
                          {term}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <div className="p-3">
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase mb-2">
                    Popular Searches
                  </h3>
                  <div className="space-y-1">
                    {POPULAR_SEARCHES.map((term, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => handlePopularSearchClick(term)}
                        className="w-full text-left px-3 py-2 rounded hover:bg-muted text-sm transition-colors"
                      >
                        {term}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </form>
        </div>
      </div>

      {/* Filters and Sort Bar */}
      {isSearching && (
        <div className="border-b border-border bg-muted/30 shadow-sm">
          <div className="max-w-7xl mx-auto px-4 py-3">
            {/* Main Control Bar */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <Collapsible open={showFilters} onOpenChange={setShowFilters}>
                <CollapsibleTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-2 h-9">
                    <SlidersHorizontal className="h-4 w-4" />
                    Filters
                    {activeFilters.length > 0 && (
                      <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">
                        {activeFilters.length}
                      </Badge>
                    )}
                    <ChevronDown className={`h-4 w-4 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="mt-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 p-4 bg-background rounded-lg border border-border shadow-sm">
                    {/* Format Filter */}
                    <div className="space-y-2">
                      <Label className="text-xs font-semibold text-muted-foreground uppercase">
                        Format
                      </Label>
                      <Select value={filterFormat} onValueChange={(val: any) => setFilterFormat(val)}>
                        <SelectTrigger className="w-full h-9">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-background z-50">
                          <SelectItem value="all">All</SelectItem>
                          <SelectItem value="slab">Slab</SelectItem>
                          <SelectItem value="raw">Raw</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Sale Type Filter */}
                    <div className="space-y-2">
                      <Label className="text-xs font-semibold text-muted-foreground uppercase">
                        Sale Type
                      </Label>
                      <Select value={filterSaleType} onValueChange={(val: any) => setFilterSaleType(val)}>
                        <SelectTrigger className="w-full h-9">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-background z-50">
                          <SelectItem value="all">All</SelectItem>
                          <SelectItem value="auction">Auction</SelectItem>
                          <SelectItem value="buynow">Buy Now</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Price Range Filter */}
                    <div className="space-y-2">
                      <Label className="text-xs font-semibold text-muted-foreground uppercase">
                        Price Range
                      </Label>
                      <div className="flex items-center gap-2">
                        <Input
                          type="number"
                          placeholder="Min"
                          value={filterPriceMin}
                          onChange={(e) => setFilterPriceMin(e.target.value)}
                          className="h-9"
                        />
                        <span className="text-muted-foreground">–</span>
                        <Input
                          type="number"
                          placeholder="Max"
                          value={filterPriceMax}
                          onChange={(e) => setFilterPriceMax(e.target.value)}
                          className="h-9"
                        />
                      </div>
                    </div>

                    {/* Local Pickup Filter */}
                    <div className="space-y-2">
                      <Label className="text-xs font-semibold text-muted-foreground uppercase">
                        Other Options
                      </Label>
                      <div className="flex items-center gap-2 h-9">
                        <Checkbox
                          id="local"
                          checked={filterLocalPickup}
                          onCheckedChange={(checked) => setFilterLocalPickup(!!checked)}
                        />
                        <Label htmlFor="local" className="text-sm cursor-pointer">
                          Local Pickup
                        </Label>
                      </div>
                    </div>
                  </div>
                </CollapsibleContent>
              </Collapsible>

              <div className="flex items-center gap-2">
                <Label className="text-sm text-muted-foreground hidden sm:inline">Sort:</Label>
                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger className="w-[160px] h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-background z-50">
                    <SelectItem value="ending-soon">Ending Soon</SelectItem>
                    <SelectItem value="newly-listed">Newly Listed</SelectItem>
                    <SelectItem value="price-low">Price: Low → High</SelectItem>
                    <SelectItem value="price-high">Price: High → Low</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Active Filter Chips */}
            {activeFilters.length > 0 && (
              <div className="flex items-center gap-2 mt-3 pt-3 border-t border-border flex-wrap">
                {activeFilters.map((filter) => (
                  <Badge
                    key={filter.key}
                    variant="secondary"
                    className="gap-1 pr-1 py-1 h-7"
                  >
                    {filter.label}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-4 w-4 p-0 hover:bg-transparent"
                      onClick={() => removeFilter(filter.key)}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </Badge>
                ))}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearAllFilters}
                  className="h-7 text-xs text-muted-foreground hover:text-foreground"
                >
                  Clear all
                </Button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Results or No Results */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        {isSearching && filteredResults.length > 0 && (
          <div>
            <p className="text-sm text-muted-foreground mb-4">
              {filteredResults.length} result{filteredResults.length !== 1 ? 's' : ''} {searchQuery && `for "${searchQuery}"`}
            </p>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {filteredResults.map((item) => (
                <ItemCard
                  key={item.id}
                  id={item.id}
                  title={item.title || `${item.series} #${item.issue_number}`}
                  price={item.listed_price}
                  condition={item.cgc_grade || item.condition || "Raw"}
                  image={(item.images as any)?.front || "/placeholder.svg"}
                  category="comic"
                  sellerName={item.profiles?.username}
                  isVerifiedSeller={item.profiles?.is_verified_seller}
                  completedSalesCount={item.profiles?.completed_sales_count}
                />
              ))}
            </div>
          </div>
        )}

        {isSearching && filteredResults.length === 0 && results.length > 0 && (
          <div className="text-center py-12">
            <p className="text-lg text-muted-foreground mb-4">
              No listings match your filters.
            </p>
            <Button variant="outline" onClick={clearAllFilters}>
              Clear all filters
            </Button>
          </div>
        )}

        {isSearching && results.length === 0 && (
          <div className="text-center py-12">
            <p className="text-lg text-muted-foreground mb-8">
              No grails found. Try searching for a different issue or title.
            </p>

            {/* Popular Keys */}
            <div className="mb-12">
              <h2 className="text-2xl font-bold mb-6">Popular Keys</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-5xl mx-auto">
                {POPULAR_KEYS.map((item) => (
                  <ItemCard
                    key={item.id}
                    id={item.id}
                    title={item.title}
                    price={item.price}
                    condition={item.condition}
                    image={item.image}
                    category={item.category}
                  />
                ))}
              </div>
            </div>

            {/* Trending Series */}
            <div>
              <h2 className="text-2xl font-bold mb-6">Trending Series</h2>
              <div className="flex flex-wrap justify-center gap-3 max-w-2xl mx-auto">
                {TRENDING_SERIES.map((series, idx) => (
                  <Button
                    key={idx}
                    variant="outline"
                    onClick={() => handlePopularSearchClick(series)}
                    className="rounded-full"
                  >
                    {series}
                  </Button>
                ))}
              </div>
            </div>
          </div>
        )}

        {!isSearching && (
          <div className="text-center py-12">
            <p className="text-muted-foreground">
              Start searching to discover grails, keys, and slabs.
            </p>
          </div>
        )}
      </div>
    </main>
  );
}
