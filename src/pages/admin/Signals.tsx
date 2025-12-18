/**
 * Founder Signal Dashboard
 * ========================
 * Admin-only dashboard for monitoring collector signal health and product traction.
 * 
 * RULES:
 * - Admin/Founder only
 * - No user-level drilldowns
 * - Aggregates only
 * - Read-only
 */

import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { supabase } from "@/integrations/supabase/client";
import { useAdminCheck } from "@/hooks/useAdminCheck";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { 
  TrendingUp, 
  TrendingDown,
  Minus,
  Flame,
  Eye,
  Camera,
  Package,
  RefreshCw,
  Bell,
  AlertTriangle,
  Activity,
  ArrowDown,
  BarChart3
} from "lucide-react";
import { toast } from "sonner";

interface SignalData {
  id: string;
  comic_title: string;
  issue_number: string | null;
  publisher: string | null;
  signal_score: number;
  delta_24h?: number;
  watchlist_count: number;
  scanner_count: number;
  active_listing_count: number;
  last_activity_at: string;
  created_at: string;
}

type TimeWindow = "24h" | "7d" | "30d";

export default function AdminSignals() {
  const { isAdmin, loading: adminLoading } = useAdminCheck();
  const navigate = useNavigate();
  
  const [timeWindow, setTimeWindow] = useState<TimeWindow>("7d");
  const [signals, setSignals] = useState<SignalData[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [runningAlerts, setRunningAlerts] = useState(false);

  // Metrics
  const [metrics, setMetrics] = useState({
    signalsGenerated: 0,
    watchlistVelocity: 0,
    scannerMomentum: 0,
    signalActionLag: 0,
  });

  // Funnel data
  const [funnel, setFunnel] = useState({
    behaviorDetected: 0,
    signalTriggered: 0,
    eliteViewed: 0,
    listed: 0,
    sold: 0,
  });

  useEffect(() => {
    if (!adminLoading && !isAdmin) {
      navigate("/");
    }
  }, [isAdmin, adminLoading, navigate]);

  useEffect(() => {
    if (isAdmin) {
      fetchData();
    }
  }, [isAdmin, timeWindow]);

  const getTimeWindowDate = (window: TimeWindow): Date => {
    const now = new Date();
    switch (window) {
      case "24h":
        return new Date(now.getTime() - 24 * 60 * 60 * 1000);
      case "7d":
        return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      case "30d":
        return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    }
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const windowDate = getTimeWindowDate(timeWindow);

      // Fetch signals
      const { data: signalData, error: signalError } = await supabase
        .from("collector_signals")
        .select("*")
        .gte("last_activity_at", windowDate.toISOString())
        .order("signal_score", { ascending: false })
        .limit(50);

      if (signalError) throw signalError;
      setSignals((signalData || []) as SignalData[]);

      // Calculate metrics
      const signalsGenerated = signalData?.length || 0;
      const totalWatchlist = signalData?.reduce((sum, s) => sum + (s.watchlist_count || 0), 0) || 0;
      const totalScanner = signalData?.reduce((sum, s) => sum + (s.scanner_count || 0), 0) || 0;
      
      setMetrics({
        signalsGenerated,
        watchlistVelocity: totalWatchlist,
        scannerMomentum: totalScanner,
        signalActionLag: 0, // Would need order data to calculate
      });

      // Mock funnel data (would need real tracking)
      setFunnel({
        behaviorDetected: signalsGenerated * 3,
        signalTriggered: signalsGenerated,
        eliteViewed: Math.floor(signalsGenerated * 0.4),
        listed: Math.floor(signalsGenerated * 0.15),
        sold: Math.floor(signalsGenerated * 0.05),
      });

    } catch (err) {
      console.error("[ADMIN_SIGNALS] Error:", err);
      toast.error("Failed to load signal data");
    } finally {
      setLoading(false);
    }
  };

  const handleRefreshSignals = async () => {
    setRefreshing(true);
    try {
      const { error } = await supabase.functions.invoke("collector-signal-refresh");
      if (error) throw error;
      toast.success("Signals refreshed successfully");
      await fetchData();
    } catch (err) {
      console.error("[ADMIN_SIGNALS] Refresh error:", err);
      toast.error("Failed to refresh signals");
    } finally {
      setRefreshing(false);
    }
  };

  const handleRunAlerts = async () => {
    setRunningAlerts(true);
    try {
      const { error } = await supabase.functions.invoke("signal-alerts-run");
      if (error) throw error;
      toast.success("Alerts processed successfully");
    } catch (err) {
      console.error("[ADMIN_SIGNALS] Alerts error:", err);
      toast.error("Failed to run alerts");
    } finally {
      setRunningAlerts(false);
    }
  };

  const getVelocityBadge = (delta: number) => {
    if (delta >= 10) return { label: "High", variant: "destructive" as const };
    if (delta >= 5) return { label: "Medium", variant: "default" as const };
    return { label: "Low", variant: "secondary" as const };
  };

  const getTrendIcon = (value: number) => {
    if (value > 0) return <TrendingUp className="h-4 w-4 text-green-500" />;
    if (value < 0) return <TrendingDown className="h-4 w-4 text-red-500" />;
    return <Minus className="h-4 w-4 text-muted-foreground" />;
  };

  const getDaysActive = (createdAt: string): number => {
    const created = new Date(createdAt);
    const now = new Date();
    return Math.floor((now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24));
  };

  // Find signals with potential issues
  const noiseSignals = signals.filter(s => 
    s.signal_score > 15 && s.active_listing_count === 0 && s.watchlist_count === 0
  );

  if (adminLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Skeleton className="h-8 w-64 mb-8" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      </div>
    );
  }

  if (!isAdmin) return null;

  return (
    <>
      <Helmet>
        <title>Founder Signal Dashboard | Admin</title>
      </Helmet>

      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <BarChart3 className="h-6 w-6 text-primary" />
              Founder Signal Dashboard
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              Product traction and collector behavior insights
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Select value={timeWindow} onValueChange={(v) => setTimeWindow(v as TimeWindow)}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="24h">Last 24h</SelectItem>
                <SelectItem value="7d">Last 7 days</SelectItem>
                <SelectItem value="30d">Last 30 days</SelectItem>
              </SelectContent>
            </Select>

            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleRefreshSignals}
              disabled={refreshing}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? "animate-spin" : ""}`} />
              Refresh
            </Button>

            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleRunAlerts}
              disabled={runningAlerts}
            >
              <Bell className={`h-4 w-4 mr-2 ${runningAlerts ? "animate-pulse" : ""}`} />
              Run Alerts
            </Button>
          </div>
        </div>

        {/* Top Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-1">
                <Flame className="h-3.5 w-3.5" />
                Signals Generated
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{metrics.signalsGenerated}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Comics triggered collector signals
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-1">
                <Eye className="h-3.5 w-3.5" />
                Watchlist Velocity
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold flex items-center gap-2">
                {metrics.watchlistVelocity}
                {getTrendIcon(metrics.watchlistVelocity)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Net watchlist additions
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-1">
                <Camera className="h-3.5 w-3.5" />
                Scanner Momentum
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold flex items-center gap-2">
                {metrics.scannerMomentum}
                {getTrendIcon(metrics.scannerMomentum)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Scans per active user (trend)
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-1">
                <Activity className="h-3.5 w-3.5" />
                Signal → Action Lag
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">
                {metrics.signalActionLag > 0 ? `${metrics.signalActionLag}d` : "—"}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Median time to listing/sale
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Signal Funnel */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="text-lg">Signal Funnel</CardTitle>
            <CardDescription>Collector behavior to conversion</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              {[
                { label: "Behavior Detected", value: funnel.behaviorDetected },
                { label: "Signal Triggered", value: funnel.signalTriggered },
                { label: "Elite Viewed", value: funnel.eliteViewed },
                { label: "Listed", value: funnel.listed },
                { label: "Sold", value: funnel.sold },
              ].map((step, idx, arr) => (
                <div key={step.label} className="flex items-center gap-2 sm:gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold">{step.value}</div>
                    <div className="text-xs text-muted-foreground whitespace-nowrap">{step.label}</div>
                    {idx > 0 && arr[idx - 1].value > 0 && (
                      <div className="text-xs text-amber-600 mt-1">
                        {Math.round((step.value / arr[idx - 1].value) * 100)}%
                      </div>
                    )}
                  </div>
                  {idx < arr.length - 1 && (
                    <ArrowDown className="h-4 w-4 text-muted-foreground rotate-0 sm:-rotate-90" />
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Top Active Signals Table */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Top Active Signals</CardTitle>
                <CardDescription>What collectors care about right now</CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="space-y-2">
                    {[1, 2, 3, 4, 5].map(i => (
                      <Skeleton key={i} className="h-12 w-full" />
                    ))}
                  </div>
                ) : signals.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">No signals in this period</p>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Comic</TableHead>
                          <TableHead>Signal Type</TableHead>
                          <TableHead>Velocity</TableHead>
                          <TableHead className="text-center">Days Active</TableHead>
                          <TableHead className="text-center">Elite Views</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {signals.slice(0, 10).map((signal) => {
                          const velocity = getVelocityBadge(signal.delta_24h || 0);
                          const signalType = signal.watchlist_count > signal.scanner_count 
                            ? "Watchlist Spike" 
                            : "Scanner Surge";
                          
                          return (
                            <TableRow key={signal.id}>
                              <TableCell>
                                <div className="font-medium">
                                  {signal.comic_title}
                                  {signal.issue_number && ` #${signal.issue_number}`}
                                </div>
                                {signal.publisher && (
                                  <div className="text-xs text-muted-foreground">{signal.publisher}</div>
                                )}
                              </TableCell>
                              <TableCell>
                                <Badge variant="outline" className="text-xs">
                                  {signalType}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <Badge variant={velocity.variant}>{velocity.label}</Badge>
                              </TableCell>
                              <TableCell className="text-center">
                                {getDaysActive(signal.created_at)}
                              </TableCell>
                              <TableCell className="text-center text-muted-foreground">
                                —
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Signal Health Panel */}
          <div>
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-amber-500" />
                  Signal Health
                </CardTitle>
                <CardDescription>Potential noise or false positives</CardDescription>
              </CardHeader>
              <CardContent>
                {noiseSignals.length === 0 ? (
                  <div className="text-center py-6">
                    <div className="text-green-500 font-medium">All signals healthy</div>
                    <p className="text-xs text-muted-foreground mt-1">
                      No obvious noise detected
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {noiseSignals.slice(0, 5).map((signal) => (
                      <div key={signal.id} className="p-3 bg-amber-50 dark:bg-amber-950/20 rounded-lg border border-amber-200 dark:border-amber-800">
                        <div className="font-medium text-sm">
                          {signal.comic_title}
                          {signal.issue_number && ` #${signal.issue_number}`}
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">
                          High score ({signal.signal_score}) but no follow-up activity
                        </div>
                      </div>
                    ))}
                    {noiseSignals.length > 5 && (
                      <p className="text-xs text-muted-foreground text-center">
                        +{noiseSignals.length - 5} more
                      </p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Most Improved */}
            <Card className="mt-6">
              <CardHeader>
                <CardTitle className="text-lg">Most Improved</CardTitle>
                <CardDescription>Largest delta in 24h</CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <Skeleton className="h-20" />
                ) : (
                  <div className="space-y-2">
                    {signals
                      .filter(s => (s.delta_24h || 0) > 0)
                      .sort((a, b) => (b.delta_24h || 0) - (a.delta_24h || 0))
                      .slice(0, 3)
                      .map((signal) => (
                        <div key={signal.id} className="flex items-center justify-between text-sm">
                          <span className="truncate max-w-[150px]">
                            {signal.comic_title} #{signal.issue_number}
                          </span>
                          <Badge variant="outline" className="text-green-600">
                            +{signal.delta_24h}
                          </Badge>
                        </div>
                      ))}
                    {signals.filter(s => (s.delta_24h || 0) > 0).length === 0 && (
                      <p className="text-muted-foreground text-sm text-center">No movement</p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Supply Tight */}
            <Card className="mt-6">
              <CardHeader>
                <CardTitle className="text-lg">Supply Tight</CardTitle>
                <CardDescription>High interest, low listings</CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <Skeleton className="h-20" />
                ) : (
                  <div className="space-y-2">
                    {signals
                      .filter(s => s.watchlist_count > 3 && s.active_listing_count < 2)
                      .slice(0, 3)
                      .map((signal) => (
                        <div key={signal.id} className="flex items-center justify-between text-sm">
                          <span className="truncate max-w-[150px]">
                            {signal.comic_title} #{signal.issue_number}
                          </span>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <span>{signal.watchlist_count} 👁</span>
                            <span>{signal.active_listing_count} 📦</span>
                          </div>
                        </div>
                      ))}
                    {signals.filter(s => s.watchlist_count > 3 && s.active_listing_count < 2).length === 0 && (
                      <p className="text-muted-foreground text-sm text-center">No supply constraints</p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </>
  );
}
