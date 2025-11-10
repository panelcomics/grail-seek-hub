import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Bell } from "lucide-react";

export const NotificationPreferences = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [preferences, setPreferences] = useState({
    notify_auction_ending: true,
    notify_new_posts: true,
    notify_via_email: true,
  });

  useEffect(() => {
    if (user) {
      fetchPreferences();
    }
  }, [user]);

  const fetchPreferences = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("notify_auction_ending, notify_new_posts, notify_via_email")
        .eq("user_id", user.id)
        .single();

      if (error) throw error;

      if (data) {
        setPreferences({
          notify_auction_ending: data.notify_auction_ending ?? true,
          notify_new_posts: data.notify_new_posts ?? true,
          notify_via_email: data.notify_via_email ?? true,
        });
      }
    } catch (error) {
      console.error("Error fetching preferences:", error);
    } finally {
      setLoading(false);
    }
  };

  const updatePreference = async (key: keyof typeof preferences, value: boolean) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from("profiles")
        .update({ [key]: value })
        .eq("user_id", user.id);

      if (error) throw error;

      setPreferences(prev => ({ ...prev, [key]: value }));
      toast.success("Notification preferences updated");
    } catch (error) {
      console.error("Error updating preference:", error);
      toast.error("Failed to update preferences");
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Notification Preferences
          </CardTitle>
          <CardDescription>Loading...</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="h-5 w-5" />
          Notification Preferences
        </CardTitle>
        <CardDescription>
          Manage how you receive notifications about activity
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="auction-ending">Auction ending alerts</Label>
            <p className="text-sm text-muted-foreground">
              Get notified when auctions you're watching are ending soon
            </p>
          </div>
          <Switch
            id="auction-ending"
            checked={preferences.notify_auction_ending}
            onCheckedChange={(checked) => updatePreference("notify_auction_ending", checked)}
          />
        </div>

        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="new-posts">New posts from sellers</Label>
            <p className="text-sm text-muted-foreground">
              Get notified when sellers you follow post new listings
            </p>
          </div>
          <Switch
            id="new-posts"
            checked={preferences.notify_new_posts}
            onCheckedChange={(checked) => updatePreference("notify_new_posts", checked)}
          />
        </div>

        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="email-notifications">Email me notifications</Label>
            <p className="text-sm text-muted-foreground">
              Receive notifications via email in addition to in-app
            </p>
          </div>
          <Switch
            id="email-notifications"
            checked={preferences.notify_via_email}
            onCheckedChange={(checked) => updatePreference("notify_via_email", checked)}
          />
        </div>
      </CardContent>
    </Card>
  );
};
