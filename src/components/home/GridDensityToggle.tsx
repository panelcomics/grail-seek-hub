/**
 * Grid Density Toggle
 * 
 * Small toggle near listings to switch between:
 * - "Comfortable" (current spacing)
 * - "Compact" (denser, ComicBookAddiction-style)
 * 
 * Only visible when ENABLE_VISUAL_PARITY_UPGRADE is true.
 */

import { LayoutGrid, Grid3X3 } from "lucide-react";
import { GridDensity } from "@/hooks/useVisualParity";
import { cn } from "@/lib/utils";

interface GridDensityToggleProps {
  density: GridDensity;
  onChange: (density: GridDensity) => void;
}

export function GridDensityToggle({ density, onChange }: GridDensityToggleProps) {
  return (
    <div className="flex items-center gap-1 bg-muted rounded-md p-0.5">
      <button
        onClick={() => onChange("comfortable")}
        className={cn(
          "flex items-center gap-1 px-2 py-1 rounded text-xs font-medium transition-colors",
          density === "comfortable"
            ? "bg-card text-foreground shadow-sm"
            : "text-muted-foreground hover:text-foreground"
        )}
        aria-label="Comfortable view"
        title="Comfortable spacing"
      >
        <LayoutGrid className="h-3.5 w-3.5" />
        <span className="hidden sm:inline">Comfortable</span>
      </button>
      <button
        onClick={() => onChange("compact")}
        className={cn(
          "flex items-center gap-1 px-2 py-1 rounded text-xs font-medium transition-colors",
          density === "compact"
            ? "bg-card text-foreground shadow-sm"
            : "text-muted-foreground hover:text-foreground"
        )}
        aria-label="Compact view"
        title="Compact spacing"
      >
        <Grid3X3 className="h-3.5 w-3.5" />
        <span className="hidden sm:inline">Compact</span>
      </button>
    </div>
  );
}
