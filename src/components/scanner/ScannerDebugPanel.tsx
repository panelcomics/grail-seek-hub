/**
 * SCANNER DEBUG PANEL
 * ==========================================================================
 * Admin-only debug panel showing scanner match attempt details.
 * Visible only to admins and Elite users for troubleshooting.
 * ==========================================================================
 */

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronDown, ChevronUp, Bug } from "lucide-react";

interface ScannerDebugData {
  ocrText?: string;
  extractedTitle?: string;
  extractedIssue?: string;
  extractedPublisher?: string;
  extractedYear?: number | null;
  confidence?: number;
  candidateCount: number;
  matchMode?: string;
  timings?: {
    vision?: number;
    total?: number;
  };
}

interface ScannerDebugPanelProps {
  debugData: ScannerDebugData;
  isVisible: boolean;
}

export function ScannerDebugPanel({ debugData, isVisible }: ScannerDebugPanelProps) {
  const [expanded, setExpanded] = useState(false);

  if (!isVisible) return null;

  const confidencePercent = debugData.confidence 
    ? Math.round(debugData.confidence * 100) 
    : 0;

  return (
    <Card className="w-full mt-4 border-dashed border-amber-500/50 bg-amber-500/5">
      <CardHeader className="py-2 px-3">
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center justify-between w-full text-left"
        >
          <CardTitle className="text-xs font-medium flex items-center gap-2 text-amber-600">
            <Bug className="w-3 h-3" />
            Debug Panel (Admin/Elite)
          </CardTitle>
          {expanded ? (
            <ChevronUp className="w-4 h-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="w-4 h-4 text-muted-foreground" />
          )}
        </button>
      </CardHeader>
      
      {expanded && (
        <CardContent className="pt-0 pb-3 px-3 space-y-3">
          {/* Quick stats */}
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline" className="text-xs">
              Confidence: {confidencePercent}%
            </Badge>
            <Badge variant="outline" className="text-xs">
              Candidates: {debugData.candidateCount}
            </Badge>
            {debugData.matchMode && (
              <Badge variant="outline" className="text-xs">
                Mode: {debugData.matchMode}
              </Badge>
            )}
          </div>

          {/* Extracted data */}
          <div className="space-y-1.5 text-xs">
            {debugData.extractedTitle && (
              <div className="flex">
                <span className="font-medium w-20 shrink-0 text-muted-foreground">Title:</span>
                <span className="truncate">{debugData.extractedTitle}</span>
              </div>
            )}
            {debugData.extractedIssue && (
              <div className="flex">
                <span className="font-medium w-20 shrink-0 text-muted-foreground">Issue:</span>
                <span>{debugData.extractedIssue}</span>
              </div>
            )}
            {debugData.extractedPublisher && (
              <div className="flex">
                <span className="font-medium w-20 shrink-0 text-muted-foreground">Publisher:</span>
                <span>{debugData.extractedPublisher}</span>
              </div>
            )}
            {debugData.extractedYear && (
              <div className="flex">
                <span className="font-medium w-20 shrink-0 text-muted-foreground">Year:</span>
                <span>{debugData.extractedYear}</span>
              </div>
            )}
          </div>

          {/* OCR text preview */}
          {debugData.ocrText && (
            <div className="space-y-1">
              <span className="text-xs font-medium text-muted-foreground">OCR Text (first 200 chars):</span>
              <div className="bg-background/50 rounded p-2 text-xs font-mono text-muted-foreground max-h-20 overflow-y-auto">
                {debugData.ocrText.slice(0, 200)}...
              </div>
            </div>
          )}

          {/* Timing info */}
          {debugData.timings && (
            <div className="text-xs text-muted-foreground">
              Vision: {debugData.timings.vision}ms | Total: {debugData.timings.total}ms
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
}
