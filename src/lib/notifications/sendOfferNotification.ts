import { supabase } from "@/integrations/supabase/client";

interface OfferNotificationPayload {
  buyerEmail: string;
  buyerName?: string;
  listingTitle: string;
  offerAmount: number;
  status: string;
}

export async function sendOfferNotification(
  payload: OfferNotificationPayload
): Promise<{ ok: boolean; error?: string }> {
  try {
    console.log("[NOTIFICATIONS] Attempting to send offer notification:", payload);

    const { data, error } = await supabase.functions.invoke("send-offer-email", {
      body: payload,
    });

    if (error) {
      console.error("[NOTIFICATIONS] Error invoking send-offer-email function:", error);
      return { ok: false, error: error.message };
    }

    if (!data?.success) {
      console.log("[NOTIFICATIONS] Email not sent:", data?.reason || "unknown reason");
      return { ok: false, error: data?.reason || "Email sending failed" };
    }

    console.log("[NOTIFICATIONS] Offer notification sent successfully");
    return { ok: true };
  } catch (err) {
    console.error("[NOTIFICATIONS] Exception in sendOfferNotification:", err);
    return { ok: false, error: "Failed to send notification" };
  }
}
