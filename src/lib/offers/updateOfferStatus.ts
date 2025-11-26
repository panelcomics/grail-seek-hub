import { supabase } from "@/integrations/supabase/client";

export type OfferStatus = "accepted" | "declined";

interface UpdateOfferResult {
  ok: boolean;
  error?: string;
  status?: string;
}

export async function updateOfferStatus(
  offerId: string,
  newStatus: OfferStatus
): Promise<UpdateOfferResult> {
  try {
    console.log(`[OFFERS] Updating offer ${offerId} to ${newStatus}`);

    const { data, error } = await supabase.rpc("update_offer_status", {
      offer_id_param: offerId,
      new_status_param: newStatus,
    });

    if (error) {
      console.error("[OFFERS] Error updating offer status:", error);
      return { ok: false, error: error.message };
    }

    // Type cast the JSONB response
    const result = data as { ok: boolean; error?: string; status?: string } | null;

    if (!result || !result.ok) {
      console.error("[OFFERS] RPC returned failure:", result);
      return { ok: false, error: result?.error || "Unknown error" };
    }

    console.log("[OFFERS] Offer status updated successfully:", result);
    return { ok: true, status: result.status };
  } catch (err) {
    console.error("[OFFERS] Exception in updateOfferStatus:", err);
    return { ok: false, error: "Failed to update offer status" };
  }
}
