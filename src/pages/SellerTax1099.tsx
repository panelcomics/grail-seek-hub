/**
 * Seller Tax & 1099 Information Page
 * VIEW + COLLECT ONLY - No filing or IRS integration
 */

import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ChevronLeft, FileText, Loader2 } from "lucide-react";
import { useMarketplaceRails } from "@/hooks/useMarketplaceRails";
import { Card, CardContent } from "@/components/ui/card";
import { Tax1099StatusCard } from "@/components/tax/Tax1099StatusCard";
import { TaxEarningsSummary } from "@/components/tax/TaxEarningsSummary";
import { TaxProfileForm } from "@/components/tax/TaxProfileForm";
import { TaxCSVDownloads } from "@/components/tax/TaxCSVDownloads";
import { TaxDisclaimer } from "@/components/tax/TaxDisclaimer";
import { useSellerTaxData } from "@/hooks/useSellerTaxData";

export default function SellerTax1099() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { shouldShowTax1099, loading: flagsLoading } = useMarketplaceRails();
  const { taxData, thresholds, taxProfile, loading, saving, saveTaxProfile, get1099Status } = useSellerTaxData();

  if (flagsLoading) {
    return (
      <main className="container mx-auto px-4 py-8 max-w-4xl flex justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </main>
    );
  }

  if (!shouldShowTax1099) {
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
    <main className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="mb-6">
        <Button variant="ghost" onClick={() => navigate("/seller")} className="mb-4">
          <ChevronLeft className="h-4 w-4 mr-1" />
          Back to Dashboard
        </Button>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <FileText className="h-8 w-8" />
          Tax & 1099 Information
        </h1>
        <p className="text-muted-foreground mt-1">
          Track your sales totals and manage your tax reporting information.
        </p>
      </div>

      <div className="space-y-6">
        {/* 1099 Status Overview */}
        <Tax1099StatusCard
          taxYear={taxData.taxYear}
          grossSales={taxData.grossSales}
          transactionCount={taxData.transactionCount}
          status={get1099Status()}
          loading={loading}
        />

        {/* Earnings Summary */}
        <TaxEarningsSummary
          grossSales={taxData.grossSales}
          totalFees={taxData.totalFees}
          netEarnings={taxData.netEarnings}
          loading={loading}
        />

        {/* Tax Profile Form */}
        <TaxProfileForm
          profile={taxProfile}
          onSave={saveTaxProfile}
          saving={saving}
          loading={loading}
        />

        {/* CSV Downloads */}
        <TaxCSVDownloads userId={user.id} taxYear={taxData.taxYear} />

        {/* Disclaimer */}
        <TaxDisclaimer />
      </div>
    </main>
  );
}
