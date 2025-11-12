import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, Star } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

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
}

interface ComicVinePickerProps {
  picks: ComicVinePick[];
  onSelect: (pick: ComicVinePick) => void;
}

export function ComicVinePicker({ picks, onSelect }: ComicVinePickerProps) {
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [excludeReprints, setExcludeReprints] = useState(true);
  
  const filteredPicks = excludeReprints 
    ? picks.filter(p => !p.isReprint)
    : picks;

  // Auto-select if top pick has score >= 0.72
  useEffect(() => {
    if (filteredPicks.length > 0 && filteredPicks[0].score >= 0.72) {
      setSelectedId(filteredPicks[0].id);
    }
  }, [filteredPicks]);

  const handleConfirm = () => {
    const selected = filteredPicks.find(p => p.id === selectedId);
    if (selected) {
      onSelect(selected);
    }
  };

  if (filteredPicks.length === 0 && excludeReprints) {
    return (
      <Card className="w-full">
        <CardHeader>
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
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm">
            No original editions found. Try disabling the reprint filter.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="text-lg flex items-center justify-between">
          <span>Select ComicVine Match</span>
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
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3">
          {filteredPicks.map((pick, idx) => {
            const isSelected = pick.id === selectedId;
            const isTopPick = idx === 0;
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
                {/* Thumbnail */}
                <div className="flex-shrink-0 w-16 h-24 bg-muted rounded overflow-hidden">
                  <img
                    src={pick.thumbUrl}
                    alt={`${pick.title} #${pick.issue || ''}`}
                    className="w-full h-full object-cover"
                  />
                </div>

                {/* Details */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold text-sm truncate">
                        {pick.title} {pick.issue ? `#${pick.issue}` : ''}
                      </h4>
                      <p className="text-xs text-muted-foreground">
                        {pick.publisher} {pick.year ? `• ${pick.year}` : ''}
                      </p>
                    </div>
                    
                    {/* Badges */}
                    <div className="flex flex-col items-end gap-1">
                      {isTopPick && pick.score >= 0.72 && (
                        <Badge variant="default" className="text-xs">
                          <Star className="w-3 h-3 mr-1" />
                          Best Match
                        </Badge>
                      )}
                      <Badge 
                        variant={confidencePercent >= 72 ? "default" : "secondary"}
                        className="text-xs"
                      >
                        {confidencePercent}% match
                      </Badge>
                    </div>
                  </div>
                </div>

                {/* Selection indicator */}
                {isSelected && (
                  <div className="absolute top-2 right-2 w-6 h-6 bg-primary rounded-full flex items-center justify-center">
                    <Check className="w-4 h-4 text-primary-foreground" />
                  </div>
                )}
              </button>
            );
          })}
        </div>

        <Button
          onClick={handleConfirm}
          disabled={!selectedId}
          className="w-full"
        >
          Use Selected Match
        </Button>
      </CardContent>
    </Card>
  );
}
