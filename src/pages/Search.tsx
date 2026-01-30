import { useState, useEffect, useRef } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { ScanButton } from "@/components/scanner/ScanButton";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Search, SlidersHorizontal, X, Bookmark } from "lucide-react";
import ItemCard from "@/components/ItemCard";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ListingCardSkeleton } from "@/components/ui/listing-card-skeleton";
import { debugLog } from "@/lib/debug";
import { SaveSearchButton } from "@/components/SaveSearchButton";
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

const GRADE_OPTIONS = ["All", "10.0", "9.9", "9.8", "9.6", "9.4", "9.2", "9.0", "8.5", "8.0", "7.5", "7.0", "Raw"];
const PUBLISHER_OPTIONS = ["All", "Marvel", "DC", "Image", "Dark Horse", "IDW", "Other"];

export default function SearchPage() {
  const [searchParams] = useSearchParams();
  const [searchQuery, setSearchQuery] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [results, setResults] = useState<any[]>([]);
  const [recentSearches] = useState<string[]>(["Spider-Man #1", "Hulk #181"]);
  const [showFilters, setShowFilters] = useState(false);
  const [sortBy, setSortBy] = useState("newest");
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [offset, setOffset] = useState(0);
  const ITEMS_PER_PAGE = 24;
  
  // Filter states
  const [filterGrade, setFilterGrade] = useState("All");
  const [filterFormat, setFilterFormat] = useState<"all" | "slab" | "raw">("all");
  const [filterPublisher, setFilterPublisher] = useState("All");
  const [filterLocalPickup, setFilterLocalPickup] = useState(false);
  const [filterPriceMin, setFilterPriceMin] = useState<string>("");
  const [filterPriceMax, setFilterPriceMax] = useState<string>("");
  
  const { toast } = useToast();
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Load search from URL params on mount
  useEffect(() => {
    const queryParam = searchParams.get("q");
    if (queryParam) {
      setSearchQuery(queryParam);
      handleSearch(queryParam);
    }
  }, [searchParams]);

  // Remove auto-close on mobile - only close on explicit action
  useEffect(() => {
    const isMobile = window.innerWidth < 768;
    if (isMobile) return; // Skip click-outside on mobile
    
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

  const handleSearch = async (query: string, loadMore = false) => {
    const trimmed = query.trim();
    
    if (!trimmed) {
      setIsSearching(false);
      setResults([]);
      return;
    }

    const normalized = trimmed.toLowerCase().replace(/#/g, " ");
    const tokens = normalized.split(/\s+/).filter(Boolean);
    const numberTokens = tokens.filter((t) => /^\d+$/.test(t));
    const textTokens = tokens.filter((t) => !/^\d+$/.test(t));
    const textTerm = textTokens.join(" ");
    const issueTerm = numberTokens[0];

    if (!loadMore) {
      setIsSearching(true);
      setShowDropdown(false);
      setOffset(0);
    } else {
      setLoadingMore(true);
    }

    try {
      const currentOffset = loadMore ? offset : 0;
      
      // Query inventory_items
      let inventoryQuery = supabase
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
        .range(currentOffset, currentOffset + ITEMS_PER_PAGE - 1);

      if (textTerm || issueTerm) {
        const orParts: string[] = [];
        if (textTerm) {
          orParts.push(`title.ilike.%${textTerm}%`);
          orParts.push(`series.ilike.%${textTerm}%`);
          // Search artists, writers, and signers
          orParts.push(`writer.ilike.%${textTerm}%`);
          orParts.push(`artist.ilike.%${textTerm}%`);
          orParts.push(`cover_artist.ilike.%${textTerm}%`);
          orParts.push(`signed_by.ilike.%${textTerm}%`);
        }
        if (issueTerm) {
          orParts.push(`issue_number.ilike.%${issueTerm}%`);
        }
        const orFilter = orParts.join(",");
        inventoryQuery = inventoryQuery.or(orFilter);
      }

      // Query original_art (public, for sale)
      let artQuery = supabase
        .from("original_art")
        .select(`
          *,
          profiles:owner_user_id (
            username,
            is_verified_seller,
            completed_sales_count
          )
        `)
        .eq("visibility", "public")
        .eq("for_sale", true)
        .range(currentOffset, currentOffset + ITEMS_PER_PAGE - 1);

      if (textTerm) {
        artQuery = artQuery.or(`title.ilike.%${textTerm}%,artist_name.ilike.%${textTerm}%,description.ilike.%${textTerm}%`);
      }

      // Execute both queries in parallel
      const [inventoryResult, artResult] = await Promise.all([
        inventoryQuery,
        artQuery
      ]);

      if (inventoryResult.error) throw inventoryResult.error;

      // Transform original_art results to match inventory_items shape
      const transformedArt = (artResult.data || []).map((art: any) => ({
        id: art.id,
        title: art.title,
        listed_price: art.price,
        images: { primary: art.image_url, others: [] },
        artist: art.artist_name,
        condition: art.condition || 'Original Art',
        created_at: art.created_at,
        for_sale: art.for_sale,
        is_slab: false,
        listing_status: 'listed',
        profiles: art.profiles,
        owner_id: art.owner_user_id,
        user_id: art.owner_user_id,
        _type: 'original_art', // Tag to identify art items
        description: art.description,
        medium: art.medium,
        dimensions: art.dimensions,
      }));

      // Merge and dedupe results
      const inventoryData = inventoryResult.data || [];
      const mergedResults = [...inventoryData, ...transformedArt];

      if (loadMore) {
        setResults(prev => [...prev, ...mergedResults]);
      } else {
        setResults(mergedResults);
      }
      
      setHasMore(mergedResults.length === ITEMS_PER_PAGE * 2 || inventoryData.length === ITEMS_PER_PAGE);
      setOffset(currentOffset + ITEMS_PER_PAGE);
    } catch (error: any) {
      toast({
        title: "Search failed",
        description: error.message || "Unable to search",
        variant: "destructive",
      });
      if (!loadMore) setResults([]);
    } finally {
      setIsSearching(true);
      setLoadingMore(false);
    }
  };

  const loadMoreResults = () => {
    if (!loadingMore && hasMore) {
      handleSearch(searchQuery, true);
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
    setFilterGrade("All");
    setFilterFormat("all");
    setFilterPublisher("All");
    setFilterLocalPickup(false);
    setFilterPriceMin("");
    setFilterPriceMax("");
  };

  const getActiveFilters = () => {
    const active: { label: string; key: string }[] = [];
    if (filterGrade !== "All") active.push({ label: `Grade: ${filterGrade}`, key: "grade" });
    if (filterFormat === "slab") active.push({ label: "Slab", key: "format" });
    if (filterFormat === "raw") active.push({ label: "Raw", key: "format" });
    if (filterPublisher !== "All") active.push({ label: filterPublisher, key: "publisher" });
    if (filterLocalPickup) active.push({ label: "Local Pickup", key: "local" });
    if (filterPriceMin || filterPriceMax) {
      const min = filterPriceMin ? `$${filterPriceMin}` : "";
      const max = filterPriceMax ? `$${filterPriceMax}` : "";
      const label = min && max ? `${min}–${max}` : min ? `Min: ${min}` : `Max: ${max}`;
      active.push({ label, key: "price" });
    }
    return active;
  };

  const removeFilter = (key: string) => {
    switch (key) {
      case "grade": setFilterGrade("All"); break;
      case "format": setFilterFormat("all"); break;
      case "publisher": setFilterPublisher("All"); break;
      case "local": setFilterLocalPickup(false); break;
      case "price": 
        setFilterPriceMin("");
        setFilterPriceMax("");
        break;
    }
  };

  const applyFilters = (items: any[]) => {
    return items.filter((item) => {
      // Grade filter
      if (filterGrade !== "All") {
        const condition = (item.cgc_grade || item.condition || "").toLowerCase();
        if (filterGrade === "Raw") {
          const isSlab = condition.includes('cgc') || condition.includes('cbcs') || condition.includes('slab');
          if (isSlab) return false;
        } else {
          if (!condition.includes(filterGrade.toLowerCase())) return false;
        }
      }

      // Format filter (Slab/Raw)
      if (filterFormat !== "all") {
        const isSlab = item.is_slab === true;
        if (filterFormat === "slab" && !isSlab) return false;
        if (filterFormat === "raw" && isSlab) return false;
      }

      // Publisher filter
      if (filterPublisher !== "All") {
        const publisher = (item.publisher || "").toLowerCase();
        if (filterPublisher === "Other") {
          if (["marvel", "dc", "image", "dark horse", "idw"].some(p => publisher.includes(p))) return false;
        } else {
          if (!publisher.includes(filterPublisher.toLowerCase())) return false;
        }
      }

      // Local Pickup filter
      if (filterLocalPickup && !item.local_pickup) return false;

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

  const sortResults = (items: any[]) => {
    const sorted = [...items];
    
    switch (sortBy) {
      case "newest":
        return sorted.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      case "price-low":
        return sorted.sort((a, b) => (a.listed_price || 0) - (b.listed_price || 0));
      case "price-high":
        return sorted.sort((a, b) => (b.listed_price || 0) - (a.listed_price || 0));
      case "grade-high":
        return sorted.sort((a, b) => {
          const gradeA = parseFloat((a.cgc_grade || a.grade || "0").match(/\d+\.?\d*/)?.[0] || "0");
          const gradeB = parseFloat((b.cgc_grade || b.grade || "0").match(/\d+\.?\d*/)?.[0] || "0");
          return gradeB - gradeA;
        });
      case "grade-low":
        return sorted.sort((a, b) => {
          const gradeA = parseFloat((a.cgc_grade || a.grade || "0").match(/\d+\.?\d*/)?.[0] || "0");
          const gradeB = parseFloat((b.cgc_grade || b.grade || "0").match(/\d+\.?\d*/)?.[0] || "0");
          return gradeA - gradeB;
        });
      default:
        return sorted;
    }
  };

  const activeFilters = getActiveFilters();
  const filteredResults = sortResults(applyFilters(results));

  return (
    <main className="flex-1 bg-background">
      {/* Search Header */}
      <div className="bg-muted/50 border-b border-border">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <form onSubmit={handleSearchSubmit} className="relative max-w-2xl mx-auto">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground pointer-events-none" />
              <Input
                ref={inputRef}
                type="text"
                placeholder="Hunt: ASM 300, Hulk 181, CGC 9.8 slabs..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => setShowDropdown(true)}
                className="h-14 pl-12 pr-16 text-base rounded-full shadow-lg border border-border bg-white"
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
        <div className="border-b border-border bg-background shadow-sm">
          <div className="max-w-7xl mx-auto px-4 py-2.5">
            {/* Main Control Bar */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2 flex-wrap">
                <Collapsible open={showFilters} onOpenChange={setShowFilters} className="w-full sm:w-auto">
                  <CollapsibleTrigger asChild>
                    <Button variant="outline" size="sm" className="gap-2 h-8 text-xs w-full sm:w-auto">
                      <SlidersHorizontal className="h-3.5 w-3.5" />
                      Filters
                      {activeFilters.length > 0 && (
                        <Badge variant="secondary" className="ml-1 h-4 px-1.5 text-[10px]">
                          {activeFilters.length}
                        </Badge>
                      )}
                    </Button>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="mt-3">
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 p-3 bg-muted/30 rounded-xl border border-border">
                    {/* Grade Filter */}
                    <div className="space-y-1.5">
                      <Label className="text-[10px] font-semibold text-muted-foreground uppercase">
                        Grade
                      </Label>
                      <Select value={filterGrade} onValueChange={setFilterGrade}>
                        <SelectTrigger className="w-full h-8 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-background z-50">
                          {GRADE_OPTIONS.map(grade => (
                            <SelectItem key={grade} value={grade} className="text-xs">{grade}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Format Filter */}
                    <div className="space-y-1.5">
                      <Label className="text-[10px] font-semibold text-muted-foreground uppercase">
                        Format
                      </Label>
                      <Select value={filterFormat} onValueChange={(val: any) => setFilterFormat(val)}>
                        <SelectTrigger className="w-full h-8 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-background z-50">
                          <SelectItem value="all" className="text-xs">All</SelectItem>
                          <SelectItem value="slab" className="text-xs">Slab</SelectItem>
                          <SelectItem value="raw" className="text-xs">Raw</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Publisher Filter */}
                    <div className="space-y-1.5">
                      <Label className="text-[10px] font-semibold text-muted-foreground uppercase">
                        Publisher
                      </Label>
                      <Select value={filterPublisher} onValueChange={setFilterPublisher}>
                        <SelectTrigger className="w-full h-8 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-background z-50">
                          {PUBLISHER_OPTIONS.map(pub => (
                            <SelectItem key={pub} value={pub} className="text-xs">{pub}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Price Min */}
                    <div className="space-y-1.5">
                      <Label className="text-[10px] font-semibold text-muted-foreground uppercase">
                        Min Price
                      </Label>
                      <Input
                        type="number"
                        placeholder="$0"
                        value={filterPriceMin}
                        onChange={(e) => setFilterPriceMin(e.target.value)}
                        className="h-8 text-xs"
                      />
                    </div>

                    {/* Price Max */}
                    <div className="space-y-1.5">
                      <Label className="text-[10px] font-semibold text-muted-foreground uppercase">
                        Max Price
                      </Label>
                      <Input
                        type="number"
                        placeholder="Any"
                        value={filterPriceMax}
                        onChange={(e) => setFilterPriceMax(e.target.value)}
                        className="h-8 text-xs"
                      />
                    </div>

                    {/* Local Pickup */}
                    <div className="space-y-1.5">
                      <Label className="text-[10px] font-semibold text-muted-foreground uppercase">
                        Pickup
                      </Label>
                      <div className="flex items-center gap-2 h-8">
                        <Checkbox
                          id="local"
                          checked={filterLocalPickup}
                          onCheckedChange={(checked) => setFilterLocalPickup(!!checked)}
                        />
                        <Label htmlFor="local" className="text-xs cursor-pointer">
                          Local
                        </Label>
                      </div>
                    </div>
                  </div>
                </CollapsibleContent>
                </Collapsible>
                
                {activeFilters.length > 0 && (
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={clearAllFilters}
                    className="h-8 text-xs text-muted-foreground hover:text-foreground"
                  >
                    <X className="h-3.5 w-3.5 mr-1" />
                    Clear all
                  </Button>
                )}
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <SaveSearchButton
                  query={{
                    q: searchQuery || undefined,
                    minPrice: filterPriceMin ? parseFloat(filterPriceMin) : undefined,
                    maxPrice: filterPriceMax ? parseFloat(filterPriceMax) : undefined,
                    grade: filterGrade !== "All" ? filterGrade : undefined,
                    publisher: filterPublisher !== "All" ? filterPublisher : undefined,
                  }}
                />
                <Link to="/saved-searches" className="hidden sm:inline">
                  <Button variant="ghost" size="sm" className="h-8 text-xs gap-1">
                    <Bookmark className="h-3.5 w-3.5" />
                    Saved
                  </Button>
                </Link>
                <Label className="text-xs text-muted-foreground hidden sm:inline whitespace-nowrap">Sort:</Label>
                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger className="w-full sm:w-[140px] h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-background z-50">
                    <SelectItem value="newest" className="text-xs">Newest</SelectItem>
                    <SelectItem value="price-low" className="text-xs">Price: Low to High</SelectItem>
                    <SelectItem value="price-high" className="text-xs">Price: High to Low</SelectItem>
                    <SelectItem value="grade-high" className="text-xs">Grade: High to Low</SelectItem>
                    <SelectItem value="grade-low" className="text-xs">Grade: Low to High</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Active Filter Chips */}
            {activeFilters.length > 0 && (
              <div className="flex items-center gap-1.5 mt-2.5 pt-2.5 border-t border-border overflow-x-auto">
                {activeFilters.map((filter) => (
                  <Badge
                    key={filter.key}
                    variant="secondary"
                    className="gap-1 pr-0.5 py-0.5 h-6 text-[10px] flex-shrink-0"
                  >
                    {filter.label}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-4 w-4 p-0 hover:bg-transparent"
                      onClick={() => removeFilter(filter.key)}
                    >
                      <X className="h-2.5 w-2.5" />
                    </Button>
                  </Badge>
                ))}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearAllFilters}
                  className="h-6 text-[10px] text-muted-foreground hover:text-foreground px-2"
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
        {/* Loading more skeletons */}
        {loadingMore && (
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 mb-6">
            {[...Array(8)].map((_, i) => (
              <ListingCardSkeleton key={`skeleton-more-${i}`} />
            ))}
          </div>
        )}
        
        {/* Empty state: No search yet */}
        {!isSearching && (
          <div className="text-center py-20">
            <h2 className="text-2xl font-bold mb-3 text-muted-foreground">
              🔍 Search for Your Grails
            </h2>
            <p className="text-base text-muted-foreground">
              Enter a comic title, issue number, or keyword to start hunting.
            </p>
          </div>
        )}

        {/* Empty state: No results found */}
        {isSearching && results.length === 0 && (
          <div className="text-center py-16 px-4">
            <div className="max-w-md mx-auto">
              <p className="text-2xl font-bold mb-2">📚 No matches found</p>
              <p className="text-muted-foreground mb-4">
                We couldn't find any comics matching "{searchQuery}". Try different keywords or check out what's trending!
              </p>
              <Button onClick={() => window.location.href = '/marketplace'} variant="outline">
                Browse All Comics
              </Button>
            </div>
          </div>
        )}

        {/* Empty state: Filters too strict */}
        {isSearching && results.length > 0 && filteredResults.length === 0 && (
          <div className="text-center py-16 px-4">
            <div className="max-w-md mx-auto">
              <p className="text-2xl font-bold mb-2">🔧 Filters too strict</p>
              <p className="text-muted-foreground mb-4">
                No results match your current filters. Try removing some filters to see more grails.
              </p>
              <Button onClick={() => clearAllFilters()} variant="outline">
                Clear All Filters
              </Button>
            </div>
          </div>
        )}

        {/* Results grid */}
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
                  image={(item.images as any)?.front || (item.images as any)?.primary || "/placeholder.svg"}
                  category="comic"
                  sellerName={item.profiles?.username}
                  isVerifiedSeller={item.profiles?.is_verified_seller}
                  completedSalesCount={item.profiles?.completed_sales_count}
                  isAuction={item.for_auction}
                  localPickupAvailable={item.local_pickup}
                  isSlab={item.is_slab}
                  grade={item.cgc_grade}
                  gradingCompany={item.grading_company}
                  certificationNumber={item.certification_number}
                  series={item.series}
                  issueNumber={item.issue_number}
                  keyInfo={item.key_details || item.variant_description || item.details}
                  isSigned={item.is_signed}
                  signatureType={item.signature_type}
                  signedBy={item.signed_by}
                  showFavorite={true}
                />
              ))}
            </div>
            
            {hasMore && isSearching && (
              <div className="flex justify-center mt-8">
                <Button 
                  onClick={loadMoreResults} 
                  disabled={loadingMore}
                  size="lg"
                  variant="outline"
                >
                  {loadingMore ? "Loading..." : "Load More"}
                </Button>
              </div>
            )}
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
