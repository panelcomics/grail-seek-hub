import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { useAdminCheck } from "@/hooks/useAdminCheck";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Loader2, Save } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export default function AdminSettings() {
  const navigate = useNavigate();
  const { isAdmin, loading: adminLoading } = useAdminCheck();
  const [settings, setSettings] = useState({
    allow_new_signups: true,
    marketplace_live: true,
    scanner_enabled: true,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!adminLoading && !isAdmin) {
      navigate("/");
    }
  }, [isAdmin, adminLoading, navigate]);

  useEffect(() => {
    if (isAdmin) {
      fetchSettings();
    }
  }, [isAdmin]);

  const fetchSettings = async () => {
    try {
      const { data, error } = await supabase
        .from("app_settings")
        .select("key, value");

      if (error) throw error;

      const settingsMap: any = { ...settings };
      data?.forEach(item => {
        settingsMap[item.key] = item.value === 'true';
      });

      setSettings(settingsMap);
    } catch (error) {
      console.error("Error fetching settings:", error);
      toast.error("Failed to load settings");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // Update each setting
      for (const [key, value] of Object.entries(settings)) {
        const { error } = await supabase
          .from("app_settings")
          .update({ 
            value: value.toString(),
            updated_at: new Date().toISOString()
          })
          .eq("key", key);

        if (error) throw error;
      }

      toast.success("Settings saved successfully");
    } catch (error: any) {
      console.error("Error saving settings:", error);
      toast.error(error.message || "Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = (key: string, value: boolean) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  if (adminLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Helmet>
        <title>Feature Toggles | Admin Settings</title>
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>

      <Navbar />

      <main className="flex-1 container py-8 max-w-4xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Feature Toggles</h1>
          <p className="text-muted-foreground">
            Control platform features instantly without redeployment
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Platform Configuration</CardTitle>
            <CardDescription>
              Toggle features on or off. Changes take effect immediately for all users.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between space-x-4">
              <div className="flex-1 space-y-1">
                <Label htmlFor="marketplace_live">Marketplace Live</Label>
                <p className="text-sm text-muted-foreground">
                  Enable or disable the public marketplace
                </p>
              </div>
              <Switch
                id="marketplace_live"
                checked={settings.marketplace_live}
                onCheckedChange={(checked) => handleToggle('marketplace_live', checked)}
              />
            </div>

            <div className="flex items-center justify-between space-x-4">
              <div className="flex-1 space-y-1">
                <Label htmlFor="scanner_enabled">Comic Scanner</Label>
                <p className="text-sm text-muted-foreground">
                  Enable or disable the AI comic scanner feature
                </p>
              </div>
              <Switch
                id="scanner_enabled"
                checked={settings.scanner_enabled}
                onCheckedChange={(checked) => handleToggle('scanner_enabled', checked)}
              />
            </div>

            <div className="flex items-center justify-between space-x-4">
              <div className="flex-1 space-y-1">
                <Label htmlFor="allow_new_signups">New User Signups</Label>
                <p className="text-sm text-muted-foreground">
                  Allow new users to create accounts
                </p>
              </div>
              <Switch
                id="allow_new_signups"
                checked={settings.allow_new_signups}
                onCheckedChange={(checked) => handleToggle('allow_new_signups', checked)}
              />
            </div>

            <div className="pt-4 flex justify-end">
              <Button onClick={handleSave} disabled={saving}>
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                <Save className="mr-2 h-4 w-4" />
                Save Changes
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Security Notice</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm text-muted-foreground">
              <p>
                <strong>✓ HTTPS Enforced:</strong> All traffic is automatically secured with HTTPS
              </p>
              <p>
                <strong>✓ Secure Cookies:</strong> Session cookies use HttpOnly, Secure, and SameSite flags
              </p>
              <p>
                <strong>✓ API Keys Protected:</strong> All sensitive keys are stored server-side only
              </p>
              <p>
                <strong>✓ CSP Headers:</strong> Content Security Policy headers are configured
              </p>
            </div>
          </CardContent>
        </Card>
      </main>

      <Footer />
    </div>
  );
}
