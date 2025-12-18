/**
 * SCANNER ASSIST RESULTS v2
 * ==========================================================================
 * Displays 3-5 ComicVine candidate matches for user selection.
 * User MUST explicitly select a comic - no auto-selection.
 * 
 * v2 Polish:
 * - Colored confidence badges (High=green, Medium=yellow, Low=gray)
 * - "Why We Think This Is Correct" bullet points
 * - Better empty-state copy with tips
 * ==========================================================================
 */

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Check, Sparkles, AlertCircle, Search, Camera, Sun, Lightbulb, Info } from "lucide-react";
import { ComicVinePick } from "@/types/comicvine";
import { getConfidenceLabel } from "@/lib/comicVineMatchingStrategy";

interface ScannerAssistResultsProps {
  candidates: ComicVinePick[];
  onSelect: (pick: ComicVinePick) => void;
  onSkip: () => void;
  onManualSearch: () => void;
}

// Helper to get confidence badge styling
function getConfidenceBadgeStyles(score: number): { 
  variant: "default" | "secondary" | "outline";
  className: string;
  label: string;
} {
  if (score >= 0.80) {
    return { 
      variant: "default", 
      className: "bg-green-500/20 text-green-600 border-green-500/30 hover:bg-green-500/30",
      label: "High"
    };
  }
  if (score >= 0.50) {
    return { 
      variant: "secondary", 
      className: "bg-yellow-500/20 text-yellow-600 border-yellow-500/30 hover:bg-yellow-500/30",
      label: "Medium"
    };
  }
  return { 
    variant: "outline", 
    className: "bg-muted/50 text-muted-foreground border-muted-foreground/30",
    label: "Low"
  };
}

// Helper to generate match reasoning bullets
function getMatchReasons(pick: ComicVinePick): string[] {
  const reasons: string[] = [];
  
  // Title/volume match
  if (pick.volumeName || pick.title) {
    reasons.push(`Title matched: "${pick.volumeName || pick.title}"`);
  }
  
  // Issue number match
  if (pick.issue) {
    reasons.push(`Issue number #${pick.issue} detected`);
  }
  
  // Publisher match
  if (pick.publisher) {
    reasons.push(`Publisher: ${pick.publisher}`);
  }
  
  // Year alignment
  if (pick.year) {
    reasons.push(`Publication year: ${pick.year}`);
  }
  
  // Key issue info
  if (pick.keyNotes) {
    reasons.push(`Key issue indicators found`);
  }
  
  return reasons.slice(0, 4); // Max 4 reasons
}

