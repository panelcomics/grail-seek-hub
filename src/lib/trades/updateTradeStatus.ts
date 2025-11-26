import { supabase } from "@/integrations/supabase/client";

export type TradeStatus = "approved" | "declined";

interface UpdateTradeResult {
  ok: boolean;
  error?: string;
  status?: string;
}

export async function updateTradeStatus(
  tradeId: string,
  newStatus: TradeStatus
): Promise<UpdateTradeResult> {
  try {
    console.log(`[TRADES] Updating trade ${tradeId} to ${newStatus}`);

    const { data, error } = await supabase.rpc("update_trade_status", {
      trade_id_param: tradeId,
      new_status_param: newStatus,
    });

    if (error) {
      console.error("[TRADES] Error updating trade status:", error);
      return { ok: false, error: error.message };
    }

    // Type cast the JSONB response
    const result = data as { ok: boolean; error?: string; status?: string } | null;

    if (!result || !result.ok) {
      console.error("[TRADES] RPC returned failure:", result);
      return { ok: false, error: result?.error || "Unknown error" };
    }

    console.log("[TRADES] Trade status updated successfully:", result);
    return { ok: true, status: result.status };
  } catch (err) {
    console.error("[TRADES] Exception in updateTradeStatus:", err);
    return { ok: false, error: "Failed to update trade status" };
  }
}
