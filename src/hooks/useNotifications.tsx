import { useEffect, useState } from "react";
import { toast } from "sonner";

export type NotificationPermission = "default" | "granted" | "denied";

interface NotificationOptions {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  tag?: string;
  data?: any;
}

export const useNotifications = () => {
  const [permission, setPermission] = useState<NotificationPermission>("default");
  const [isSupported, setIsSupported] = useState(false);

  useEffect(() => {
    // Check if notifications are supported
    if ("Notification" in window) {
      setIsSupported(true);
      setPermission(Notification.permission as NotificationPermission);
    }
  }, []);

  const requestPermission = async (): Promise<NotificationPermission> => {
    if (!isSupported) {
      toast.error("Notifications are not supported in this browser");
      return "denied";
    }

    try {
      const result = await Notification.requestPermission();
      setPermission(result as NotificationPermission);
      
      if (result === "granted") {
        toast.success("Push notifications enabled!");
      } else if (result === "denied") {
        toast.error("Notification permission denied");
      }
      
      return result as NotificationPermission;
    } catch (error) {
      console.error("Error requesting notification permission:", error);
      toast.error("Failed to request notification permission");
      return "denied";
    }
  };

  const sendNotification = (options: NotificationOptions) => {
    if (!isSupported) {
      console.warn("Notifications not supported");
      return;
    }

    if (permission !== "granted") {
      console.warn("Notification permission not granted");
      return;
    }

    try {
      const notification = new Notification(options.title, {
        body: options.body,
        icon: options.icon || "/favicon.ico",
        badge: options.badge,
        tag: options.tag,
        data: options.data,
        requireInteraction: false,
        silent: false,
      });

      // Auto-close after 5 seconds
      setTimeout(() => notification.close(), 5000);

      notification.onclick = () => {
        window.focus();
        notification.close();
        
        // Handle click based on notification data
        if (options.data?.url) {
          window.location.href = options.data.url;
        }
      };

      return notification;
    } catch (error) {
      console.error("Error showing notification:", error);
    }
  };

  const sendClaimSecuredNotification = (itemTitle: string, amount: number) => {
    sendNotification({
      title: "🎉 Your claim secured!",
      body: `${itemTitle} - You'll receive $${amount.toFixed(2)}`,
      tag: "claim-secured",
      data: { type: "claim-secured", url: "/portfolio" }
    });
  };

  const sendNewClaimSaleNotification = (saleTitle: string, location?: string) => {
    sendNotification({
      title: "🔥 New claim sale near you!",
      body: location 
        ? `${saleTitle} - ${location}` 
        : saleTitle,
      tag: "new-sale",
      data: { type: "new-sale", url: "/" }
    });
  };

  const sendTestNotification = () => {
    sendNotification({
      title: "🦸 Sentinel #474 Available!",
      body: "New claim sale just dropped near you - Sentinel #474 CGC 9.6",
      tag: "test-sentinel",
      data: { type: "test", url: "/" }
    });
  };

  return {
    permission,
    isSupported,
    requestPermission,
    sendNotification,
    sendClaimSecuredNotification,
    sendNewClaimSaleNotification,
    sendTestNotification,
  };
};
