import { supabase } from "@/integrations/supabase/client";

interface PostTradeMessageParams {
  tradeId: string;
  senderId: string;
  message: string;
}

interface PostTradeMessageResult {
  ok: boolean;
  error?: string;
}

export async function postTradeMessage({
  tradeId,
  senderId,
  message,
}: PostTradeMessageParams): Promise<PostTradeMessageResult> {
  try {
    console.log("[TRADE-CHAT] Posting message to trade:", tradeId);

    if (!message.trim()) {
      return { ok: false, error: "Message cannot be empty" };
    }

    const { error } = await supabase
      .from("trade_messages")
      .insert({
        trade_id: tradeId,
        sender_id: senderId,
        message: message.trim(),
      });

    if (error) {
      console.error("[TRADE-CHAT] Error posting message:", error);
      return { ok: false, error: error.message };
    }

    console.log("[TRADE-CHAT] Message posted successfully");
    return { ok: true };
  } catch (err) {
    console.error("[TRADE-CHAT] Exception in postTradeMessage:", err);
    return { ok: false, error: "Failed to send message" };
  }
}
