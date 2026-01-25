/**
 * SCANNER HEALTH ADMIN PAGE
 * ==========================================================================
 * Admin-only dashboard showing scanner performance metrics:
 * - Scan counts (24h / 7d)
 * - Low-confidence confirm rate
 * - Correction override hit rate
 * - Top corrected inputs
 * - Top rejection reasons
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
  ArrowLeft
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAdminCheck } from "@/hooks/useAdminCheck";
import { SCAN_AUTO_CONFIRM_THRESHOLD } from "@/types/scannerState";

interface ScanMetrics {
  total: number;
  lowConfidence: number;
  correctionOverrides: number;
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
    byStrategy: {}
  });
  const [topCorrected, setTopCorrected] = useState<TopCorrectedInput[]>([]);
  const [rejectionReasons, setRejectionReasons] = useState<RejectionReason[]>([]);

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

      // Fetch scan events
      const { data: events, error: eventsError } = await (supabase as any)
        .from("scan_events")
        .select("confidence, strategy, source, rejected_reason")
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

      setMetrics({ total, lowConfidence, correctionOverrides, byStrategy });
      setRejectionReasons(sortedReasons);

      // Fetch top corrected inputs from scan_corrections
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
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
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
                    <p className="text-xs text-muted-foreground">Low Confidence (&lt;{SCAN_AUTO_CONFIRM_THRESHOLD})</p>
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
                    <p className="text-xs text-muted-foreground">Correction Overrides</p>
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

          {/* Two Column Layout */}
          <div className="grid md:grid-cols-2 gap-6">
            {/* Top Corrected Inputs */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Top Corrected Inputs</CardTitle>
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
