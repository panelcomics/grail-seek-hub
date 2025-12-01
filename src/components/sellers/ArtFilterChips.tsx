import { Badge } from "@/components/ui/badge";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";

// Art category mapping - uses existing listing.subcategory field (frontend-only mapping)
// TODO: Consider adding art_type enum column to inventory_items table for better categorization
export const ART_CATEGORIES = [
  { id: "all", label: "All Art", subcategoryMatch: null },
  { id: "covers", label: "Covers", subcategoryMatch: "cover" },
  { id: "interior", label: "Interior Art", subcategoryMatch: "interior" },
  { id: "pinups", label: "Pin-Ups", subcategoryMatch: "pinup" },
  { id: "commissions", label: "Commissions", subcategoryMatch: "commission" },
  { id: "sketches", label: "Sketches", subcategoryMatch: "sketch" },
] as const;

interface ArtFilterChipsProps {
  activeFilter: string;
  onFilterChange: (filterId: string) => void;
  listingCounts?: Record<string, number>; // Optional counts per category
}

export function ArtFilterChips({
  activeFilter,
  onFilterChange,
  listingCounts,
}: ArtFilterChipsProps) {
  return (
    <div className="border-b border-border">
      <ScrollArea className="w-full whitespace-nowrap">
        <div className="flex gap-2 pb-4">
          {ART_CATEGORIES.map((category) => {
            const count = listingCounts?.[category.id];
            const isActive = activeFilter === category.id;
            
            return (
              <button
                key={category.id}
                onClick={() => onFilterChange(category.id)}
                className={`
                  inline-flex items-center gap-2 px-4 py-2 rounded-full border transition-all
                  ${isActive
                    ? "bg-primary text-primary-foreground border-primary shadow-sm"
                    : "bg-background border-border hover:border-primary/50 hover:bg-accent/50"
                  }
                `}
              >
                <span className="text-sm font-medium whitespace-nowrap">
                  {category.label}
                </span>
                {count !== undefined && count > 0 && (
                  <Badge 
                    variant={isActive ? "secondary" : "outline"}
                    className="text-xs px-1.5 py-0.5 h-5"
                  >
                    {count}
                  </Badge>
                )}
              </button>
            );
          })}
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
    </div>
  );
}

/**
 * Helper function to filter listings by art category
 * TODO: Add art_type or subcategory field to inventory_items/listings table for proper filtering
 * For now, this is a visual-only filter that doesn't actually filter (returns all listings)
 */
export function filterListingsByArtCategory<T>(
  listings: T[],
  categoryId: string
): T[] {
  // TODO: Implement actual filtering once art_type field is added to database
  // For now, return all listings regardless of category selection
  return listings;
}

/**
 * Helper to count listings per category
 * TODO: Implement actual counting once art_type field is added
 */
export function countListingsByCategory<T>(
  listings: T[]
): Record<string, number> {
  const counts: Record<string, number> = {};
  
  // For now, show all listings count for every category
  // TODO: Implement per-category counts once art_type field exists
  ART_CATEGORIES.forEach(category => {
    counts[category.id] = listings.length;
  });
  
  return counts;
}
