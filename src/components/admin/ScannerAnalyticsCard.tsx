/**
 * SCANNER ANALYTICS CARD
 * ==========================================================================
 * Admin-only dashboard card showing scanner usage analytics.
 * Privacy-respecting: only shows aggregate counts, no PII.
 * ==========================================================================
 */

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Layers, TrendingUp, AlertCircle, Crown } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface AnalyticsData {
  scansToday: number;
  noMatchRate: number;
  bulkScansStarted: number;
  bulkScansCompleted: number;
  upgradesClicked: number;
  candidateBuckets: {
    zero: number;
    oneTwo: number;
    threeFive: number;
  };
}

export function ScannerAnalyticsCard() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchAnalytics() {
      try {
        // Get today's date range
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const todayISO = today.toISOString();

        // Fetch all events from today using type assertion for new table
        const { data: events, error } = await (supabase as any)
          .from("usage_events")
          .select("event_name, metadata")
          .gte("created_at", todayISO);

        if (error) {
          console.error("[SCANNER_ANALYTICS] Fetch error:", error);
          setLoading(false);
          return;
        }

        // Calculate metrics
        const scansStarted = events?.filter(
          (e: any) => e.event_name === "scanner_assist_started"
        ).length || 0;

        const noMatches = events?.filter(
          (e: any) => e.event_name === "scanner_assist_no_match"
        ).length || 0;

        const candidatesReturned = events?.filter(
          (e: any) => e.event_name === "scanner_assist_candidates_returned"
        ) || [];

        const bulkStarted = events?.filter(
          (e: any) => e.event_name === "bulk_scan_started"
        ).length || 0;

        const bulkCompleted = events?.filter(
          (e: any) => e.event_name === "bulk_scan_completed"
        ).length || 0;

        const upgradesClicked = events?.filter(
          (e: any) => e.event_name === "scanner_assist_upgrade_clicked"
        ).length || 0;

        // Calculate candidate bucket distribution
        let zero = 0, oneTwo = 0, threeFive = 0;
        candidatesReturned.forEach((e: any) => {
          const bucket = e.metadata?.candidate_count_bucket;
          if (bucket === "0") zero++;
          else if (bucket === "1-2") oneTwo++;
          else if (bucket === "3-5") threeFive++;
        });

        const noMatchRate = scansStarted > 0 
          ? Math.round((noMatches / scansStarted) * 100) 
          : 0;

        setData({
          scansToday: scansStarted,
          noMatchRate,
          bulkScansStarted: bulkStarted,
          bulkScansCompleted: bulkCompleted,
          upgradesClicked,
          candidateBuckets: { zero, oneTwo, threeFive },
        });
      } catch (err) {
        console.error("[SCANNER_ANALYTICS] Error:", err);
      } finally {
        setLoading(false);
      }
    }

    fetchAnalytics();
  }, []);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5" />
            Scanner Analytics
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Loading...</p>
        </CardContent>
      </Card>
    );
  }

  if (!data) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5" />
            Scanner Analytics
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Unable to load analytics</p>
        </CardContent>
      </Card>
    );
  }

  const totalCandidates = data.candidateBuckets.zero + data.candidateBuckets.oneTwo + data.candidateBuckets.threeFive;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="w-5 h-5" />
          Scanner Analytics
        </CardTitle>
        <CardDescription>Today's scanner usage (privacy-safe metrics)</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Key Metrics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="space-y-1">
            <p className="text-2xl font-bold">{data.scansToday}</p>
            <p className="text-xs text-muted-foreground">Scans Today</p>
          </div>
          <div className="space-y-1">
            <p className="text-2xl font-bold">{data.noMatchRate}%</p>
            <p className="text-xs text-muted-foreground">No Match Rate</p>
          </div>
          <div className="space-y-1">
            <p className="text-2xl font-bold">{data.bulkScansStarted}</p>
            <p className="text-xs text-muted-foreground">Bulk Scans Started</p>
          </div>
          <div className="space-y-1">
            <p className="text-2xl font-bold">{data.upgradesClicked}</p>
            <p className="text-xs text-muted-foreground">Upgrades Clicked</p>
          </div>
        </div>

        {/* Candidate Distribution */}
        {totalCandidates > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-medium">Candidate Distribution</p>
            <div className="flex gap-2">
              <Badge variant="outline" className="text-xs">
                0 matches: {Math.round((data.candidateBuckets.zero / totalCandidates) * 100)}%
              </Badge>
              <Badge variant="outline" className="text-xs">
                1-2 matches: {Math.round((data.candidateBuckets.oneTwo / totalCandidates) * 100)}%
              </Badge>
              <Badge variant="default" className="text-xs">
                3-5 matches: {Math.round((data.candidateBuckets.threeFive / totalCandidates) * 100)}%
              </Badge>
            </div>
          </div>
        )}

        {/* Bulk Scan Stats */}
        {data.bulkScansStarted > 0 && (
          <div className="flex items-center gap-2 text-sm">
            <Layers className="w-4 h-4 text-muted-foreground" />
            <span>
              Bulk completion rate:{" "}
              {Math.round((data.bulkScansCompleted / data.bulkScansStarted) * 100)}%
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
