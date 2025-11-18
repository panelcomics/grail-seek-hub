import { Button } from "@/components/ui/button";
import { Check } from "lucide-react";

interface QuickFilterChipsProps {
  filterNotReprint: boolean;
  filterWrongYear: boolean;
  filterSlabbed: boolean;
  onFilterToggle: (filter: 'reprint' | 'year' | 'slabbed') => void;
  onApplyFilters: () => void;
  isLoading?: boolean;
}

export function QuickFilterChips({
  filterNotReprint,
  filterWrongYear,
  filterSlabbed,
  onFilterToggle,
  onApplyFilters,
  isLoading
}: QuickFilterChipsProps) {
  const hasActiveFilters = filterNotReprint || filterWrongYear || filterSlabbed;

  return (
    <div className="flex flex-wrap gap-2">
      <Button
        size="sm"
        variant={filterNotReprint ? "default" : "outline"}
        onClick={() => onFilterToggle('reprint')}
        className="text-xs"
        disabled={isLoading}
      >
        {filterNotReprint && <Check className="h-3 w-3 mr-1" />}
        Not a Reprint
      </Button>
      
      <Button
        size="sm"
        variant={filterWrongYear ? "default" : "outline"}
        onClick={() => onFilterToggle('year')}
        className="text-xs"
        disabled={isLoading}
      >
        {filterWrongYear && <Check className="h-3 w-3 mr-1" />}
        Wrong Year
      </Button>
      
      <Button
        size="sm"
        variant={filterSlabbed ? "default" : "outline"}
        onClick={() => onFilterToggle('slabbed')}
        className="text-xs"
        disabled={isLoading}
      >
        {filterSlabbed && <Check className="h-3 w-3 mr-1" />}
        Slabbed Version
      </Button>

      {hasActiveFilters && (
        <Button
          size="sm"
          onClick={onApplyFilters}
          disabled={isLoading}
          className="text-xs"
        >
          Apply Filters
        </Button>
      )}
    </div>
  );
}
