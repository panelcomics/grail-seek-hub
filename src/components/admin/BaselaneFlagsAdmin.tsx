/**
 * BASELANE FEATURE FLAGS ADMIN PANEL
 * ==========================================================================
 * Admin-only UI for toggling Baselane Pack v1 feature flags at runtime.
 * Reads/writes from unified app_settings table.
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
  key: string;
  value: string;
  description: string | null;
  updated_at: string;
}

// Keys in app_settings for Baselane flags
const BASELANE_FLAG_KEYS = [
  "enable_baselane_pack_v1",
  "enable_order_timeline",
  "enable_seller_wallet",
  "enable_earnings_dashboard",
  "enable_risk_holds",
  "enable_notifications",
];

const FLAG_LABELS: Record<string, { label: string; description: string }> = {
  enable_baselane_pack_v1: {
    label: "Master Toggle",
    description: "When ON, enables all Baselane features regardless of individual settings",
  },
  enable_order_timeline: {
    label: "Order Timeline",
    description: "Shows timeline on order detail pages (Paid → Shipped → Delivered → Completed)",
  },
  enable_seller_wallet: {
    label: "Seller Wallet",
    description: "Wallet with Pending/Available/On-Hold balances and payout requests",
  },
  enable_earnings_dashboard: {
    label: "Earnings Dashboard",
    description: "Monthly earnings breakdown with CSV export",
  },
  enable_risk_holds: {
    label: "Risk Holds",
    description: "Non-blocking risk assessment for high-value orders",
  },
  enable_notifications: {
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
        .from("app_settings")
        .select("key, value, description, updated_at")
        .in("key", BASELANE_FLAG_KEYS)
        .order("key");

      if (error) throw error;
      setFlags(data || []);
    } catch (error) {
      console.error("[BASELANE_FLAGS_ADMIN] Error fetching flags:", error);
      toast.error("Failed to load feature flags");
    } finally {
      setLoading(false);
    }
  };

  const toggleFlag = async (flagKey: string, currentValue: string) => {
    setSaving(flagKey);
    const newValue = currentValue === "true" ? "false" : "true";
    
    try {
      const { error } = await supabase
        .from("app_settings")
        .update({
          value: newValue,
          updated_by: user?.id,
          updated_at: new Date().toISOString(),
        })
        .eq("key", flagKey);

      if (error) throw error;

      // Clear cache so all components pick up the new value
      clearBaselaneFlagsCache();

      // Update local state
      setFlags((prev) =>
        prev.map((f) =>
          f.key === flagKey ? { ...f, value: newValue } : f
        )
      );

      const isEnabled = newValue === "true";
      toast.success(`${FLAG_LABELS[flagKey]?.label || flagKey} ${isEnabled ? "enabled" : "disabled"}`);
    } catch (error: any) {
      console.error("[BASELANE_FLAGS_ADMIN] Error toggling flag:", error);
      toast.error(error.message || "Failed to update flag");
    } finally {
      setSaving(null);
    }
  };

  const setAllFlags = async (enabled: boolean) => {
    setSaving("all");
    try {
      // Update each flag individually since we can't do bulk update easily
      for (const key of BASELANE_FLAG_KEYS) {
        const { error } = await supabase
          .from("app_settings")
          .update({
            value: enabled ? "true" : "false",
            updated_by: user?.id,
            updated_at: new Date().toISOString(),
          })
          .eq("key", key);

        if (error) throw error;
      }

      clearBaselaneFlagsCache();
      await fetchFlags();
      toast.success(`All Baselane features ${enabled ? "enabled" : "disabled"}`);
    } catch (error: any) {
      console.error("[BASELANE_FLAGS_ADMIN] Error setting all flags:", error);
      toast.error(error.message || "Failed to update flags");
    } finally {
      setSaving(null);
    }
  };

  const masterFlag = flags.find((f) => f.key === "enable_baselane_pack_v1");
  const otherFlags = flags.filter((f) => f.key !== "enable_baselane_pack_v1");
  const enabledCount = flags.filter((f) => f.value === "true").length;
  const isMasterEnabled = masterFlag?.value === "true";

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
              Control marketplace rails features at runtime (stored in app_settings)
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
            onClick={() => setAllFlags(true)}
            disabled={saving === "all"}
          >
            <Zap className="h-4 w-4 mr-2" />
            Enable All
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setAllFlags(false)}
            disabled={saving === "all"}
          >
            Disable All
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              clearBaselaneFlagsCache();
              fetchFlags();
              toast.success("Flags cache cleared");
            }}
            disabled={loading}
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh (clears cache)
          </Button>
        </div>

        {/* Master Toggle */}
        {masterFlag && (
          <>
            <div className="p-4 rounded-lg border-2 border-primary/30 bg-primary/5">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label className="text-base font-semibold flex items-center gap-2">
                    {FLAG_LABELS[masterFlag.key]?.label || masterFlag.key}
                    <Badge variant="outline">Master</Badge>
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    {FLAG_LABELS[masterFlag.key]?.description || masterFlag.description}
                  </p>
                </div>
                <Switch
                  checked={isMasterEnabled}
                  onCheckedChange={() => toggleFlag(masterFlag.key, masterFlag.value)}
                  disabled={saving === masterFlag.key}
                />
              </div>
            </div>

            {isMasterEnabled && (
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
          {otherFlags.map((flag) => {
            const isEnabled = flag.value === "true";
            return (
              <div
                key={flag.key}
                className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/30 transition-colors"
              >
                <div className="space-y-0.5">
                  <Label className="text-sm font-medium">
                    {FLAG_LABELS[flag.key]?.label || flag.key}
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    {FLAG_LABELS[flag.key]?.description || flag.description}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  {isEnabled && !isMasterEnabled && (
                    <Badge variant="default" className="text-xs">ON</Badge>
                  )}
                  <Switch
                    checked={isMasterEnabled || isEnabled}
                    onCheckedChange={() => toggleFlag(flag.key, flag.value)}
                    disabled={saving === flag.key || isMasterEnabled}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
