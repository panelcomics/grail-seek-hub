/**
 * Tax Earnings Summary Card
 * Shows gross sales, fees, and net earnings for tax reporting
 */

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { DollarSign } from "lucide-react";

interface TaxEarningsSummaryProps {
  grossSales: number;
  totalFees: number;
  netEarnings: number;
  loading?: boolean;
}

export function TaxEarningsSummary({
  grossSales,
  totalFees,
  netEarnings,
  loading,
}: TaxEarningsSummaryProps) {
  if (loading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-36" />
          <Skeleton className="h-4 w-72" />
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4">
            <Skeleton className="h-16" />
            <Skeleton className="h-16" />
            <Skeleton className="h-16" />
          </div>
        </CardContent>
      </Card>
    );
  }

  const formatCurrency = (amount: number) =>
    amount.toLocaleString("en-US", { style: "currency", currency: "USD" });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <DollarSign className="h-5 w-5" />
          Sales Summary
        </CardTitle>
        <CardDescription>
          These totals reflect your gross sales before fees and refunds. This information is commonly used for tax reporting purposes.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 rounded-lg bg-muted/50 text-center">
            <p className="text-sm text-muted-foreground mb-1">Gross Sales</p>
            <p className="text-2xl font-bold text-green-600">{formatCurrency(grossSales)}</p>
          </div>
          <div className="p-4 rounded-lg bg-muted/50 text-center">
            <p className="text-sm text-muted-foreground mb-1">Platform Fees</p>
            <p className="text-2xl font-bold text-red-600">-{formatCurrency(totalFees)}</p>
          </div>
          <div className="p-4 rounded-lg bg-muted/50 text-center">
            <p className="text-sm text-muted-foreground mb-1">Net Earnings</p>
            <p className="text-2xl font-bold">{formatCurrency(netEarnings)}</p>
          </div>
        </div>

        {grossSales === 0 && (
          <p className="text-sm text-muted-foreground text-center mt-4">
            You haven't had any sales yet. This section will update automatically as you begin selling.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
