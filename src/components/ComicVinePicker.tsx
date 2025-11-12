import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, Star } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

interface ComicVineResult {
  id: string | number;
  name: string;
  issue_number: string;
  volume: string;
  publisher: string;
  year: string;
  thumbnail: string;
  score: number;
  normalizedScore: number;
  description?: string;
}

interface ComicVinePickerProps {
  results: ComicVineResult[];
  onSelect: (result: ComicVineResult) => void;
}

export function ComicVinePicker({ results, onSelect }: ComicVinePickerProps) {
  const [selectedId, setSelectedId] = useState<string | number | null>(null);
  const [excludeReprints, setExcludeReprints] = useState(true);

  const reprintPattern = /(facsimile|true believers|reprint|anniversary|2nd print|third print|second print)/i;
  
  const filteredResults = excludeReprints 
    ? results.filter(r => !reprintPattern.test(r.description || ''))
    : results;

  // Auto-select if top result has normalizedScore >= 0.72
  useEffect(() => {
    if (filteredResults.length > 0 && filteredResults[0].normalizedScore >= 0.72) {
      setSelectedId(filteredResults[0].id);
    }
  }, [filteredResults]);

  const handleConfirm = () => {
    const selected = filteredResults.find(r => r.id === selectedId);
    if (selected) {
      onSelect(selected);
    }
  };

  if (filteredResults.length === 0 && excludeReprints) {
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
          {filteredResults.map((result, idx) => {
            const isSelected = result.id === selectedId;
            const isTopPick = idx === 0;
            const confidencePercent = Math.round(result.normalizedScore * 100);

            return (
              <button
                key={result.id}
                onClick={() => setSelectedId(result.id)}
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
                    src={result.thumbnail}
                    alt={`${result.volume} #${result.issue_number}`}
                    className="w-full h-full object-cover"
                  />
                </div>

                {/* Details */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold text-sm truncate">
                        {result.volume || result.name} #{result.issue_number}
                      </h4>
                      <p className="text-xs text-muted-foreground">
                        {result.publisher} • {result.year}
                      </p>
                    </div>
                    
                    {/* Badges */}
                    <div className="flex flex-col items-end gap-1">
                      {isTopPick && result.normalizedScore >= 0.72 && (
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

                  {/* Score details (dev only) */}
                  {import.meta.env.DEV && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Raw score: {result.score.toFixed(2)}
                    </p>
                  )}
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
