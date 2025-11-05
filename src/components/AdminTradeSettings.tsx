import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, Save, AlertCircle } from "lucide-react";
import { toast } from "sonner";

export function AdminTradeSettings() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState({
    percentage_fee: 0.02,
    flat_fee: 2.00,
    fees_enabled: true,
  });

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const { data, error } = await supabase
        .from("trade_fee_settings")
        .select("*")
        .single();

      if (error) throw error;

      if (data) {
        setSettings({
          percentage_fee: Number(data.percentage_fee),
          flat_fee: Number(data.flat_fee),
          fees_enabled: data.fees_enabled,
        });
      }
    } catch (error) {
      console.error("Error loading settings:", error);
      toast.error("Failed to load trade fee settings");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { error } = await supabase
        .from("trade_fee_settings")
        .update({
          percentage_fee: settings.percentage_fee,
          flat_fee: settings.flat_fee,
          fees_enabled: settings.fees_enabled,
          updated_by: user?.id,
        })
        .eq("id", (await supabase.from("trade_fee_settings").select("id").single()).data?.id);

      if (error) throw error;

      toast.success("Trade fee settings updated successfully");
    } catch (error) {
      console.error("Error saving settings:", error);
      toast.error("Failed to update settings");
    } finally {
      setSaving(false);
    }
  };

  const calculateExampleFee = () => {
    const exampleValue = 100;
    const totalFee = (exampleValue * settings.percentage_fee) + settings.flat_fee;
    const eachFee = totalFee / 2;
    return { totalFee, eachFee };
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin" />
        </CardContent>
      </Card>
    );
  }

  const { totalFee, eachFee } = calculateExampleFee();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Trade Fee Settings</CardTitle>
        <CardDescription>
          Configure the fee structure for trades on the platform
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="fees-enabled">Enable Trade Fees</Label>
            <p className="text-sm text-muted-foreground">
              Toggle to enable or disable all trade fees
            </p>
          </div>
          <Switch
            id="fees-enabled"
            checked={settings.fees_enabled}
            onCheckedChange={(checked) => 
              setSettings({ ...settings, fees_enabled: checked })
            }
          />
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="percentage-fee">Percentage Fee (%)</Label>
            <Input
              id="percentage-fee"
              type="number"
              step="0.001"
              min="0"
              max="1"
              value={settings.percentage_fee}
              onChange={(e) => 
                setSettings({ ...settings, percentage_fee: Number(e.target.value) })
              }
              disabled={!settings.fees_enabled}
            />
            <p className="text-xs text-muted-foreground">
              Current: {(settings.percentage_fee * 100).toFixed(2)}%
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="flat-fee">Flat Fee ($)</Label>
            <Input
              id="flat-fee"
              type="number"
              step="0.01"
              min="0"
              value={settings.flat_fee}
              onChange={(e) => 
                setSettings({ ...settings, flat_fee: Number(e.target.value) })
              }
              disabled={!settings.fees_enabled}
            />
          </div>
        </div>

        {settings.fees_enabled && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <strong>Example for $100 trade:</strong>
              <div className="mt-2 space-y-1 text-sm">
                <div>Total fee: ${totalFee.toFixed(2)}</div>
                <div>Each trader pays: ${eachFee.toFixed(2)}</div>
                <div className="text-muted-foreground">
                  Formula: (value × {(settings.percentage_fee * 100).toFixed(2)}%) + ${settings.flat_fee} ÷ 2
                </div>
              </div>
            </AlertDescription>
          </Alert>
        )}

        <Button onClick={handleSave} disabled={saving} className="w-full">
          {saving ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="mr-2 h-4 w-4" />
              Save Settings
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
