/**
 * GRAIL SCAN MODE SELECTOR
 * ==========================================================================
 * Pre-scan mode selection UI for choosing between Raw Comic and Graded Slab.
 * Stores selection in localStorage for persistence across sessions.
 * ==========================================================================
 */

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BookOpen, Award, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

export type GrailScanMode = "raw" | "slab";

const GRAIL_SCAN_MODE_KEY = "grailseeker_grail_scan_mode";

interface GrailScanModeSelectorProps {
  selectedMode: GrailScanMode;
  onModeChange: (mode: GrailScanMode) => void;
  onContinue: () => void;
}

export function getStoredGrailScanMode(): GrailScanMode {
  try {
    const stored = localStorage.getItem(GRAIL_SCAN_MODE_KEY);
    if (stored === "raw" || stored === "slab") {
      return stored;
    }
  } catch (e) {
    console.warn("[GRAIL_SCAN] Failed to read stored mode:", e);
  }
  return "raw"; // Default to raw
}

export function setStoredGrailScanMode(mode: GrailScanMode): void {
  try {
    localStorage.setItem(GRAIL_SCAN_MODE_KEY, mode);
  } catch (e) {
    console.warn("[GRAIL_SCAN] Failed to store mode:", e);
  }
}

export function GrailScanModeSelector({
  selectedMode,
  onModeChange,
  onContinue,
}: GrailScanModeSelectorProps) {
  const handleModeSelect = (mode: GrailScanMode) => {
    onModeChange(mode);
    setStoredGrailScanMode(mode);
  };

  return (
    <Card className="border-primary/20">
      <CardHeader className="text-center pb-4">
        <CardTitle className="text-xl">Grail Scan</CardTitle>
        <CardDescription>
          Select the type of comic you're scanning for optimized results
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Mode Options */}
        <div className="grid grid-cols-2 gap-3">
          {/* Raw Comic Option */}
          <button
            onClick={() => handleModeSelect("raw")}
            className={cn(
              "relative p-4 rounded-xl border-2 transition-all text-left",
              "hover:border-primary/50 hover:bg-primary/5",
              selectedMode === "raw"
                ? "border-primary bg-primary/10 shadow-md"
                : "border-muted bg-card"
            )}
          >
            <div className="flex flex-col items-center text-center gap-2">
              <div
                className={cn(
                  "w-12 h-12 rounded-full flex items-center justify-center",
                  selectedMode === "raw"
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground"
                )}
              >
                <BookOpen className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-semibold text-sm">Raw Comic</h3>
                <p className="text-xs text-muted-foreground mt-1">
                  Ungraded books
                </p>
              </div>
            </div>
            {selectedMode === "raw" && (
              <div className="absolute top-2 right-2 w-3 h-3 rounded-full bg-primary" />
            )}
          </button>

          {/* Graded Slab Option */}
          <button
            onClick={() => handleModeSelect("slab")}
            className={cn(
              "relative p-4 rounded-xl border-2 transition-all text-left",
              "hover:border-primary/50 hover:bg-primary/5",
              selectedMode === "slab"
                ? "border-primary bg-primary/10 shadow-md"
                : "border-muted bg-card"
            )}
          >
            <div className="flex flex-col items-center text-center gap-2">
              <div
                className={cn(
                  "w-12 h-12 rounded-full flex items-center justify-center",
                  selectedMode === "slab"
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground"
                )}
              >
                <Award className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-semibold text-sm">Graded Slab</h3>
                <p className="text-xs text-muted-foreground mt-1">
                  CGC, CBCS, PSA
                </p>
              </div>
            </div>
            {selectedMode === "slab" && (
              <div className="absolute top-2 right-2 w-3 h-3 rounded-full bg-primary" />
            )}
          </button>
        </div>

        {/* Continue Button */}
        <Button onClick={onContinue} className="w-full" size="lg">
          Continue to Scan
          <ChevronRight className="w-4 h-4 ml-2" />
        </Button>

        {/* Helper text */}
        <p className="text-xs text-center text-muted-foreground">
          {selectedMode === "slab"
            ? "Scanning mode optimized for reading CGC/CBCS labels"
            : "Scanning mode for raw, unslabbed comic books"}
        </p>
      </CardContent>
    </Card>
  );
}
