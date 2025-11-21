import { useState, useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";
import { ScanButton } from "@/components/scanner/ScanButton";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Search, SlidersHorizontal, ChevronDown } from "lucide-react";
import ItemCard from "@/components/ItemCard";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
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
  const [filterSlab, setFilterSlab] = useState(false);
  const [filterRaw, setFilterRaw] = useState(false);
  const [filterAuction, setFilterAuction] = useState(false);
  const [filterBuyNow, setFilterBuyNow] = useState(false);
  const [filterLocalPickup, setFilterLocalPickup] = useState(false);
  const [filterCGC, setFilterCGC] = useState(false);
  const [filterPGX, setFilterPGX] = useState(false);
  
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
    if (!query.trim()) {
      setResults([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    setShowDropdown(false);

    try {
      const { data, error } = await supabase
        .from("inventory_items")
        .select(`
          *,
          profiles:owner_id (
            username,
            is_verified_seller,
            completed_sales_count
          )
        `)
        .or(`title.ilike.%${query}%,series.ilike.%${query}%,issue_number.ilike.%${query}%`)
        .eq("listing_status", "listed")
        .eq("for_sale", true)
        .limit(20);

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

      {/* Filters and Sort */}
      {isSearching && (
        <div className="border-b border-border bg-background">
          <div className="max-w-7xl mx-auto px-4 py-4">
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <Collapsible open={showFilters} onOpenChange={setShowFilters}>
                <CollapsibleTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-2">
                    <SlidersHorizontal className="h-4 w-4" />
                    Filters
                    <ChevronDown className={`h-4 w-4 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="mt-4">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-muted/50 rounded-lg">
                    <div className="space-y-2">
                      <Label className="text-xs font-semibold text-muted-foreground uppercase">
                        Condition
                      </Label>
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <Checkbox
                            id="slab"
                            checked={filterSlab}
                            onCheckedChange={(checked) => setFilterSlab(!!checked)}
                          />
                          <Label htmlFor="slab" className="text-sm cursor-pointer">
                            Slab
                          </Label>
                        </div>
                        <div className="flex items-center gap-2">
                          <Checkbox
                            id="raw"
                            checked={filterRaw}
                            onCheckedChange={(checked) => setFilterRaw(!!checked)}
                          />
                          <Label htmlFor="raw" className="text-sm cursor-pointer">
                            Raw
                          </Label>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-xs font-semibold text-muted-foreground uppercase">
                        Listing Type
                      </Label>
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <Checkbox
                            id="auction"
                            checked={filterAuction}
                            onCheckedChange={(checked) => setFilterAuction(!!checked)}
                          />
                          <Label htmlFor="auction" className="text-sm cursor-pointer">
                            Auction
                          </Label>
                        </div>
                        <div className="flex items-center gap-2">
                          <Checkbox
                            id="buynow"
                            checked={filterBuyNow}
                            onCheckedChange={(checked) => setFilterBuyNow(!!checked)}
                          />
                          <Label htmlFor="buynow" className="text-sm cursor-pointer">
                            Buy Now
                          </Label>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-xs font-semibold text-muted-foreground uppercase">
                        Grading Company
                      </Label>
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <Checkbox
                            id="cgc"
                            checked={filterCGC}
                            onCheckedChange={(checked) => setFilterCGC(!!checked)}
                          />
                          <Label htmlFor="cgc" className="text-sm cursor-pointer">
                            CGC
                          </Label>
                        </div>
                        <div className="flex items-center gap-2">
                          <Checkbox
                            id="pgx"
                            checked={filterPGX}
                            onCheckedChange={(checked) => setFilterPGX(!!checked)}
                          />
                          <Label htmlFor="pgx" className="text-sm cursor-pointer">
                            PGX
                          </Label>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-xs font-semibold text-muted-foreground uppercase">
                        Other
                      </Label>
                      <div className="flex items-center gap-2">
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
                <Label className="text-sm text-muted-foreground">Sort by:</Label>
                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ending-soon">Ending Soon</SelectItem>
                    <SelectItem value="newly-listed">Newly Listed</SelectItem>
                    <SelectItem value="price-low">Price: Low to High</SelectItem>
                    <SelectItem value="price-high">Price: High to Low</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Results or No Results */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        {isSearching && results.length > 0 && (
          <div>
            <p className="text-sm text-muted-foreground mb-4">
              {results.length} results for "{searchQuery}"
            </p>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {results.map((item) => (
                <ItemCard
                  key={item.id}
                  id={item.id}
                  title={item.title || `${item.series} #${item.issue_number}`}
                  price={item.listed_price}
                  condition={item.cgc_grade || item.condition || "Raw"}
                  image={item.images?.[0] || "/placeholder.svg"}
                  category="comic"
                  sellerName={item.profiles?.username}
                  isVerifiedSeller={item.profiles?.is_verified_seller}
                  completedSalesCount={item.profiles?.completed_sales_count}
                />
              ))}
            </div>
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
