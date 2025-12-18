/**
 * FEATURE FLAGS ADMIN CARD
 * ==========================================================================
 * Admin-only card for toggling feature flags.
 * ==========================================================================
 */

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Settings, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useFeatureFlags } from "@/hooks/useFeatureFlags";
import { toast } from "sonner";

export function FeatureFlagsCard() {
  const { flags, refresh, loading } = useFeatureFlags();
  const [saving, setSaving] = useState(false);
  const [localFlags, setLocalFlags] = useState(flags);

  // Sync local state with fetched flags
  useState(() => {
    setLocalFlags(flags);
  });

  const handleToggle = (key: string, value: boolean) => {
    setLocalFlags((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // Update each flag in app_settings
      const updates = [
        { key: "bulk_scan_enabled", value: localFlags.bulkScanEnabled ? "true" : "false" },
        { key: "scanner_assist_enabled", value: localFlags.scannerAssistEnabled ? "true" : "false" },
        { key: "analytics_enabled", value: localFlags.analyticsEnabled ? "true" : "false" },
      ];

      for (const update of updates) {
        const { error } = await supabase
          .from("app_settings")
          .update({ value: update.value })
          .eq("key", update.key);

        if (error) {
          console.error(`[FEATURE_FLAGS] Failed to update ${update.key}:`, error);
          throw error;
        }
      }

      await refresh();
      toast.success("Feature flags updated");
    } catch (err) {
      console.error("[FEATURE_FLAGS] Save error:", err);
      toast.error("Failed to save feature flags");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings className="w-5 h-5" />
          Feature Flags
        </CardTitle>
        <CardDescription>
          Enable or disable features instantly without code changes
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading ? (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="w-4 h-4 animate-spin" />
            Loading flags...
          </div>
        ) : (
          <>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="bulk-scan">Bulk Scan (Elite)</Label>
                  <p className="text-xs text-muted-foreground">
                    Allow Elite users to upload multiple images at once
                  </p>
                </div>
                <Switch
                  id="bulk-scan"
                  checked={localFlags.bulkScanEnabled}
                  onCheckedChange={(checked) => handleToggle("bulkScanEnabled", checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="scanner-assist">Scanner Assist</Label>
                  <p className="text-xs text-muted-foreground">
                    Photo-to-ComicVine matching feature
                  </p>
                </div>
                <Switch
                  id="scanner-assist"
                  checked={localFlags.scannerAssistEnabled}
                  onCheckedChange={(checked) => handleToggle("scannerAssistEnabled", checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="analytics">Usage Analytics</Label>
                  <p className="text-xs text-muted-foreground">
                    Track anonymous scanner usage metrics
                  </p>
                </div>
                <Switch
                  id="analytics"
                  checked={localFlags.analyticsEnabled}
                  onCheckedChange={(checked) => handleToggle("analyticsEnabled", checked)}
                />
              </div>
            </div>

            <Button onClick={handleSave} disabled={saving} className="w-full">
              {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Save Changes
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}
