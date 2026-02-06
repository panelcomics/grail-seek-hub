import { SlidersHorizontal, ArrowUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

interface MobileFilterBarProps {
  sortBy: "newest" | "price_asc" | "price_desc" | "title";
  onSortChange: (value: "newest" | "price_asc" | "price_desc" | "title") => void;
  showFilters: boolean;
  onToggleFilters: () => void;
  minPrice?: string;
  maxPrice?: string;
  onMinPriceChange?: (value: string) => void;
  onMaxPriceChange?: (value: string) => void;
  onClearFilters?: () => void;
  hasActiveFilters?: boolean;
}

export function MobileFilterBar({
  sortBy,
  onSortChange,
  showFilters,
  onToggleFilters,
  minPrice = "",
  maxPrice = "",
  onMinPriceChange,
  onMaxPriceChange,
  onClearFilters,
  hasActiveFilters,
}: MobileFilterBarProps) {
  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-background border-t border-border md:hidden">
      <div className="flex items-center justify-around py-3 px-4">
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="outline" className="flex-1 mr-2 relative">
              <SlidersHorizontal className="h-4 w-4 mr-2" />
              Filters
              {hasActiveFilters && (
                <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-primary" />
              )}
            </Button>
          </SheetTrigger>
          <SheetContent side="bottom" className="h-auto max-h-[80vh]">
            <SheetHeader>
              <SheetTitle>Filter Listings</SheetTitle>
              <SheetDescription>
                Narrow down results by price range.
              </SheetDescription>
            </SheetHeader>
            <div className="py-4 space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Price Range</label>
                <div className="flex gap-3 items-center">
                  <div className="flex-1">
                    <Input
                      type="number"
                      placeholder="Min $"
                      value={minPrice}
                      onChange={(e) => onMinPriceChange?.(e.target.value)}
                      min="0"
                      step="1"
                    />
                  </div>
                  <span className="text-muted-foreground">to</span>
                  <div className="flex-1">
                    <Input
                      type="number"
                      placeholder="Max $"
                      value={maxPrice}
                      onChange={(e) => onMaxPriceChange?.(e.target.value)}
                      min="0"
                      step="1"
                    />
                  </div>
                </div>
              </div>

              {hasActiveFilters && (
                <Button variant="outline" className="w-full" onClick={onClearFilters}>
                  Clear All Filters
                </Button>
              )}
            </div>
          </SheetContent>
        </Sheet>

        <Sheet>
          <SheetTrigger asChild>
            <Button variant="outline" className="flex-1">
              <ArrowUpDown className="h-4 w-4 mr-2" />
              Sort
            </Button>
          </SheetTrigger>
          <SheetContent side="bottom" className="h-auto">
            <SheetHeader>
              <SheetTitle>Sort By</SheetTitle>
            </SheetHeader>
            <div className="py-4 space-y-2">
              <Button
                variant={sortBy === "newest" ? "default" : "ghost"}
                className="w-full justify-start"
                onClick={() => onSortChange("newest")}
              >
                Newest First
              </Button>
              <Button
                variant={sortBy === "price_asc" ? "default" : "ghost"}
                className="w-full justify-start"
                onClick={() => onSortChange("price_asc")}
              >
                Price: Low to High
              </Button>
              <Button
                variant={sortBy === "price_desc" ? "default" : "ghost"}
                className="w-full justify-start"
                onClick={() => onSortChange("price_desc")}
              >
                Price: High to Low
              </Button>
              <Button
                variant={sortBy === "title" ? "default" : "ghost"}
                className="w-full justify-start"
                onClick={() => onSortChange("title")}
              >
                Title A-Z
              </Button>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </div>
  );
}
