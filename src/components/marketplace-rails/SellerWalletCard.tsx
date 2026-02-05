import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { 
  Wallet, 
  Clock, 
  CheckCircle2, 
  AlertTriangle, 
  ArrowDownToLine,
  HelpCircle,
  Loader2
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useSellerWallet, WalletSummary } from "@/hooks/useSellerWallet";
import { formatCents } from "@/lib/fees";
import { toast } from "sonner";
import { useMarketplaceRails } from "@/hooks/useMarketplaceRails";

interface BalanceItemProps {
  label: string;
  amountCents: number;
  icon: React.ReactNode;
  tooltip: string;
  variant?: "default" | "success" | "warning";
}

function BalanceItem({ label, amountCents, icon, tooltip, variant = "default" }: BalanceItemProps) {
  const variantStyles = {
    default: "text-foreground",
    success: "text-green-600 dark:text-green-400",
    warning: "text-amber-600 dark:text-amber-400",
  };

  return (
    <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-full bg-background">
          {icon}
        </div>
        <div>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex items-center gap-1">
                  <span className="font-medium">{label}</span>
                  <HelpCircle className="h-3 w-3 text-muted-foreground" />
                </div>
              </TooltipTrigger>
              <TooltipContent side="top" className="max-w-[250px]">
                <p className="text-sm">{tooltip}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>
      <span className={`text-xl font-bold ${variantStyles[variant]}`}>
        {formatCents(amountCents)}
      </span>
    </div>
  );
}

export function SellerWalletCard() {
  const { summary, loading, error, requestPayout, refetch } = useSellerWallet();
  const [payoutOpen, setPayoutOpen] = useState(false);
  const [payoutAmount, setPayoutAmount] = useState("");
  const [payoutNote, setPayoutNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const { shouldShowWalletUiEnhancements } = useMarketplaceRails();

  const handleRequestPayout = async () => {
    const amountDollars = parseFloat(payoutAmount);
    if (isNaN(amountDollars) || amountDollars <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }

    const amountCents = Math.round(amountDollars * 100);
    setSubmitting(true);

    const result = await requestPayout(amountCents, payoutNote);

    if (result.success) {
      toast.success("Payout request submitted!");
      setPayoutOpen(false);
      setPayoutAmount("");
      setPayoutNote("");
    } else {
      toast.error(result.error || "Failed to request payout");
    }

    setSubmitting(false);
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wallet className="h-5 w-5" />
            Seller Wallet
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            <div className="h-16 bg-muted rounded-lg" />
            <div className="h-16 bg-muted rounded-lg" />
            <div className="h-16 bg-muted rounded-lg" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wallet className="h-5 w-5" />
            Seller Wallet
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4">
            <p className="text-sm text-muted-foreground">{error}</p>
            <Button variant="outline" size="sm" onClick={refetch} className="mt-2">
              Retry
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  const walletData: WalletSummary = summary || {
    pending_cents: 0,
    available_cents: 0,
    on_hold_cents: 0,
    updated_at: new Date().toISOString(),
  };

  // Determine why payout button might be disabled
  const getPayoutDisabledReason = (): string | null => {
    if (!summary) return "Wallet data loading...";
    if (walletData.available_cents <= 0 && walletData.pending_cents <= 0 && walletData.on_hold_cents <= 0) {
      return "Payouts unlock after your first completed sale";
    }
    if (walletData.available_cents <= 0 && walletData.pending_cents > 0) {
      return "Pending funds must clear hold period";
    }
    if (walletData.available_cents <= 0 && walletData.on_hold_cents > 0) {
      return "Funds currently on hold for verification";
    }
    if (walletData.available_cents <= 0) {
      return "No available balance for payout";
    }
    return null;
  };

  const payoutDisabledReason = getPayoutDisabledReason();
  const isPayoutDisabled = walletData.available_cents <= 0;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Wallet className="h-5 w-5" />
              Seller Wallet
            </CardTitle>
            <CardDescription className="mt-1">
              Track your earnings and request payouts
            </CardDescription>
          </div>
          <div className="flex flex-col items-end gap-1">
            <Dialog open={payoutOpen} onOpenChange={setPayoutOpen}>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span>
                      <DialogTrigger asChild>
                        <Button 
                          size="sm" 
                          disabled={isPayoutDisabled}
                        >
                          <ArrowDownToLine className="h-4 w-4 mr-2" />
                          Request Payout
                        </Button>
                      </DialogTrigger>
                    </span>
                  </TooltipTrigger>
                  {shouldShowWalletUiEnhancements && isPayoutDisabled && payoutDisabledReason && (
                    <TooltipContent side="bottom" className="max-w-[250px]">
                      <p className="text-sm">{payoutDisabledReason}</p>
                    </TooltipContent>
                  )}
                </Tooltip>
              </TooltipProvider>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Request Payout</DialogTitle>
                <DialogDescription>
                  Request a payout from your available balance. Processing typically takes 3-5 business days.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="p-3 bg-muted rounded-lg">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Available Balance</span>
                    <span className="font-bold text-green-600">
                      {formatCents(walletData.available_cents)}
                    </span>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="amount">Amount ($)</Label>
                  <Input
                    id="amount"
                    type="number"
                    step="0.01"
                    min="0"
                    max={walletData.available_cents / 100}
                    placeholder="0.00"
                    value={payoutAmount}
                    onChange={(e) => setPayoutAmount(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="note">Note (optional)</Label>
                  <Textarea
                    id="note"
                    placeholder="Any special instructions..."
                    value={payoutNote}
                    onChange={(e) => setPayoutNote(e.target.value)}
                    rows={2}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setPayoutOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleRequestPayout} disabled={submitting}>
                  {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Submit Request
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
            {/* How Payouts Work tooltip - gated */}
            {shouldShowWalletUiEnhancements && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-6 px-2 text-xs text-muted-foreground">
                      <HelpCircle className="h-3 w-3 mr-1" />
                      How payouts work
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="max-w-[300px]">
                    <div className="space-y-2 text-sm">
                      <p><strong>Pending:</strong> Buyer paid, waiting for delivery confirmation.</p>
                      <p><strong>Available:</strong> Cleared funds ready for payout.</p>
                      <p><strong>On Hold:</strong> Funds held for verification (typically 7 days for new sellers or high-value orders).</p>
                      <p className="text-xs text-muted-foreground mt-2">Payouts typically process in 3-5 business days via Stripe.</p>
                    </div>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <BalanceItem
          label="Pending"
          amountCents={walletData.pending_cents}
          icon={<Clock className="h-5 w-5 text-muted-foreground" />}
          tooltip="Buyer paid, waiting on delivery confirmation before funds become available."
        />
        <BalanceItem
          label="Available"
          amountCents={walletData.available_cents}
          icon={<CheckCircle2 className="h-5 w-5 text-green-600" />}
          tooltip="Cleared funds you can request payout for."
          variant="success"
        />
        <BalanceItem
          label="On Hold"
          amountCents={walletData.on_hold_cents}
          icon={<AlertTriangle className="h-5 w-5 text-amber-600" />}
          tooltip="Funds held for verification or dispute protection."
          variant="warning"
        />
      </CardContent>
    </Card>
  );
}
