/**
 * ADMIN SCANNER DEBUG PANEL
 * ==========================================================================
 * Admin-only panel showing detailed scanner diagnostics:
 * - Parsed fields (title, issue, year, publisher)
 * - Search strategy used (issue-first, volume-first, Issue #1 rule)
 * - Top candidate scores with breakdown
 * - Rejection reasons for filtered candidates
 * ==========================================================================
 */

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { ChevronDown, ChevronUp, Bug, Settings, Zap } from "lucide-react";
import { useAdminCheck } from "@/hooks/useAdminCheck";

interface ParsedQuery {
  title: string;
  issue: string | null;
  year: number | null;
  publisher: string | null;
}

interface CandidateScore {
  series: string;
  issue: string;
  year: number | null;
  publisher: string | null;
  confidence: number;
  rejected?: boolean;
  rejectReason?: string;
  fallbackPath?: string;
  hasExactYear?: boolean;
  hasExactIssue?: boolean;
}

interface AdminScannerDebugPanelProps {
  isVisible: boolean;
  parsedQuery?: ParsedQuery;
  strategy?: string;
  candidates?: CandidateScore[];
  rawOcr?: string;
  timings?: {
    total?: number;
    vision?: number;
    comicvine?: number;
    fallback?: number;
  };
  confidence?: number;
}

