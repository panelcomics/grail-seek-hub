import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, Star, Sparkles, Database } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { getSessionId } from "@/lib/session";

interface ComicVinePick {
  id: number;
  resource: 'issue' | 'volume';
  title: string;
  issue: string | null;
  year: number | null;
  publisher?: string | null;
  volumeName?: string | null;
  volumeId?: number | null;
  variantDescription?: string | null;
  thumbUrl: string;
  coverUrl: string;
  score: number;
  isReprint: boolean;
  source?: 'comicvine' | 'cache' | 'gcd';
}

interface ComicVinePickerProps {
  picks: ComicVinePick[];
  onSelect: (pick: ComicVinePick) => void;
}

export function ComicVinePicker({ picks, onSelect }: ComicVinePickerProps) {
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [excludeReprints, setExcludeReprints] = useState(true);
  const [featureFlags, setFeatureFlags] = useState({
    reprintFilter: false,
    pickAutofill: false,
    top3Picks: false
  });

  useEffect(() => {
    const checkFlags = async () => {
      try {
        setFeatureFlags({
          reprintFilter: true,
          pickAutofill: true,
          top3Picks: true
        });
      } catch (e) {
        console.warn('Could not check feature flags:', e);
      }
    };
    checkFlags();
  }, []);
  
  const filteredPicks = (featureFlags.reprintFilter && excludeReprints)
    ? picks.filter(p => {
        const reprintKeywords = /(facsimile|true believers|reprint|anniversary|edition|2nd print|third print|second print|replica|reproduction|variant facsimile)/i;
        const textToCheck = `${p.title || ''} ${p.volumeName || ''} ${p.variantDescription || ''}`;
        const hasReprintKeyword = reprintKeywords.test(textToCheck);
        return !p.isReprint && !hasReprintKeyword;
      })
    : picks;

  // Group picks by confidence sections
  const highConfidence = filteredPicks.filter(p => p.score >= 0.80);
  const mediumConfidence = filteredPicks.filter(p => p.score >= 0.50 && p.score < 0.80);
  const lowConfidence = filteredPicks.filter(p => p.score < 0.50);

  // Auto-select top high confidence pick only
  useEffect(() => {
    if (highConfidence.length > 0) {
      setSelectedId(highConfidence[0].id);
    }
  }, [highConfidence]);

  const handleConfirm = async () => {
    const selected = filteredPicks.find(p => p.id === selectedId);
    if (!selected) return;
    
    try {
      const sessionId = getSessionId();
      
      await supabase.functions.invoke('track-pick', {
        body: {
          sessionId,
          source: selected.source || 'comicvine',
          score: selected.score
        }
      });
      
      await supabase.functions.invoke('save-verified', {
        body: {
          title: selected.title,
          issue: selected.issue,
          publisher: selected.publisher,
          year: selected.year,
          variant_description: selected.variantDescription,
          cover_url: selected.coverUrl,
          source_id: selected.id.toString(),
          source: selected.source || 'comicvine'
        }
      });
    } catch (error) {
      console.warn('Failed to track/save pick:', error);
    }
    
    onSelect(selected);
  };

  const renderSection = (
    title: string, 
    items: ComicVinePick[], 
    badgeVariant: "default" | "secondary" | "destructive", 
    badgeLabel: string
  ) => {
    if (items.length === 0) return null;
    
    return (
      <div key={title} className="mb-6 last:mb-0">
        <h3 className="text-base font-semibold mb-3 flex items-center gap-2">
          {title}
          <Badge variant="outline" className="text-xs">
            {items.length} {items.length === 1 ? 'result' : 'results'}
          </Badge>
        </h3>
        <div className="grid gap-3">
          {items.map((pick) => {
            const isSelected = selectedId === pick.id;
            const sourceLabel = pick.source === 'cache' ? 'Verified' : pick.source === 'gcd' ? 'GCD' : 'ComicVine';
            const confidencePercent = Math.round(pick.score * 100);
            
            return (
              <button
                key={pick.id}
                onClick={() => setSelectedId(pick.id)}
                className={`
                  relative flex items-start gap-3 p-3 rounded-lg border-2 transition-all text-left
                  ${isSelected 
                    ? 'border-primary bg-primary/5' 
                    : 'border-border hover:border-primary/50 hover:bg-accent'
                  }
                `}
              >
                <div className="flex-shrink-0 w-16 h-24 bg-muted rounded overflow-hidden">
                  <img
                    src={pick.thumbUrl}
                    alt={`${pick.title} #${pick.issue || ''}`}
                    className="w-full h-full object-cover"
                  />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold text-sm truncate">
                        {pick.volumeName || pick.title} {pick.issue ? `#${pick.issue}` : ''}
                      </h4>
                      <p className="text-xs text-muted-foreground">
                        {pick.publisher} {pick.year ? `• ${pick.year}` : ''}
                      </p>
                      {pick.variantDescription && (
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-1">
                          {pick.variantDescription}
                        </p>
                      )}
                    </div>
                    
                    <div className="flex flex-col items-end gap-1">
                      <Badge variant={badgeVariant} className="text-xs whitespace-nowrap">
                        {badgeLabel}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {confidencePercent}%
                      </span>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2 flex-wrap mt-2">
                    <Badge variant="outline" className="text-xs flex items-center gap-1">
                      {pick.source === 'cache' && <Star className="w-3 h-3" />}
                      {pick.source === 'gcd' && <Database className="w-3 h-3" />}
                      {sourceLabel}
                    </Badge>
                    {pick.isReprint && (
                      <Badge variant="secondary" className="text-xs">
                        Reprint
                      </Badge>
                    )}
                  </div>
                </div>
                
                {isSelected && (
                  <div className="flex-shrink-0 flex items-center">
                    <Check className="w-5 h-5 text-primary" />
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  // Build conditional UI sections
  let cardTitle: JSX.Element;
  let cardContent: JSX.Element;

  if (filteredPicks.length === 0 && excludeReprints) {
    // Empty state with reprint filter active
    cardTitle = (
      <CardTitle className="text-lg flex items-center justify-between">
        ComicVine Matches
        <div className="flex items-center space-x-2">
          <Switch
            id="exclude-reprints"
            checked={excludeReprints}
            onCheckedChange={setExcludeReprints}
          />
          <Label htmlFor="exclude-reprints" className="text-sm font-normal cursor-pointer">
            Exclude reprints/facsimiles
          </Label>
        </div>
      </CardTitle>
    );

    cardContent = (
      <CardContent>
        <p className="text-muted-foreground text-sm">
          No original editions found. Try disabling the reprint filter.
        </p>
      </CardContent>
    );
  } else {
    // Main picker UI with confidence sections
    cardTitle = (
      <CardTitle className="text-lg flex items-center justify-between">
        <span className="flex items-center gap-2">
          <Sparkles className="w-5 h-5" />
          Select Your Comic
        </span>
        {featureFlags.reprintFilter && (
          <div className="flex items-center space-x-2">
            <Switch
              id="exclude-reprints"
              checked={excludeReprints}
              onCheckedChange={setExcludeReprints}
            />
            <Label htmlFor="exclude-reprints" className="text-sm font-normal cursor-pointer">
              Hide reprints
            </Label>
          </div>
        )}
      </CardTitle>
    );

    const resultSections = (
      <>
        {renderSection(
          "Best / High Confidence",
          highConfidence,
          "default",
          "Best Match"
        )}
        
        {renderSection(
          "Possible Alternates",
          mediumConfidence,
          "secondary",
          "Possible Match"
        )}
        
        {renderSection(
          "Low Confidence / Unrelated",
          lowConfidence,
          "destructive",
          "Low Confidence – Likely Not Your Comic"
        )}

        {filteredPicks.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <p>No matches found. Try adjusting your filters or use manual search.</p>
          </div>
        )}
      </>
    );

    cardContent = (
      <CardContent className="space-y-6">
        {resultSections}

        {selectedId && (
          <Button onClick={handleConfirm} className="w-full" size="lg">
            Confirm Selection
          </Button>
        )}
      </CardContent>
    );
  }

  // Single final return
  return (
    <Card className="w-full">
      <CardHeader>{cardTitle}</CardHeader>
      {cardContent}
    </Card>
  );
}
