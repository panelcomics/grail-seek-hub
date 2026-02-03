/**
 * GRAIL SCAN RECAP CARD
 * ==========================================================================
 * Post-scan overlay summarizing the scan result with action buttons.
 * Displays over the success screen with a Continue button to access
 * the existing flow.
 * ==========================================================================
 */

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  CheckCircle2,
  ScanLine,
  DollarSign,
  Share2,
  BookmarkPlus,
  ChevronDown,
  Award,
  BookOpen,
  Sparkles,
} from "lucide-react";
import { ComicVinePick } from "@/types/comicvine";
import { GrailScanMode } from "./GrailScanModeSelector";
import { cn } from "@/lib/utils";

interface GrailScanRecapCardProps {
  match: ComicVinePick | null;
  previewImage?: string | null;
  scanMode: GrailScanMode;
  confidence?: number | null;
  onContinue: () => void;
  onScanAnother: () => void;
  onQuickAction?: (action: "list" | "save" | "share") => void;
}

export function GrailScanRecapCard({
  match,
  previewImage,
  scanMode,
  confidence,
  onContinue,
  onScanAnother,
  onQuickAction,
}: GrailScanRecapCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  if (!match) return null;

  const displayTitle = match.volumeName || match.title || "Unknown Comic";
  const displayImage = match.coverUrl || match.thumbUrl || previewImage;
  const confidencePercent = confidence ? Math.round(confidence * 100) : null;

  const getConfidenceColor = () => {
    if (!confidencePercent) return "bg-muted text-muted-foreground";
    if (confidencePercent >= 85) return "bg-green-500/10 text-green-600 border-green-500/30";
    if (confidencePercent >= 60) return "bg-yellow-500/10 text-yellow-600 border-yellow-500/30";
    return "bg-red-500/10 text-red-600 border-red-500/30";
  };

  return (
    <div className="fixed inset-0 z-50 bg-background/95 backdrop-blur-sm flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-2xl border-primary/20 animate-in fade-in zoom-in-95 duration-300">
        <CardHeader className="text-center pb-2">
          <div className="mx-auto w-14 h-14 rounded-full bg-green-500/10 flex items-center justify-center mb-3">
            <CheckCircle2 className="w-8 h-8 text-green-500" />
          </div>
          <CardTitle className="text-xl flex items-center justify-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            Grail Found!
          </CardTitle>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Main Result Card */}
          <div className="relative bg-gradient-to-br from-primary/5 to-secondary/5 rounded-xl p-4 border">
            <div className="flex gap-4">
              {/* Cover Image */}
              <div className="w-20 h-28 flex-shrink-0 rounded-lg overflow-hidden bg-muted border-2 border-background shadow-lg">
                {displayImage ? (
                  <img
                    src={displayImage}
                    alt={displayTitle}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                    <BookOpen className="w-8 h-8" />
                  </div>
                )}
              </div>

              {/* Details */}
              <div className="flex-1 min-w-0 space-y-2">
                <h3 className="font-bold text-lg leading-tight line-clamp-2">
                  {displayTitle}
                </h3>
                
                <div className="flex flex-wrap gap-2">
                  {match.issue && (
                    <Badge variant="secondary" className="text-xs">
                      #{match.issue}
                    </Badge>
                  )}
                  {match.year && (
                    <Badge variant="outline" className="text-xs">
                      {match.year}
                    </Badge>
                  )}
                  {match.publisher && (
                    <Badge variant="outline" className="text-xs">
                      {match.publisher}
                    </Badge>
                  )}
                </div>

                {/* Scan Mode Badge */}
                <div className="flex items-center gap-2">
                  <Badge
                    variant="outline"
                    className={cn(
                      "text-xs",
                      scanMode === "slab"
                        ? "bg-amber-500/10 text-amber-600 border-amber-500/30"
                        : "bg-blue-500/10 text-blue-600 border-blue-500/30"
                    )}
                  >
                    {scanMode === "slab" ? (
                      <>
                        <Award className="w-3 h-3 mr-1" />
                        Graded
                      </>
                    ) : (
                      <>
                        <BookOpen className="w-3 h-3 mr-1" />
                        Raw
                      </>
                    )}
                  </Badge>

                  {confidencePercent && (
                    <Badge variant="outline" className={cn("text-xs", getConfidenceColor())}>
                      {confidencePercent}% match
                    </Badge>
                  )}
                </div>
              </div>
            </div>

            {/* Key Issue indicator if present */}
            {match.keyNotes && (
              <div className="mt-3 p-2 bg-amber-500/10 rounded-lg border border-amber-500/20">
                <p className="text-xs text-amber-700 dark:text-amber-400 font-medium">
                  🔑 {match.keyNotes}
                </p>
              </div>
            )}
          </div>

          {/* Quick Actions */}
          <div className="grid grid-cols-3 gap-2">
            <Button
              variant="outline"
              size="sm"
              className="flex-col h-auto py-3 gap-1"
              onClick={() => onQuickAction?.("list")}
            >
              <DollarSign className="w-4 h-4" />
              <span className="text-xs">List It</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="flex-col h-auto py-3 gap-1"
              onClick={() => onQuickAction?.("save")}
            >
              <BookmarkPlus className="w-4 h-4" />
              <span className="text-xs">Save</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="flex-col h-auto py-3 gap-1"
              onClick={() => onQuickAction?.("share")}
            >
              <Share2 className="w-4 h-4" />
              <span className="text-xs">Share</span>
            </Button>
          </div>

          {/* Primary Actions */}
          <div className="space-y-2 pt-2">
            <Button onClick={onContinue} className="w-full" size="lg">
              Continue
              <ChevronDown className="w-4 h-4 ml-2" />
            </Button>
            <Button
              onClick={onScanAnother}
              variant="ghost"
              className="w-full text-muted-foreground"
            >
              <ScanLine className="w-4 h-4 mr-2" />
              Scan Another
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
