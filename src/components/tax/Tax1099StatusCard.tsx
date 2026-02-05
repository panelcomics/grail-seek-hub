/**
 * 1099-K Status Overview Card
 * READ-ONLY display of current reporting status with calm, non-alarming copy
 */

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { FileText, Info, CheckCircle2 } from "lucide-react";

interface Tax1099StatusCardProps {
  taxYear: number;
  grossSales: number;
  transactionCount: number;
  status: "below" | "may_require";
  loading?: boolean;
}

export function Tax1099StatusCard({
  taxYear,
  grossSales,
  transactionCount,
  status,
  loading,
}: Tax1099StatusCardProps) {
  if (loading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-64" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-20 w-full" />
        </CardContent>
      </Card>
    );
  }

  const isBelowThreshold = status === "below";

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Your 1099 Status (Preview)
            </CardTitle>
            <CardDescription>Tax Year {taxYear}</CardDescription>
          </div>
          <Badge variant={isBelowThreshold ? "secondary" : "default"}>
            {isBelowThreshold ? "Below Threshold" : "May Require 1099-K"}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-start gap-3 p-4 rounded-lg bg-muted/50">
          {isBelowThreshold ? (
            <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5 shrink-0" />
          ) : (
            <Info className="h-5 w-5 text-muted-foreground mt-0.5 shrink-0" />
          )}
          <div>
            <p className="font-medium">
              {isBelowThreshold
                ? "Based on your current activity and IRS guidance, you are below the reporting threshold for this tax year."
                : "Based on your current activity, you may receive a 1099-K form. This is normal for active sellers."}
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              This is an informational preview. Reporting requirements may change. No action needed now.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-muted-foreground">Gross Sales (YTD)</p>
            <p className="text-xl font-semibold">${grossSales.toLocaleString("en-US", { minimumFractionDigits: 2 })}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Transactions</p>
            <p className="text-xl font-semibold">{transactionCount}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
