import { supabase } from "@/integrations/supabase/client";

interface TradeNotificationPayload {
  buyerEmail: string;
  buyerName?: string;
  listingTitle: string;
  offerTitle: string;
  offerIssue?: string | null;
  status: string;
}

export async function sendTradeNotification(
  payload: TradeNotificationPayload
): Promise<{ ok: boolean; error?: string }> {
  try {
    console.log("[NOTIFICATIONS] Attempting to send trade notification:", payload);

    const { data, error } = await supabase.functions.invoke("send-trade-email", {
      body: payload,
    });

    if (error) {
      console.error("[NOTIFICATIONS] Error invoking send-trade-email function:", error);
      return { ok: false, error: error.message };
    }

    if (!data?.success) {
      console.log("[NOTIFICATIONS] Email not sent:", data?.reason || "unknown reason");
      return { ok: false, error: data?.reason || "Email sending failed" };
    }

    console.log("[NOTIFICATIONS] Trade notification sent successfully");
    return { ok: true };
  } catch (err) {
    console.error("[NOTIFICATIONS] Exception in sendTradeNotification:", err);
    return { ok: false, error: "Failed to send notification" };
  }
}
