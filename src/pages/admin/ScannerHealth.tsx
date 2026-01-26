/**
 * SCANNER HEALTH ADMIN PAGE
 * ==========================================================================
 * Admin-only dashboard showing scanner performance metrics:
 * - Scan counts (24h / 7d)
 * - Low-confidence confirm rate
 * - Correction override hit rate
 * - Top corrected inputs
 * - Top rejection reasons
 * - Top Pain Points sections
 * ==========================================================================
 */

import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Activity, 
  TrendingDown, 
  AlertTriangle, 
  CheckCircle2, 
  RefreshCw,
  Target,
  ShieldAlert,
  ArrowLeft,
  XCircle,
  TrendingUp,
  List
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAdminCheck } from "@/hooks/useAdminCheck";
import { SCAN_AUTO_CONFIRM_THRESHOLD } from "@/types/scannerState";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface ScanMetrics {
  total: number;
  lowConfidence: number;
  correctionOverrides: number;
  noneOfTheseCount: number;
  byStrategy: Record<string, number>;
}

interface TopCorrectedInput {
  normalized_input: string;
  count: number;
}

interface RejectionReason {
  reason: string;
  count: number;
}

interface LowConfidenceInput {
  normalized_input: string;
  count: number;
  avgConfidence: number;
  topStrategy: string;
}

interface CorrectedInputDetail {
  normalized_input: string;
  count: number;
  selected_title: string | null;
  selected_issue: string | null;
  selected_year: number | null;
  selected_publisher: string | null;
}

interface RecentScanEvent {
  id: string;
  created_at: string;
  raw_input: string | null;
  normalized_input: string;
  confidence: number | null;
  strategy: string | null;
  source: string | null;
  rejected_reason: string | null;
  input_source: string | null;
}

