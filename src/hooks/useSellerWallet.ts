import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface WalletSummary {
  pending_cents: number;
  available_cents: number;
  on_hold_cents: number;
  updated_at: string;
}

export interface LedgerEntry {
  id: string;
  order_id: string | null;
  entry_type: string;
  amount_cents: number;
  currency: string;
  description: string | null;
  created_at: string;
}

export interface PayoutRequest {
  id: string;
  amount_cents: number;
  status: string;
  note: string | null;
  created_at: string;
}

export function useSellerWallet() {
  const { user } = useAuth();
  const [summary, setSummary] = useState<WalletSummary | null>(null);
  const [ledger, setLedger] = useState<LedgerEntry[]>([]);
  const [payoutRequests, setPayoutRequests] = useState<PayoutRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchWalletData = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Fetch wallet summary
      const { data: summaryData, error: summaryError } = await supabase
        .from("seller_wallet_summary")
        .select("*")
        .eq("seller_id", user.id)
        .maybeSingle();

      if (summaryError && summaryError.code !== "PGRST116") {
        throw summaryError;
      }

      // If no summary exists, compute from ledger or default to zeros
      if (summaryData) {
        setSummary(summaryData);
      } else {
        // Compute from ledger entries
        const computed = await computeWalletFromLedger(user.id);
        setSummary(computed);
      }

      // Fetch recent ledger entries
      const { data: ledgerData, error: ledgerError } = await supabase
        .from("seller_balance_ledger")
        .select("*")
        .eq("seller_id", user.id)
        .order("created_at", { ascending: false })
        .limit(50);

      if (ledgerError) throw ledgerError;
      setLedger(ledgerData || []);

      // Fetch payout requests
      const { data: payoutData, error: payoutError } = await supabase
        .from("payout_requests")
        .select("*")
        .eq("seller_id", user.id)
        .order("created_at", { ascending: false })
        .limit(20);

      if (payoutError) throw payoutError;
      setPayoutRequests(payoutData || []);

    } catch (err: any) {
      console.error("[useSellerWallet] Error:", err);
      setError(err.message || "Failed to load wallet data");
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchWalletData();
  }, [fetchWalletData]);

  // Compute wallet summary from ledger entries
  const computeWalletFromLedger = async (sellerId: string): Promise<WalletSummary> => {
    // Also compute from completed orders if no ledger entries
    const { data: orders } = await supabase
      .from("orders")
      .select("amount_cents, payment_status, status")
      .eq("seller_id", sellerId)
      .or("payment_status.eq.paid,status.eq.paid");

    let pendingCents = 0;
    let availableCents = 0;
    
    // Simple estimation: orders marked as paid but not yet delivered = pending
    // In reality, this would be more sophisticated
    orders?.forEach(order => {
      const isPaid = order.payment_status === "paid" || order.status === "paid";
      if (isPaid) {
        // Apply rough 6.5% fee estimation
        const netAmount = Math.round(order.amount_cents * 0.935);
        pendingCents += netAmount;
      }
    });

    return {
      pending_cents: pendingCents,
      available_cents: availableCents,
      on_hold_cents: 0,
      updated_at: new Date().toISOString(),
    };
  };

  const requestPayout = async (amountCents: number, note?: string): Promise<{ success: boolean; error?: string }> => {
    if (!user) return { success: false, error: "Not authenticated" };

    if (!summary || amountCents > summary.available_cents) {
      return { success: false, error: "Insufficient available balance" };
    }

    try {
      const { error } = await supabase
        .from("payout_requests")
        .insert({
          seller_id: user.id,
          amount_cents: amountCents,
          status: "requested",
          note: note || null,
        });

      if (error) throw error;

      // Refresh data
      await fetchWalletData();
      return { success: true };
    } catch (err: any) {
      console.error("[useSellerWallet] Payout request error:", err);
      return { success: false, error: err.message };
    }
  };

  return {
    summary,
    ledger,
    payoutRequests,
    loading,
    error,
    refetch: fetchWalletData,
    requestPayout,
  };
}