export function AdminScannerDebugPanel({
  isVisible,
  parsedQuery,
  strategy,
  candidates = [],
  rawOcr,
  timings,
  confidence
}: AdminScannerDebugPanelProps) {
  const { isAdmin, loading } = useAdminCheck();
  const [expanded, setExpanded] = useState(false);
  const [showRejected, setShowRejected] = useState(false);

  // Only show for admins
  if (loading || !isAdmin || !isVisible) return null;

  const acceptedCandidates = candidates.filter(c => !c.rejected);
  const rejectedCandidates = candidates.filter(c => c.rejected);

  const getStrategyColor = (strat: string | undefined) => {
    if (!strat) return 'secondary';
    if (strat.includes('issue-1')) return 'default';
    if (strat.includes('volume-first')) return 'secondary';
    return 'outline';
  };

  const getConfidenceColor = (conf: number) => {
    if (conf >= 80) return 'text-green-600 dark:text-green-400';
    if (conf >= 60) return 'text-amber-600 dark:text-amber-400';
    return 'text-red-600 dark:text-red-400';
  };

  return (
    <Card className="border-dashed border-purple-500/50 bg-purple-500/5">
      <CardHeader className="py-2 px-3">
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center justify-between w-full text-left"
        >
          <CardTitle className="text-xs font-medium flex items-center gap-2 text-purple-600 dark:text-purple-400">
            <Bug className="w-3 h-3" />
            Admin Debug Panel
            {confidence !== undefined && (
              <Badge variant="outline" className={`text-xs ml-2 ${getConfidenceColor(confidence)}`}>
                {confidence}%
              </Badge>
            )}
            {strategy && (
              <Badge variant={getStrategyColor(strategy)} className="text-xs ml-1">
                {strategy}
              </Badge>
            )}
          </CardTitle>
          {expanded ? (
            <ChevronUp className="w-4 h-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="w-4 h-4 text-muted-foreground" />
          )}
        </button>
      </CardHeader>

      {expanded && (
        <CardContent className="pt-0 pb-3 px-3 space-y-4">
          {/* Parsed Query */}
          {parsedQuery && (
            <div className="space-y-1.5">
              <div className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                <Settings className="w-3 h-3" />
                Parsed Query
              </div>
              <div className="bg-background/50 rounded p-2 text-xs space-y-1">
                <div className="flex gap-2">
                  <span className="font-medium w-16 shrink-0">Title:</span>
                  <span className="text-foreground">{parsedQuery.title || '—'}</span>
                </div>
                <div className="flex gap-2">
                  <span className="font-medium w-16 shrink-0">Issue:</span>
                  <span>{parsedQuery.issue || '—'}</span>
                </div>
                <div className="flex gap-2">
                  <span className="font-medium w-16 shrink-0">Year:</span>
                  <span>{parsedQuery.year || '—'}</span>
                </div>
                <div className="flex gap-2">
                  <span className="font-medium w-16 shrink-0">Publisher:</span>
                  <span>{parsedQuery.publisher || '—'}</span>
                </div>
              </div>
            </div>
          )}

          {/* Strategy */}
          {strategy && (
            <div className="space-y-1.5">
              <div className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                <Zap className="w-3 h-3" />
                Search Strategy
              </div>
              <Badge variant={getStrategyColor(strategy)} className="text-xs">
                {strategy}
              </Badge>
            </div>
          )}

          {/* Timings */}
          {timings && (
            <div className="flex flex-wrap gap-2 text-xs">
              {timings.total && (
                <Badge variant="outline">Total: {timings.total}ms</Badge>
              )}
              {timings.vision && (
                <Badge variant="outline">Vision: {timings.vision}ms</Badge>
              )}
              {timings.comicvine && (
                <Badge variant="outline">ComicVine: {timings.comicvine}ms</Badge>
              )}
              {timings.fallback && (
                <Badge variant="outline">Fallback: {timings.fallback}ms</Badge>
              )}
            </div>
          )}

          {/* Top Candidates */}
          {acceptedCandidates.length > 0 && (
            <div className="space-y-1.5">
              <div className="text-xs font-medium text-muted-foreground">
                Top Candidates ({acceptedCandidates.length})
              </div>
              <div className="space-y-1">
                {acceptedCandidates.slice(0, 5).map((c, i) => (
                  <div 
                    key={i}
                    className={`
                      flex items-center justify-between p-2 rounded text-xs
                      ${i === 0 ? 'bg-green-500/10 border border-green-500/30' : 'bg-background/50'}
                    `}
                  >
                    <div className="flex-1 min-w-0">
                      <span className="font-medium">{c.series}</span>
                      <span className="text-muted-foreground"> #{c.issue}</span>
                      {c.year && (
                        <span className="text-muted-foreground"> ({c.year})</span>
                      )}
                      {c.publisher && (
                        <span className="text-muted-foreground text-[10px] ml-1">
                          [{c.publisher}]
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      {c.hasExactYear && (
                        <Badge variant="outline" className="text-[10px] px-1 py-0">Y✓</Badge>
                      )}
                      {c.hasExactIssue && (
                        <Badge variant="outline" className="text-[10px] px-1 py-0">I✓</Badge>
                      )}
                      <Badge 
                        variant={c.confidence >= 80 ? "default" : c.confidence >= 60 ? "secondary" : "outline"}
                        className="text-xs"
                      >
                        {c.confidence}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Rejected Candidates Toggle */}
          {rejectedCandidates.length > 0 && (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-muted-foreground">
                  Rejected Candidates ({rejectedCandidates.length})
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-muted-foreground">Show</span>
                  <Switch 
                    checked={showRejected}
                    onCheckedChange={setShowRejected}
                    className="scale-75"
                  />
                </div>
              </div>
              
              {showRejected && (
                <div className="space-y-1 max-h-40 overflow-y-auto">
                  {rejectedCandidates.map((c, i) => (
                    <div 
                      key={i}
                      className="flex items-start gap-2 p-2 rounded bg-red-500/5 border border-red-500/20 text-xs"
                    >
                      <div className="flex-1 min-w-0">
                        <div>
                          <span className="font-medium">{c.series}</span>
                          <span className="text-muted-foreground"> #{c.issue}</span>
                        </div>
                        {c.rejectReason && (
                          <div className="text-red-600 dark:text-red-400 text-[10px] mt-0.5">
                            {c.rejectReason}
                          </div>
                        )}
                      </div>
                      <Badge variant="destructive" className="text-[10px] shrink-0">
                        {c.confidence}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* OCR Text Preview */}
          {rawOcr && (
            <div className="space-y-1.5">
              <div className="text-xs font-medium text-muted-foreground">
                OCR Text (first 300 chars)
              </div>
              <div className="bg-background/50 rounded p-2 text-xs font-mono text-muted-foreground max-h-20 overflow-y-auto break-all">
                {rawOcr.slice(0, 300)}{rawOcr.length > 300 && '...'}
              </div>
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
}
