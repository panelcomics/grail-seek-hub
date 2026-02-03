/**
 * BASELANE ADMIN TOOLS
 * ==========================================================================
 * Admin-only tools for backfilling wallet/timeline data.
 * These are idempotent and safe to run multiple times.
 * ==========================================================================
 */

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { 
  Wrench, 
  RefreshCw, 
  Database, 
  Clock, 
  Wallet, 
  AlertTriangle,
  CheckCircle2
} from "lucide-react";

interface SyncResult {
  success: boolean;
  message: string;
  count?: number;
}

export function BaselaneAdminTools() {
  const { user } = useAuth();
  const [running, setRunning] = useState<string | null>(null);
  const [results, setResults] = useState<Record<string, SyncResult>>({});
  const [sellerId, setSellerId] = useState("");

  /**
   * Sync Wallet From Completed Orders
   * Creates ledger entries for completed orders that don't have them yet
   */
  const syncWalletFromOrders = async (targetSellerId?: string) => {
    setRunning("wallet-sync");
    try {
      // Get completed orders that don't have ledger entries
      let query = supabase
        .from("orders")
        .select("id, seller_id, amount_cents, created_at")
        .or("status.eq.completed,payment_status.eq.paid");

      if (targetSellerId) {
        query = query.eq("seller_id", targetSellerId);
      }

      const { data: orders, error: ordersError } = await query;
      if (ordersError) throw ordersError;

      if (!orders || orders.length === 0) {
        setResults((prev) => ({
          ...prev,
          "wallet-sync": { success: true, message: "No orders to sync", count: 0 },
        }));
        return;
      }

      // Get existing ledger entries to avoid duplicates
      const orderIds = orders.map((o) => o.id);
      const { data: existingEntries } = await supabase
        .from("seller_balance_ledger")
        .select("order_id, entry_type")
        .in("order_id", orderIds);

      const existingSet = new Set(
        existingEntries?.map((e) => `${e.order_id}-${e.entry_type}`) || []
      );

      // Create ledger entries for orders without them
      let createdCount = 0;
      for (const order of orders) {
        const creditKey = `${order.id}-available_credit`;
        const feeKey = `${order.id}-fee`;

        if (!existingSet.has(creditKey)) {
          // Calculate fee (6.5% intro rate)
          const feeCents = Math.round((order.amount_cents || 0) * 0.065);
          const netCents = (order.amount_cents || 0) - feeCents;

          // Insert available credit
          await supabase.from("seller_balance_ledger").insert({
            seller_id: order.seller_id,
            order_id: order.id,
            entry_type: "available_credit",
            amount_cents: netCents,
            currency: "USD",
            description: `Order ${order.id.slice(0, 8)} - Net payout`,
          });
          createdCount++;
        }

        if (!existingSet.has(feeKey)) {
          const feeCents = Math.round((order.amount_cents || 0) * 0.065);
          
          // Insert fee entry
          await supabase.from("seller_balance_ledger").insert({
            seller_id: order.seller_id,
            order_id: order.id,
            entry_type: "fee",
            amount_cents: feeCents,
            currency: "USD",
            description: `Order ${order.id.slice(0, 8)} - Platform fee (6.5%)`,
          });
        }
      }

      // Now recalculate wallet summaries for affected sellers
      const sellerIds = [...new Set(orders.map((o) => o.seller_id))];
      for (const sid of sellerIds) {
        await recalculateSellerWallet(sid);
      }

      setResults((prev) => ({
        ...prev,
        "wallet-sync": {
          success: true,
          message: `Synced ${createdCount} orders to ledger`,
          count: createdCount,
        },
      }));
      toast.success(`Wallet sync complete: ${createdCount} entries created`);
    } catch (error: any) {
      console.error("[ADMIN_TOOLS] Wallet sync error:", error);
      setResults((prev) => ({
        ...prev,
        "wallet-sync": { success: false, message: error.message },
      }));
      toast.error("Wallet sync failed");
    } finally {
      setRunning(null);
    }
  };

  /**
   * Recalculate Seller Wallet Summary
   * Sums ledger entries by type and updates the summary table
   */
  const recalculateSellerWallet = async (targetSellerId: string) => {
    // Get all ledger entries for this seller
    const { data: entries, error } = await supabase
      .from("seller_balance_ledger")
      .select("entry_type, amount_cents")
      .eq("seller_id", targetSellerId);

    if (error) throw error;

    // Sum by entry type
    let pendingCents = 0;
    let availableCents = 0;
    let onHoldCents = 0;

    entries?.forEach((e) => {
      switch (e.entry_type) {
        case "pending_credit":
          pendingCents += e.amount_cents || 0;
          break;
        case "available_credit":
          availableCents += e.amount_cents || 0;
          break;
        case "hold":
          onHoldCents += e.amount_cents || 0;
          break;
        case "release_hold":
          onHoldCents -= e.amount_cents || 0;
          break;
        case "payout":
          availableCents -= e.amount_cents || 0;
          break;
        case "fee":
          // Fees are already deducted from credit entries
          break;
      }
    });

    // Upsert wallet summary
    const { error: upsertError } = await supabase
      .from("seller_wallet_summary")
      .upsert(
        {
          seller_id: targetSellerId,
          pending_cents: Math.max(0, pendingCents),
          available_cents: Math.max(0, availableCents),
          on_hold_cents: Math.max(0, onHoldCents),
          updated_at: new Date().toISOString(),
        },
        { onConflict: "seller_id" }
      );

    if (upsertError) throw upsertError;
  };

  /**
   * Recalculate single seller's wallet
   */
  const recalculateSingleWallet = async () => {
    if (!sellerId.trim()) {
      toast.error("Please enter a seller ID");
      return;
    }

    setRunning("recalc-single");
    try {
      await recalculateSellerWallet(sellerId.trim());
      setResults((prev) => ({
        ...prev,
        "recalc-single": {
          success: true,
          message: `Wallet recalculated for ${sellerId.slice(0, 8)}...`,
        },
      }));
      toast.success("Wallet recalculated");
    } catch (error: any) {
      console.error("[ADMIN_TOOLS] Recalc error:", error);
      setResults((prev) => ({
        ...prev,
        "recalc-single": { success: false, message: error.message },
      }));
      toast.error("Recalculation failed");
    } finally {
      setRunning(null);
    }
  };

  /**
   * Backfill Order Timeline Events
   * Creates initial events for orders that don't have any
   */
  const backfillTimelineEvents = async () => {
    setRunning("timeline-backfill");
    try {
      // Get orders without any timeline events
      const { data: ordersWithEvents } = await supabase
        .from("order_status_events")
        .select("order_id");

      const orderIdsWithEvents = new Set(ordersWithEvents?.map((e) => e.order_id) || []);

      // Get all orders
      const { data: allOrders, error } = await supabase
        .from("orders")
        .select("id, status, payment_status, created_at, seller_id, buyer_id")
        .order("created_at", { ascending: false })
        .limit(500); // Process in batches

      if (error) throw error;

      // Filter to orders without events
      const ordersToProcess = allOrders?.filter((o) => !orderIdsWithEvents.has(o.id)) || [];

      let createdCount = 0;
      for (const order of ordersToProcess) {
        // Create a "paid" event for orders with payment
        if (order.payment_status === "paid" || order.status === "paid" || order.status === "completed") {
          await supabase.from("order_status_events").insert({
            order_id: order.id,
            actor_user_id: order.buyer_id,
            actor_role: "buyer",
            event_type: "paid",
            event_note: "Backfilled: Order was paid",
            created_at: order.created_at,
          });
          createdCount++;
        }

        // Create "completed" event for completed orders
        if (order.status === "completed") {
          await supabase.from("order_status_events").insert({
            order_id: order.id,
            actor_user_id: null,
            actor_role: "system",
            event_type: "completed",
            event_note: "Backfilled: Order was completed",
          });
          createdCount++;
        }
      }

      setResults((prev) => ({
        ...prev,
        "timeline-backfill": {
          success: true,
          message: `Created ${createdCount} timeline events for ${ordersToProcess.length} orders`,
          count: createdCount,
        },
      }));
      toast.success(`Timeline backfill complete: ${createdCount} events`);
    } catch (error: any) {
      console.error("[ADMIN_TOOLS] Timeline backfill error:", error);
      setResults((prev) => ({
        ...prev,
        "timeline-backfill": { success: false, message: error.message },
      }));
      toast.error("Timeline backfill failed");
    } finally {
      setRunning(null);
    }
  };

  const getResultBadge = (key: string) => {
    const result = results[key];
    if (!result) return null;
    return result.success ? (
      <Badge variant="default" className="ml-2">
        <CheckCircle2 className="h-3 w-3 mr-1" />
        {result.count !== undefined ? `${result.count} processed` : "Done"}
      </Badge>
    ) : (
      <Badge variant="destructive" className="ml-2">
        <AlertTriangle className="h-3 w-3 mr-1" />
        Failed
      </Badge>
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Wrench className="h-5 w-5" />
          Baselane Admin Tools
        </CardTitle>
        <CardDescription>
          Backfill and sync tools for marketplace rails data
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            These tools are idempotent — safe to run multiple times. They will not create duplicate entries.
          </AlertDescription>
        </Alert>

        {/* Wallet Sync */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-medium flex items-center gap-2">
                <Wallet className="h-4 w-4" />
                Sync Wallet From Orders
                {getResultBadge("wallet-sync")}
              </h3>
              <p className="text-sm text-muted-foreground">
                Creates ledger entries for completed orders and recalculates wallet summaries
              </p>
            </div>
            <Button
              onClick={() => syncWalletFromOrders()}
              disabled={running === "wallet-sync"}
              size="sm"
            >
              {running === "wallet-sync" ? (
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Database className="h-4 w-4 mr-2" />
              )}
              Sync All
            </Button>
          </div>
          {results["wallet-sync"]?.message && (
            <p className="text-xs text-muted-foreground ml-6">
              {results["wallet-sync"].message}
            </p>
          )}
        </div>

        <Separator />

        {/* Single Seller Recalc */}
        <div className="space-y-3">
          <h3 className="font-medium flex items-center gap-2">
            <RefreshCw className="h-4 w-4" />
            Recalculate Single Seller Wallet
            {getResultBadge("recalc-single")}
          </h3>
          <p className="text-sm text-muted-foreground">
            Recalculates wallet summary from ledger entries for a specific seller
          </p>
          <div className="flex gap-2">
            <Input
              placeholder="Seller UUID"
              value={sellerId}
              onChange={(e) => setSellerId(e.target.value)}
              className="max-w-xs"
            />
            <Button
              onClick={recalculateSingleWallet}
              disabled={running === "recalc-single"}
              size="sm"
            >
              Recalculate
            </Button>
          </div>
          {results["recalc-single"]?.message && (
            <p className="text-xs text-muted-foreground ml-6">
              {results["recalc-single"].message}
            </p>
          )}
        </div>

        <Separator />

        {/* Timeline Backfill */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-medium flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Backfill Order Timeline Events
                {getResultBadge("timeline-backfill")}
              </h3>
              <p className="text-sm text-muted-foreground">
                Creates initial timeline events for orders that don't have any
              </p>
            </div>
            <Button
              onClick={backfillTimelineEvents}
              disabled={running === "timeline-backfill"}
              size="sm"
            >
              {running === "timeline-backfill" ? (
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Clock className="h-4 w-4 mr-2" />
              )}
              Backfill
            </Button>
          </div>
          {results["timeline-backfill"]?.message && (
            <p className="text-xs text-muted-foreground ml-6">
              {results["timeline-backfill"].message}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