export default function ScannerHealth() {
  const navigate = useNavigate();
  const { isAdmin, loading: adminLoading } = useAdminCheck();
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<"24h" | "7d">("24h");
  
  // Metrics state
  const [metrics, setMetrics] = useState<ScanMetrics>({ 
    total: 0, 
    lowConfidence: 0, 
    correctionOverrides: 0,
    noneOfTheseCount: 0,
    byStrategy: {}
  });
  const [topCorrected, setTopCorrected] = useState<TopCorrectedInput[]>([]);
  const [rejectionReasons, setRejectionReasons] = useState<RejectionReason[]>([]);
  
  // Pain Points state
  const [lowConfidenceInputs, setLowConfidenceInputs] = useState<LowConfidenceInput[]>([]);
  const [correctedInputDetails, setCorrectedInputDetails] = useState<CorrectedInputDetail[]>([]);
  
  // Recent scan events
  const [recentEvents, setRecentEvents] = useState<RecentScanEvent[]>([]);

  useEffect(() => {
    if (!adminLoading && isAdmin) {
      fetchMetrics();
    }
  }, [adminLoading, isAdmin, period]);

  const fetchMetrics = async () => {
    setLoading(true);
    try {
      const cutoff = new Date();
      cutoff.setHours(cutoff.getHours() - (period === "24h" ? 24 : 168));
      const cutoffISO = cutoff.toISOString();
      
      // 30d cutoff for corrections
      const cutoff30d = new Date();
      cutoff30d.setDate(cutoff30d.getDate() - 30);
      const cutoff30dISO = cutoff30d.toISOString();

      // Fetch scan events
      const { data: events, error: eventsError } = await (supabase as any)
        .from("scan_events")
        .select("confidence, strategy, source, rejected_reason, normalized_input")
        .gte("created_at", cutoffISO);

      if (eventsError) {
        console.error("[SCANNER_HEALTH] Events error:", eventsError);
      }

      // Calculate metrics from events
      const eventList = events || [];
      const total = eventList.length;
      const lowConfidence = eventList.filter(
        (e: any) => e.confidence !== null && e.confidence < SCAN_AUTO_CONFIRM_THRESHOLD
      ).length;
      const correctionOverrides = eventList.filter(
        (e: any) => e.source === "correction_override"
      ).length;
      
      // Count "None of these" clicks
      const noneOfTheseCount = eventList.filter(
        (e: any) => e.rejected_reason === "none_of_these" || e.source === "manual_search"
      ).length;

      // Strategy breakdown
      const byStrategy: Record<string, number> = {};
      eventList.forEach((e: any) => {
        const strat = e.strategy || "unknown";
        byStrategy[strat] = (byStrategy[strat] || 0) + 1;
      });

      // Rejection reasons from events
      const rejectionCounts: Record<string, number> = {};
      eventList.forEach((e: any) => {
        if (e.rejected_reason) {
          const reason = e.rejected_reason;
          rejectionCounts[reason] = (rejectionCounts[reason] || 0) + 1;
        }
      });

      const sortedReasons = Object.entries(rejectionCounts)
        .map(([reason, count]) => ({ reason, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);

      setMetrics({ total, lowConfidence, correctionOverrides, noneOfTheseCount, byStrategy });
      setRejectionReasons(sortedReasons);

      // === TOP LOW-CONFIDENCE INPUTS (7d) ===
      const lowConfEvents = eventList.filter(
        (e: any) => e.confidence !== null && e.confidence < SCAN_AUTO_CONFIRM_THRESHOLD && e.normalized_input
      );
      
      const lowConfByInput: Record<string, { count: number; totalConf: number; strategies: Record<string, number> }> = {};
      lowConfEvents.forEach((e: any) => {
        const input = e.normalized_input;
        if (!lowConfByInput[input]) {
          lowConfByInput[input] = { count: 0, totalConf: 0, strategies: {} };
        }
        lowConfByInput[input].count++;
        lowConfByInput[input].totalConf += e.confidence;
        const strat = e.strategy || "unknown";
        lowConfByInput[input].strategies[strat] = (lowConfByInput[input].strategies[strat] || 0) + 1;
      });
      
      const sortedLowConf = Object.entries(lowConfByInput)
        .map(([normalized_input, data]) => {
          const topStrategy = Object.entries(data.strategies)
            .sort((a, b) => b[1] - a[1])[0]?.[0] || "unknown";
          return {
            normalized_input,
            count: data.count,
            avgConfidence: Math.round(data.totalConf / data.count),
            topStrategy
          };
        })
        .sort((a, b) => b.count - a.count)
        .slice(0, 20);
      
      setLowConfidenceInputs(sortedLowConf);

      // Fetch top corrected inputs from scan_corrections (simple count)
      const { data: corrections, error: corrError } = await supabase
        .from("scan_corrections")
        .select("normalized_input")
        .gte("created_at", cutoffISO);

      if (corrError) {
        console.error("[SCANNER_HEALTH] Corrections error:", corrError);
      }

      // Count by normalized_input
      const inputCounts: Record<string, number> = {};
      (corrections || []).forEach((c: any) => {
        const input = c.normalized_input;
        inputCounts[input] = (inputCounts[input] || 0) + 1;
      });

      const sortedInputs = Object.entries(inputCounts)
        .map(([normalized_input, count]) => ({ normalized_input, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 20);

      setTopCorrected(sortedInputs);
      
      // === TOP CORRECTED INPUTS WITH DETAILS (30d) ===
      const { data: corrections30d, error: corr30dError } = await supabase
        .from("scan_corrections")
        .select("normalized_input, selected_title, selected_issue, selected_year, selected_publisher")
        .gte("created_at", cutoff30dISO);
        
      if (corr30dError) {
        console.error("[SCANNER_HEALTH] 30d corrections error:", corr30dError);
      }
      
      const corrDetailCounts: Record<string, CorrectedInputDetail> = {};
      (corrections30d || []).forEach((c: any) => {
        const input = c.normalized_input;
        if (!corrDetailCounts[input]) {
          corrDetailCounts[input] = {
            normalized_input: input,
            count: 0,
            selected_title: c.selected_title,
            selected_issue: c.selected_issue,
            selected_year: c.selected_year,
            selected_publisher: c.selected_publisher
          };
        }
        corrDetailCounts[input].count++;
      });
      
      const sortedCorrDetails = Object.values(corrDetailCounts)
        .sort((a, b) => b.count - a.count)
        .slice(0, 20);
        
      setCorrectedInputDetails(sortedCorrDetails);
      
      // === RECENT SCAN EVENTS (last 50) ===
      const { data: recentEventsData, error: recentError } = await (supabase as any)
        .from("scan_events")
        .select("id, created_at, raw_input, normalized_input, confidence, strategy, source, rejected_reason, input_source")
        .order("created_at", { ascending: false })
        .limit(50);
        
      if (recentError) {
        console.error("[SCANNER_HEALTH] Recent events error:", recentError);
      }
      
      setRecentEvents(recentEventsData || []);
      
    } catch (err) {
      console.error("[SCANNER_HEALTH] Fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  if (adminLoading) {
    return (
      <main className="container mx-auto px-4 py-8 max-w-6xl">
        <Skeleton className="h-10 w-48 mb-6" />
        <Skeleton className="h-64 w-full" />
      </main>
    );
  }

  if (!isAdmin) {
    return (
      <main className="container mx-auto px-4 py-8 max-w-6xl">
        <Alert>
          <ShieldAlert className="h-4 w-4" />
          <AlertDescription>
            You don't have permission to view this page.
          </AlertDescription>
        </Alert>
      </main>
    );
  }

  const lowConfidenceRate = metrics.total > 0 
    ? Math.round((metrics.lowConfidence / metrics.total) * 100) 
    : 0;
  const correctionOverrideRate = metrics.total > 0 
    ? Math.round((metrics.correctionOverrides / metrics.total) * 100) 
    : 0;

  return (
    <main className="container mx-auto px-4 py-8 max-w-6xl space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Activity className="h-6 w-6" />
            Scanner Health
          </h1>
          <p className="text-muted-foreground text-sm">
            Performance metrics and matching quality
          </p>
        </div>
        <div className="ml-auto">
          <Button variant="outline" size="sm" onClick={fetchMetrics} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Period Tabs */}
      <Tabs value={period} onValueChange={(v) => setPeriod(v as "24h" | "7d")}>
        <TabsList>
          <TabsTrigger value="24h">Last 24 Hours</TabsTrigger>
          <TabsTrigger value="7d">Last 7 Days</TabsTrigger>
        </TabsList>

        <TabsContent value={period} className="space-y-6 mt-6">
          {/* Key Metrics Grid */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <Target className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{loading ? "..." : metrics.total}</p>
                    <p className="text-xs text-muted-foreground">Total Scans</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-warning/10 rounded-lg">
                    <AlertTriangle className="h-5 w-5 text-warning" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{loading ? "..." : `${lowConfidenceRate}%`}</p>
                    <p className="text-xs text-muted-foreground">Low Conf (&lt;{SCAN_AUTO_CONFIRM_THRESHOLD})</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-500/10 rounded-lg">
                    <CheckCircle2 className="h-5 w-5 text-blue-500" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{loading ? "..." : `${correctionOverrideRate}%`}</p>
                    <p className="text-xs text-muted-foreground">Correction Hits</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-destructive/10 rounded-lg">
                    <TrendingDown className="h-5 w-5 text-destructive" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{loading ? "..." : topCorrected.length}</p>
                    <p className="text-xs text-muted-foreground">Unique Corrections</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-orange-500/10 rounded-lg">
                    <XCircle className="h-5 w-5 text-orange-500" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{loading ? "..." : metrics.noneOfTheseCount}</p>
                    <p className="text-xs text-muted-foreground">"None of these"</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Strategy Breakdown */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Search Strategy Distribution</CardTitle>
              <CardDescription>Which matching strategies are being used</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <Skeleton className="h-24 w-full" />
              ) : Object.keys(metrics.byStrategy).length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {Object.entries(metrics.byStrategy)
                    .sort((a, b) => b[1] - a[1])
                    .map(([strategy, count]) => (
                      <Badge key={strategy} variant="outline" className="text-sm py-1 px-3">
                        {strategy}: {count}
                      </Badge>
                    ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No strategy data available yet</p>
              )}
            </CardContent>
          </Card>

          {/* Pain Points Section */}
          <div className="space-y-4">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-orange-500" />
              Top Pain Points
            </h2>
            
            <div className="grid md:grid-cols-2 gap-6">
              {/* A) Top Low-Confidence Inputs (7d) */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-warning" />
                    Low-Confidence Inputs ({period})
                  </CardTitle>
                  <CardDescription>
                    Queries that triggered manual confirm (confidence &lt; {SCAN_AUTO_CONFIRM_THRESHOLD})
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {loading ? (
                    <div className="space-y-2">
                      {[...Array(5)].map((_, i) => (
                        <Skeleton key={i} className="h-12 w-full" />
                      ))}
                    </div>
                  ) : lowConfidenceInputs.length > 0 ? (
                    <div className="space-y-2 max-h-80 overflow-y-auto">
                      {lowConfidenceInputs.map((item, idx) => (
                        <div 
                          key={item.normalized_input}
                          className="flex items-center justify-between p-2 rounded bg-muted/50 gap-2"
                        >
                          <div className="flex-1 min-w-0">
                            <span className="text-sm font-mono truncate block">
                              {idx + 1}. {item.normalized_input}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              avg {item.avgConfidence}% · {item.topStrategy}
                            </span>
                          </div>
                          <Badge variant="secondary" className="shrink-0">
                            {item.count}×
                          </Badge>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">No low-confidence scans in this period</p>
                  )}
                </CardContent>
              </Card>

              {/* B) Top Corrected Inputs (30d) */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <TrendingDown className="h-4 w-4 text-destructive" />
                    Top Corrected Inputs (30d)
                  </CardTitle>
                  <CardDescription>
                    User-corrected queries with their selected match
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {loading ? (
                    <div className="space-y-2">
                      {[...Array(5)].map((_, i) => (
                        <Skeleton key={i} className="h-12 w-full" />
                      ))}
                    </div>
                  ) : correctedInputDetails.length > 0 ? (
                    <div className="space-y-2 max-h-80 overflow-y-auto">
                      {correctedInputDetails.map((item, idx) => (
                        <div 
                          key={item.normalized_input}
                          className="flex items-center justify-between p-2 rounded bg-muted/50 gap-2"
                        >
                          <div className="flex-1 min-w-0">
                            <span className="text-sm font-mono truncate block">
                              {idx + 1}. {item.normalized_input}
                            </span>
                            <span className="text-xs text-muted-foreground truncate block">
                              → {item.selected_title} #{item.selected_issue}
                              {item.selected_year && ` (${item.selected_year})`}
                              {item.selected_publisher && ` · ${item.selected_publisher}`}
                            </span>
                          </div>
                          <Badge variant="secondary" className="shrink-0">
                            {item.count}×
                          </Badge>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">No corrections in last 30 days</p>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Two Column Layout - Existing sections */}
          <div className="grid md:grid-cols-2 gap-6">
            {/* Top Corrected Inputs (simple count) */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Top Corrected Inputs ({period})</CardTitle>
                <CardDescription>
                  Most frequently corrected search queries (indicates matching gaps)
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="space-y-2">
                    {[...Array(5)].map((_, i) => (
                      <Skeleton key={i} className="h-8 w-full" />
                    ))}
                  </div>
                ) : topCorrected.length > 0 ? (
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {topCorrected.map((item, idx) => (
                      <div 
                        key={item.normalized_input}
                        className="flex items-center justify-between p-2 rounded bg-muted/50"
                      >
                        <span className="text-sm font-mono truncate flex-1">
                          {idx + 1}. {item.normalized_input}
                        </span>
                        <Badge variant="secondary" className="ml-2">
                          {item.count}
                        </Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No corrections in this period</p>
                )}
              </CardContent>
            </Card>

            {/* Top Rejection Reasons */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Top Rejection Reasons</CardTitle>
                <CardDescription>
                  Why candidates are being filtered out by sanity checks
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="space-y-2">
                    {[...Array(5)].map((_, i) => (
                      <Skeleton key={i} className="h-8 w-full" />
                    ))}
                  </div>
                ) : rejectionReasons.length > 0 ? (
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {rejectionReasons.map((item, idx) => (
                      <div 
                        key={item.reason}
                        className="flex items-center justify-between p-2 rounded bg-muted/50"
                      >
                        <span className="text-sm truncate flex-1">
                          {idx + 1}. {item.reason}
                        </span>
                        <Badge variant="secondary" className="ml-2">
                          {item.count}
                        </Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    No rejection data yet. Scan events will populate this.
                  </p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Recent Scan Events Table */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <List className="h-4 w-4" />
                Recent Scan Events (last 50)
              </CardTitle>
              <CardDescription>
                Most recent scanner activity for debugging
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <Skeleton className="h-64 w-full" />
              ) : recentEvents.length > 0 ? (
                <div className="overflow-x-auto max-h-96">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-36">Time</TableHead>
                        <TableHead>Raw Input</TableHead>
                        <TableHead>Normalized</TableHead>
                        <TableHead className="w-20">Conf</TableHead>
                        <TableHead>Strategy</TableHead>
                        <TableHead>Source</TableHead>
                        <TableHead>Input Type</TableHead>
                        <TableHead>Rejected</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {recentEvents.map((event) => (
                        <TableRow key={event.id}>
                          <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                            {new Date(event.created_at).toLocaleString()}
                          </TableCell>
                          <TableCell className="font-mono text-xs max-w-32 truncate" title={event.raw_input || ''}>
                            {event.raw_input || '-'}
                          </TableCell>
                          <TableCell className="font-mono text-xs max-w-32 truncate" title={event.normalized_input}>
                            {event.normalized_input}
                          </TableCell>
                          <TableCell>
                            {event.confidence !== null ? (
                              <Badge variant={event.confidence >= 70 ? "default" : "secondary"}>
                                {event.confidence}%
                              </Badge>
                            ) : '-'}
                          </TableCell>
                          <TableCell className="text-xs">
                            {event.strategy || '-'}
                          </TableCell>
                          <TableCell className="text-xs">
                            {event.source || '-'}
                          </TableCell>
                          <TableCell>
                            {event.input_source ? (
                              <Badge variant="outline" className="text-xs">
                                {event.input_source}
                              </Badge>
                            ) : '-'}
                          </TableCell>
                          <TableCell className="text-xs text-destructive">
                            {event.rejected_reason || '-'}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No scan events recorded yet</p>
              )}
            </CardContent>
          </Card>

          {/* Info Note */}
          <Alert>
            <Activity className="h-4 w-4" />
            <AlertDescription>
              Metrics are populated from the <code className="text-xs bg-muted px-1 rounded">scan_events</code> table. 
              Ensure the scanner edge function is logging events for complete data.
            </AlertDescription>
          </Alert>
        </TabsContent>
      </Tabs>
    </main>
  );
}