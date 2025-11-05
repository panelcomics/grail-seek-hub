import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Send } from "lucide-react";

export const AdminTestNotification = () => {
  const [userId, setUserId] = useState("");
  const [link, setLink] = useState("/");
  const [sending, setSending] = useState(false);

  const sendTestNotification = async () => {
    if (!userId.trim()) {
      toast.error("Please enter a user ID");
      return;
    }

    setSending(true);
    try {
      const { data, error } = await supabase.functions.invoke("send-test-notification", {
        body: { userId, link },
      });

      if (error) throw error;

      toast.success("Test notification sent successfully!");
      setUserId("");
      setLink("/");
    } catch (error: any) {
      console.error("Error sending test notification:", error);
      toast.error(error.message || "Failed to send test notification");
    } finally {
      setSending(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Send className="h-5 w-5" />
          Send Test Notification
        </CardTitle>
        <CardDescription>
          Send a test notification to verify delivery
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="user-id">User ID (UUID)</Label>
          <Input
            id="user-id"
            placeholder="Enter user UUID"
            value={userId}
            onChange={(e) => setUserId(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="link">Link (optional)</Label>
          <Input
            id="link"
            placeholder="/"
            value={link}
            onChange={(e) => setLink(e.target.value)}
          />
        </div>

        <Button onClick={sendTestNotification} disabled={sending} className="w-full">
          <Send className="h-4 w-4 mr-2" />
          {sending ? "Sending..." : "Send Test Notification"}
        </Button>
      </CardContent>
    </Card>
  );
};
