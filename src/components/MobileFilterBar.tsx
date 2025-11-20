import { SlidersHorizontal, ArrowUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface MobileFilterBarProps {
  sortBy: "newest" | "price_asc" | "price_desc" | "title";
  onSortChange: (value: "newest" | "price_asc" | "price_desc" | "title") => void;
  showFilters: boolean;
  onToggleFilters: () => void;
}

export function MobileFilterBar({ sortBy, onSortChange, showFilters, onToggleFilters }: MobileFilterBarProps) {
  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-background border-t border-border md:hidden">
      <div className="flex items-center justify-around py-3 px-4">
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="outline" className="flex-1 mr-2">
              <SlidersHorizontal className="h-4 w-4 mr-2" />
              Filters
            </Button>
          </SheetTrigger>
          <SheetContent side="bottom" className="h-[80vh]">
            <SheetHeader>
              <SheetTitle>Filter Listings</SheetTitle>
              <SheetDescription>
                Refine your search by publisher, grade, price, and more.
              </SheetDescription>
            </SheetHeader>
            <div className="py-4">
              <p className="text-muted-foreground text-sm">Filter options will appear here</p>
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
                onClick={() => {
                  onSortChange("newest");
                }}
              >
                Newest First
              </Button>
              <Button
                variant={sortBy === "price_asc" ? "default" : "ghost"}
                className="w-full justify-start"
                onClick={() => {
                  onSortChange("price_asc");
                }}
              >
                Price: Low to High
              </Button>
              <Button
                variant={sortBy === "price_desc" ? "default" : "ghost"}
                className="w-full justify-start"
                onClick={() => {
                  onSortChange("price_desc");
                }}
              >
                Price: High to Low
              </Button>
              <Button
                variant={sortBy === "title" ? "default" : "ghost"}
                className="w-full justify-start"
                onClick={() => {
                  onSortChange("title");
                }}
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
