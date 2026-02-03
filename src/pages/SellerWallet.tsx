import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ChevronLeft, Wallet as WalletIcon, Loader2 } from "lucide-react";
import { SellerWalletCard } from "@/components/marketplace-rails/SellerWalletCard";
import { WalletLedger } from "@/components/marketplace-rails/WalletLedger";
import { PayoutRequestsList } from "@/components/marketplace-rails/PayoutRequestsList";
import { useSellerWallet } from "@/hooks/useSellerWallet";
import { useMarketplaceRails } from "@/hooks/useMarketplaceRails";
import { Card, CardContent } from "@/components/ui/card";

export default function SellerWallet() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { ledger, payoutRequests, loading } = useSellerWallet();
  
  // Check feature flag from database
  const { shouldShowWallet, loading: flagsLoading } = useMarketplaceRails();

  if (flagsLoading) {
    return (
      <main className="container mx-auto px-4 py-8 max-w-4xl flex justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </main>
    );
  }

  if (!shouldShowWallet) {
    return (
      <main className="container mx-auto px-4 py-8 max-w-4xl">
        <Card className="text-center py-12">
          <CardContent>
            <p className="text-muted-foreground">This feature is not currently enabled.</p>
            <Button variant="outline" onClick={() => navigate("/seller")} className="mt-4">
              Back to Dashboard
            </Button>
          </CardContent>
        </Card>
      </main>
    );
  }

  if (!user) {
    navigate("/auth");
    return null;
  }

  return (
    <main className="container mx-auto px-4 py-8 max-w-6xl">
      <div className="mb-6">
        <Button variant="ghost" onClick={() => navigate("/seller")} className="mb-4">
          <ChevronLeft className="h-4 w-4 mr-1" />
          Back to Dashboard
        </Button>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <WalletIcon className="h-8 w-8" />
          Seller Wallet
        </h1>
        <p className="text-muted-foreground mt-1">
          Manage your earnings, track balances, and request payouts
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column - Wallet Summary */}
        <div className="lg:col-span-1 space-y-6">
          <SellerWalletCard />
          <PayoutRequestsList requests={payoutRequests} loading={loading} />
        </div>

        {/* Right column - Ledger */}
        <div className="lg:col-span-2">
          <WalletLedger entries={ledger} loading={loading} />
        </div>
      </div>
    </main>
  );
}
