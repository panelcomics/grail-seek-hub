/**
 * BASELANE FEATURE FLAGS ADMIN PANEL
 * ==========================================================================
 * Admin-only UI for toggling Baselane Pack v1 feature flags at runtime.
 * Changes take effect immediately without code deployment.
 * ==========================================================================
 */

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { ToggleLeft, RefreshCw, Info, Zap } from "lucide-react";
import { clearBaselaneFlagsCache } from "@/hooks/useBaselaneFlags";

interface FlagRow {
  id: string;
  flag_key: string;
  enabled: boolean;
  description: string | null;
  updated_at: string;
}

const FLAG_LABELS: Record<string, { label: string; description: string }> = {
  ENABLE_BASELANE_PACK_V1: {
    label: "Master Toggle",
    description: "When ON, enables all Baselane features regardless of individual settings",
  },
  ENABLE_ORDER_TIMELINE: {
    label: "Order Timeline",
    description: "Shows timeline on order detail pages (Paid → Shipped → Delivered → Completed)",
  },
  ENABLE_SELLER_WALLET: {
    label: "Seller Wallet",
    description: "Wallet with Pending/Available/On-Hold balances and payout requests",
  },
  ENABLE_EARNINGS_DASHBOARD: {
    label: "Earnings Dashboard",
    description: "Monthly earnings breakdown with CSV export",
  },
  ENABLE_RISK_HOLDS: {
    label: "Risk Holds",
    description: "Non-blocking risk assessment for high-value orders",
  },
  ENABLE_NOTIFICATIONS: {
    label: "Notifications Center",
    description: "Bell icon with unread count and notification history",
  },
};

export function BaselaneFlagsAdmin() {
  const { user } = useAuth();
  const [flags, setFlags] = useState<FlagRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);

  useEffect(() => {
    fetchFlags();
  }, []);

  const fetchFlags = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("baselane_feature_flags")
        .select("*")
        .order("flag_key");

      if (error) throw error;
      setFlags(data || []);
    } catch (error) {
      console.error("[BASELANE_FLAGS_ADMIN] Error fetching flags:", error);
      toast.error("Failed to load feature flags");
    } finally {
      setLoading(false);
    }
  };

  const toggleFlag = async (flagKey: string, currentValue: boolean) => {
    setSaving(flagKey);
    try {
      const { error } = await supabase
        .from("baselane_feature_flags")
        .update({
          enabled: !currentValue,
          updated_by: user?.id,
          updated_at: new Date().toISOString(),
        })
        .eq("flag_key", flagKey);

      if (error) throw error;

      // Clear cache so all components pick up the new value
      clearBaselaneFlagsCache();

      // Update local state
      setFlags((prev) =>
        prev.map((f) =>
          f.flag_key === flagKey ? { ...f, enabled: !currentValue } : f
        )
      );

      toast.success(`${FLAG_LABELS[flagKey]?.label || flagKey} ${!currentValue ? "enabled" : "disabled"}`);
    } catch (error: any) {
      console.error("[BASELANE_FLAGS_ADMIN] Error toggling flag:", error);
      toast.error(error.message || "Failed to update flag");
    } finally {
      setSaving(null);
    }
  };

  const enableAll = async () => {
    setSaving("all");
    try {
      const { error } = await supabase
        .from("baselane_feature_flags")
        .update({
          enabled: true,
          updated_by: user?.id,
          updated_at: new Date().toISOString(),
        })
        .neq("flag_key", ""); // Update all

      if (error) throw error;

      clearBaselaneFlagsCache();
      await fetchFlags();
      toast.success("All Baselane features enabled");
    } catch (error: any) {
      console.error("[BASELANE_FLAGS_ADMIN] Error enabling all:", error);
      toast.error(error.message || "Failed to enable all flags");
    } finally {
      setSaving(null);
    }
  };

  const disableAll = async () => {
    setSaving("all");
    try {
      const { error } = await supabase
        .from("baselane_feature_flags")
        .update({
          enabled: false,
          updated_by: user?.id,
          updated_at: new Date().toISOString(),
        })
        .neq("flag_key", "");

      if (error) throw error;

      clearBaselaneFlagsCache();
      await fetchFlags();
      toast.success("All Baselane features disabled");
    } catch (error: any) {
      console.error("[BASELANE_FLAGS_ADMIN] Error disabling all:", error);
      toast.error(error.message || "Failed to disable all flags");
    } finally {
      setSaving(null);
    }
  };

  const masterFlag = flags.find((f) => f.flag_key === "ENABLE_BASELANE_PACK_V1");
  const otherFlags = flags.filter((f) => f.flag_key !== "ENABLE_BASELANE_PACK_V1");
  const enabledCount = flags.filter((f) => f.enabled).length;

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-6 bg-muted rounded w-1/3" />
            <div className="h-4 bg-muted rounded w-2/3" />
            <div className="space-y-3">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="h-12 bg-muted rounded" />
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <ToggleLeft className="h-5 w-5" />
              Baselane Pack v1 Feature Flags
            </CardTitle>
            <CardDescription>
              Control marketplace rails features at runtime
            </CardDescription>
          </div>
          <Badge variant={enabledCount > 0 ? "default" : "secondary"}>
            {enabledCount}/{flags.length} Enabled
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Quick Actions */}
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={enableAll}
            disabled={saving === "all"}
          >
            <Zap className="h-4 w-4 mr-2" />
            Enable All
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={disableAll}
            disabled={saving === "all"}
          >
            Disable All
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={fetchFlags}
            disabled={loading}
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>

        {/* Master Toggle */}
        {masterFlag && (
          <>
            <div className="p-4 rounded-lg border-2 border-primary/30 bg-primary/5">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label className="text-base font-semibold flex items-center gap-2">
                    {FLAG_LABELS[masterFlag.flag_key]?.label || masterFlag.flag_key}
                    <Badge variant="outline">Master</Badge>
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    {FLAG_LABELS[masterFlag.flag_key]?.description || masterFlag.description}
                  </p>
                </div>
                <Switch
                  checked={masterFlag.enabled}
                  onCheckedChange={() => toggleFlag(masterFlag.flag_key, masterFlag.enabled)}
                  disabled={saving === masterFlag.flag_key}
                />
              </div>
            </div>

            {masterFlag.enabled && (
              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription>
                  Master toggle is ON — all features below are active regardless of their individual settings.
                </AlertDescription>
              </Alert>
            )}
          </>
        )}

        <Separator />

        {/* Individual Flags */}
        <div className="space-y-4">
          <h3 className="text-sm font-medium text-muted-foreground">Individual Features</h3>
          {otherFlags.map((flag) => (
            <div
              key={flag.id}
              className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/30 transition-colors"
            >
              <div className="space-y-0.5">
                <Label className="text-sm font-medium">
                  {FLAG_LABELS[flag.flag_key]?.label || flag.flag_key}
                </Label>
                <p className="text-xs text-muted-foreground">
                  {FLAG_LABELS[flag.flag_key]?.description || flag.description}
                </p>
              </div>
              <div className="flex items-center gap-3">
                {flag.enabled && !masterFlag?.enabled && (
                  <Badge variant="default" className="text-xs">ON</Badge>
                )}
                <Switch
                  checked={masterFlag?.enabled || flag.enabled}
                  onCheckedChange={() => toggleFlag(flag.flag_key, flag.enabled)}
                  disabled={saving === flag.flag_key || masterFlag?.enabled}
                />
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