export function ScannerAssistResults({
  candidates,
  onSelect,
  onSkip,
  onManualSearch,
}: ScannerAssistResultsProps) {
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [expandedId, setExpandedId] = useState<number | null>(null);

  // Limit to 5 candidates max
  const displayCandidates = candidates.slice(0, 5);

  const handleConfirm = () => {
    const selected = displayCandidates.find((c) => c.id === selectedId);
    if (selected) {
      onSelect(selected);
    }
  };

  // Better empty-state with tips
  if (displayCandidates.length === 0) {
    return (
      <Card className="w-full">
        <CardHeader className="text-center">
          <div className="mx-auto w-12 h-12 rounded-full bg-amber-500/10 flex items-center justify-center mb-3">
            <AlertCircle className="w-6 h-6 text-amber-500" />
          </div>
          <CardTitle className="text-lg">We Couldn't Identify This Comic</CardTitle>
          <CardDescription className="text-sm">
            This can happen with glare, angles, or partial covers. Here are some tips:
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Helpful tips */}
          <div className="bg-muted/50 rounded-lg p-3 space-y-2">
            <h4 className="text-sm font-medium flex items-center gap-2">
              <Lightbulb className="w-4 h-4 text-amber-500" />
              Tips for Better Scans
            </h4>
            <ul className="text-xs text-muted-foreground space-y-1.5 ml-6">
              <li className="flex items-start gap-2">
                <Sun className="w-3 h-3 mt-0.5 shrink-0" />
                <span>Use bright, even lighting — avoid harsh shadows</span>
              </li>
              <li className="flex items-start gap-2">
                <Camera className="w-3 h-3 mt-0.5 shrink-0" />
                <span>Place comic flat on a surface, shoot from directly above</span>
              </li>
              <li className="flex items-start gap-2">
                <AlertCircle className="w-3 h-3 mt-0.5 shrink-0" />
                <span>Avoid glare from bag/sleeve — remove if possible</span>
              </li>
              <li className="flex items-start gap-2">
                <Search className="w-3 h-3 mt-0.5 shrink-0" />
                <span>Make sure the full cover is visible in frame</span>
              </li>
            </ul>
          </div>

          <div className="space-y-2">
            <Button onClick={onManualSearch} className="w-full" variant="default">
              <Search className="w-4 h-4 mr-2" />
              Search ComicVine Manually
            </Button>
            <Button onClick={onSkip} variant="outline" className="w-full">
              Skip & Enter Details Manually
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <TooltipProvider>
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            Scanner Assist Found Matches
          </CardTitle>
          <CardDescription>
            Select the correct comic to auto-fill your listing details.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3">
            {displayCandidates.map((pick) => {
              const isSelected = selectedId === pick.id;
              const isExpanded = expandedId === pick.id;
              const confidencePercent = Math.round(pick.score * 100);
              const badgeStyles = getConfidenceBadgeStyles(pick.score);
              const matchReasons = getMatchReasons(pick);

              return (
                <div key={pick.id} className="space-y-1">
                  <button
                    onClick={() => setSelectedId(pick.id)}
                    className={`
                      relative flex items-start gap-3 p-3 rounded-lg border-2 transition-all text-left w-full
                      ${isSelected
                        ? "border-primary bg-primary/10 shadow-md"
                        : "border-border hover:border-primary/50 hover:bg-accent/50"
                      }
                    `}
                  >
                    {/* Cover Image */}
                    <div className="flex-shrink-0 w-16 h-24 bg-muted rounded overflow-hidden border border-border shadow-sm">
                      <img
                        src={pick.thumbUrl || pick.coverUrl}
                        alt={`${pick.title} #${pick.issue || ""}`}
                        className="w-full h-full object-cover"
                      />
                    </div>

                    {/* Comic Info */}
                    <div className="flex-1 min-w-0 space-y-1.5">
                      <h4 className="font-semibold text-sm leading-tight">
                        {pick.volumeName || pick.title}
                        {pick.issue && (
                          <span className="ml-1 text-primary">#{pick.issue}</span>
                        )}
                      </h4>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        {pick.publisher && (
                          <span className="font-medium">{pick.publisher}</span>
                        )}
                        {pick.year && (
                          <>
                            <span>•</span>
                            <span>{pick.year}</span>
                          </>
                        )}
                      </div>
                      
                      {/* Confidence Badge with Tooltip */}
                      <div className="flex items-center gap-2 flex-wrap pt-1">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Badge
                              variant={badgeStyles.variant}
                              className={`text-xs cursor-help ${badgeStyles.className}`}
                            >
                              {badgeStyles.label} ({confidencePercent}%)
                            </Badge>
                          </TooltipTrigger>
                          <TooltipContent side="top" className="max-w-xs">
                            <p className="text-xs">
                              {badgeStyles.label === "High" && "Strong match based on title, issue, and cover"}
                              {badgeStyles.label === "Medium" && "Partial match — verify details before confirming"}
                              {badgeStyles.label === "Low" && "Weak match — may not be the correct comic"}
                            </p>
                          </TooltipContent>
                        </Tooltip>
                        
                        {/* Why button */}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setExpandedId(isExpanded ? null : pick.id);
                          }}
                          className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
                        >
                          <Info className="w-3 h-3" />
                          Why?
                        </button>
                      </div>
                    </div>

                    {/* Selection Indicator */}
                    {isSelected && (
                      <div className="flex-shrink-0 flex items-center">
                        <div className="rounded-full bg-primary p-1">
                          <Check className="w-4 h-4 text-primary-foreground" />
                        </div>
                      </div>
                    )}
                  </button>
                  
                  {/* Expanded "Why" section */}
                  {isExpanded && matchReasons.length > 0 && (
                    <div className="ml-4 pl-3 border-l-2 border-muted py-2 animate-in fade-in slide-in-from-top-1">
                      <p className="text-xs font-medium text-muted-foreground mb-1.5">
                        Why we think this is correct:
                      </p>
                      <ul className="text-xs text-muted-foreground space-y-1">
                        {matchReasons.map((reason, idx) => (
                          <li key={idx} className="flex items-start gap-2">
                            <Check className="w-3 h-3 text-green-500 mt-0.5 shrink-0" />
                            <span>{reason}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Action Buttons */}
          <div className="space-y-2 pt-2">
            <Button
              onClick={handleConfirm}
              disabled={selectedId === null}
              className="w-full"
              size="lg"
            >
              <Check className="w-4 h-4 mr-2" />
              Select This Comic
            </Button>
            <div className="flex gap-2">
              <Button onClick={onManualSearch} variant="outline" className="flex-1">
                <Search className="w-4 h-4 mr-2" />
                Search Manually
              </Button>
              <Button onClick={onSkip} variant="ghost" className="flex-1">
                Skip
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </TooltipProvider>
  );
}
