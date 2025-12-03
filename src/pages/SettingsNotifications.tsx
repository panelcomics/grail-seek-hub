import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Loader2, Bell, Mail, ArrowLeft, Package, Heart } from "lucide-react";
import { toast } from "sonner";
import { Link } from "react-router-dom";

interface NotificationPrefs {
  email_opt_in: boolean;
  trade_notifications: boolean;
  watchlist_notifications: boolean;
}

export default function SettingsNotifications() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [prefs, setPrefs] = useState<NotificationPrefs>({
    email_opt_in: true,
    trade_notifications: true,
    watchlist_notifications: true,
  });

  useEffect(() => {
    if (!user) {
      navigate("/auth");
      return;
    }
    fetchPreferences();
  }, [user]);

  const fetchPreferences = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from("notification_preferences")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (error && error.code !== "PGRST116") {
        throw error;
      }

      if (data) {
        setPrefs({
          email_opt_in: data.email_opt_in ?? true,
          trade_notifications: data.trade_notifications ?? true,
          watchlist_notifications: data.watchlist_notifications ?? true,
        });
      }
    } catch (error) {
      console.error("Error fetching notification preferences:", error);
    } finally {
      setLoading(false);
    }
  };

  const savePreferences = async () => {
    if (!user) return;
    
    setSaving(true);
    try {
      const { error } = await supabase
        .from("notification_preferences")
        .upsert({
          user_id: user.id,
          email_opt_in: prefs.email_opt_in,
          trade_notifications: prefs.trade_notifications,
          watchlist_notifications: prefs.watchlist_notifications,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: "user_id",
        });

      if (error) throw error;
      
      toast.success("Notification preferences saved!");
    } catch (error) {
      console.error("Error saving preferences:", error);
      toast.error("Failed to save preferences");
    } finally {
      setSaving(false);
    }
  };

  const updatePref = (key: keyof NotificationPrefs, value: boolean) => {
    setPrefs(prev => ({ ...prev, [key]: value }));
  };

  if (loading) {
    return (
      <main className="container mx-auto px-4 py-12 max-w-2xl">
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </main>
    );
  }

  return (
    <main className="container mx-auto px-4 py-12 max-w-2xl">
      <Helmet>
        <title>Notification Settings | GrailSeeker</title>
        <meta name="description" content="Manage your notification preferences on GrailSeeker." />
      </Helmet>

      <Button variant="ghost" asChild className="mb-6">
        <Link to="/settings">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Settings
        </Link>
      </Button>

      <div className="mb-8">
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <Bell className="h-8 w-8 text-primary" />
          Notification Settings
        </h1>
        <p className="text-muted-foreground mt-2">
          Control how and when you receive notifications from GrailSeeker.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Email Notifications</CardTitle>
          <CardDescription>
            Choose which types of notifications you want to receive via email.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Mail className="h-5 w-5 text-muted-foreground" />
              <div>
                <Label htmlFor="email_opt_in" className="font-medium">
                  Email Updates
                </Label>
                <p className="text-sm text-muted-foreground">
                  Receive general email notifications and updates
                </p>
              </div>
            </div>
            <Switch
              id="email_opt_in"
              checked={prefs.email_opt_in}
              onCheckedChange={(checked) => updatePref("email_opt_in", checked)}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Package className="h-5 w-5 text-muted-foreground" />
              <div>
                <Label htmlFor="trade_notifications" className="font-medium">
                  Trade & Offer Alerts
                </Label>
                <p className="text-sm text-muted-foreground">
                  Get notified about new trade requests and offers
                </p>
              </div>
            </div>
            <Switch
              id="trade_notifications"
              checked={prefs.trade_notifications}
              onCheckedChange={(checked) => updatePref("trade_notifications", checked)}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Heart className="h-5 w-5 text-muted-foreground" />
              <div>
                <Label htmlFor="watchlist_notifications" className="font-medium">
                  Watchlist Alerts
                </Label>
                <p className="text-sm text-muted-foreground">
                  Get notified about price changes on watched items
                </p>
              </div>
            </div>
            <Switch
              id="watchlist_notifications"
              checked={prefs.watchlist_notifications}
              onCheckedChange={(checked) => updatePref("watchlist_notifications", checked)}
            />
          </div>

          <div className="pt-4 border-t">
            <Button onClick={savePreferences} disabled={saving} className="w-full">
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save Preferences"
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Push Notifications</CardTitle>
          <CardDescription>
            Browser push notifications are coming soon!
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            We're working on adding push notification support so you can get instant alerts 
            about important updates even when you're not on the site.
          </p>
        </CardContent>
      </Card>
    </main>
  );
}
