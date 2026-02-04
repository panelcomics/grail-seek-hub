/**
 * Tax CSV Downloads Component
 * Allows sellers to download CSV reports for self-reporting
 */

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface TaxCSVDownloadsProps {
  userId: string;
  taxYear: number;
}

export function TaxCSVDownloads({ userId, taxYear }: TaxCSVDownloadsProps) {
  const [downloading, setDownloading] = useState<string | null>(null);

  const downloadCSV = async (type: "gross" | "fees" | "net") => {
    setDownloading(type);
    try {
      const yearStart = `${taxYear}-01-01`;
      const yearEnd = `${taxYear}-12-31`;

      // Fetch ledger data - using type assertion since table may not be in generated types
      const { data, error } = await supabase
        .from("seller_wallet_ledger" as any)
        .select("created_at, description, amount, fee_amount, entry_type")
        .eq("seller_id", userId)
        .gte("created_at", yearStart)
        .lte("created_at", yearEnd)
        .order("created_at", { ascending: true });

      if (error) throw error;

      let csvContent = "";
      let filename = "";

      if (type === "gross") {
        csvContent = "Date,Description,Gross Amount\n";
        filename = `grailseeker_gross_sales_${taxYear}.csv`;
        (data || []).forEach((row: any) => {
          if (row.entry_type === "sale" || row.entry_type === "payment") {
            const date = new Date(row.created_at).toLocaleDateString();
            const amount = Math.abs(row.amount || 0).toFixed(2);
            csvContent += `"${date}","${row.description || "Sale"}","$${amount}"\n`;
          }
        });
      } else if (type === "fees") {
        csvContent = "Date,Description,Fee Amount\n";
        filename = `grailseeker_fees_${taxYear}.csv`;
        (data || []).forEach((row: any) => {
          if (row.fee_amount && row.fee_amount > 0) {
            const date = new Date(row.created_at).toLocaleDateString();
            const fee = Math.abs(row.fee_amount).toFixed(2);
            csvContent += `"${date}","Platform Fee","$${fee}"\n`;
          }
        });
      } else {
        csvContent = "Date,Description,Gross,Fees,Net\n";
        filename = `grailseeker_net_earnings_${taxYear}.csv`;
        (data || []).forEach((row: any) => {
          if (row.entry_type === "sale" || row.entry_type === "payment") {
            const date = new Date(row.created_at).toLocaleDateString();
            const gross = Math.abs(row.amount || 0);
            const fee = Math.abs(row.fee_amount || 0);
            const net = (gross - fee).toFixed(2);
            csvContent += `"${date}","${row.description || "Sale"}","$${gross.toFixed(2)}","$${fee.toFixed(2)}","$${net}"\n`;
          }
        });
      }

      // If no data, add empty message
      if ((data || []).length === 0) {
        csvContent += "No transactions found for this period\n";
      }

      // Download file
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.setAttribute("download", filename);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(link.href);

      toast.success(`Downloaded ${filename}`);
    } catch (error: any) {
      console.error("[TAX_CSV] Error downloading:", error);
      toast.error(error.message || "Failed to download CSV");
    } finally {
      setDownloading(null);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Download className="h-5 w-5" />
          Download Your Records
        </CardTitle>
        <CardDescription>
          Download detailed CSV reports to share with your accountant or for personal records.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-3">
          <Button
            variant="outline"
            onClick={() => downloadCSV("gross")}
            disabled={downloading !== null}
          >
            {downloading === "gross" ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Download className="h-4 w-4 mr-2" />
            )}
            Download Gross Sales
          </Button>
          <Button
            variant="outline"
            onClick={() => downloadCSV("fees")}
            disabled={downloading !== null}
          >
            {downloading === "fees" ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Download className="h-4 w-4 mr-2" />
            )}
            Download Fees
          </Button>
          <Button
            variant="outline"
            onClick={() => downloadCSV("net")}
            disabled={downloading !== null}
          >
            {downloading === "net" ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Download className="h-4 w-4 mr-2" />
            )}
            Download Net Earnings
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
