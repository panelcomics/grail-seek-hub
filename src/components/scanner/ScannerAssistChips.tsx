/**
 * SCANNER ASSIST CHIPS
 * ==========================================================================
 * Optional publisher/format filters to bias matching.
 * Persists selections in localStorage per session.
 * ==========================================================================
 */

import { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Sparkles, HelpCircle } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export type PublisherFilter = 'marvel' | 'dc' | 'indie' | null;
export type FormatFilter = 'raw' | 'slab';

export interface ScanContext {
  publisherFilter: PublisherFilter;
  format: FormatFilter;
}

interface ScannerAssistChipsProps {
  onChange: (context: ScanContext) => void;
}

const STORAGE_KEY = 'scanner_assist_context';

const PUBLISHER_KEYWORDS: Record<string, string[]> = {
  marvel: ['marvel', 'marvel comics', 'timely', 'atlas'],
  dc: ['dc', 'dc comics', 'detective comics', 'national'],
  indie: ['image', 'dark horse', 'idw', 'boom', 'dynamite', 'valiant', 'aftershock', 'oni', 'fantagraphics', 'archie']
};

export function ScannerAssistChips({ onChange }: ScannerAssistChipsProps) {
  const [publisherFilter, setPublisherFilter] = useState<PublisherFilter>(null);
  const [format, setFormat] = useState<FormatFilter>('raw');

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as ScanContext;
        if (parsed.publisherFilter !== undefined) setPublisherFilter(parsed.publisherFilter);
        if (parsed.format) setFormat(parsed.format);
      }
    } catch (e) {
      console.warn('Failed to load scanner assist context:', e);
    }
  }, []);

  // Save to localStorage and notify parent on change
  useEffect(() => {
    const context: ScanContext = { publisherFilter, format };
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(context));
    } catch (e) {
      console.warn('Failed to save scanner assist context:', e);
    }
    onChange(context);
  }, [publisherFilter, format, onChange]);

  const handlePublisherClick = (value: PublisherFilter) => {
    setPublisherFilter(prev => prev === value ? null : value);
  };

  return (
    <div className="space-y-3 p-4 bg-muted/30 rounded-lg border border-border/50">
      <div className="flex items-center gap-2">
        <Sparkles className="w-4 h-4 text-primary" />
        <span className="text-sm font-medium">Scanner Assist</span>
        <span className="text-xs text-muted-foreground">(optional)</span>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <HelpCircle className="w-3.5 h-3.5 text-muted-foreground cursor-help" />
            </TooltipTrigger>
            <TooltipContent>
              <p className="text-xs max-w-[200px]">
                Helps narrow the search for faster matches
              </p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      {/* Publisher Filter */}
      <div className="space-y-1.5">
        <p className="text-xs text-muted-foreground">Publisher</p>
        <div className="flex flex-wrap gap-2">
          <Badge
            variant={publisherFilter === 'marvel' ? 'default' : 'outline'}
            className="cursor-pointer transition-all hover:scale-105"
            onClick={() => handlePublisherClick('marvel')}
          >
            Marvel
          </Badge>
          <Badge
            variant={publisherFilter === 'dc' ? 'default' : 'outline'}
            className="cursor-pointer transition-all hover:scale-105"
            onClick={() => handlePublisherClick('dc')}
          >
            DC
          </Badge>
          <Badge
            variant={publisherFilter === 'indie' ? 'default' : 'outline'}
            className="cursor-pointer transition-all hover:scale-105"
            onClick={() => handlePublisherClick('indie')}
          >
            Indie / Other
          </Badge>
        </div>
      </div>

      {/* Format Filter */}
      <div className="space-y-1.5">
        <p className="text-xs text-muted-foreground">Format</p>
        <div className="flex flex-wrap gap-2">
          <Badge
            variant={format === 'raw' ? 'default' : 'outline'}
            className="cursor-pointer transition-all hover:scale-105"
            onClick={() => setFormat('raw')}
          >
            Raw Comic
          </Badge>
          <Badge
            variant={format === 'slab' ? 'default' : 'outline'}
            className="cursor-pointer transition-all hover:scale-105"
            onClick={() => setFormat('slab')}
          >
            Slabbed (CGC/PGX/CBCS)
          </Badge>
        </div>
        {format === 'slab' && (
          <p className="text-xs text-muted-foreground mt-1">
            Slabs scan differently than raw covers
          </p>
        )}
      </div>
    </div>
  );
}

/**
 * Apply publisher bias to search results
 * Boosts matches whose publisher belongs to selected filter
 */
export function applyPublisherBias<T extends { publisher?: string | null; score?: number }>(
  results: T[],
  publisherFilter: PublisherFilter
): T[] {
  if (!publisherFilter || results.length === 0) return results;

  const keywords = PUBLISHER_KEYWORDS[publisherFilter] || [];
  
  // Create a copy and sort, preserving original type
  const sorted = [...results];
  sorted.sort((a, b) => {
    const aMatch = keywords.some(kw => 
      a.publisher?.toLowerCase().includes(kw)
    );
    const bMatch = keywords.some(kw => 
      b.publisher?.toLowerCase().includes(kw)
    );

    // Boost matching publisher to top
    if (aMatch && !bMatch) return -1;
    if (!aMatch && bMatch) return 1;

    // Otherwise sort by score
    return (b.score || 0) - (a.score || 0);
  });
  
  return sorted;
}
