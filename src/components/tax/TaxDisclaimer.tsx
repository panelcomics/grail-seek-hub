/**
 * Tax Disclaimer Component
 * MANDATORY disclaimer for legal compliance - with calm, non-threatening copy
 */

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Info } from "lucide-react";

export function TaxDisclaimer() {
  return (
    <Alert className="border-muted bg-muted/30">
      <Info className="h-5 w-5 text-muted-foreground" />
      <AlertTitle className="text-foreground">About Your Tax Information</AlertTitle>
      <AlertDescription className="text-muted-foreground mt-2 space-y-2">
        <p>
          This section helps you track your sales for personal record-keeping. GrailSeeker does not provide tax advice or file forms on your behalf.
        </p>
        <p>
          We may request additional information later if required for reporting. For specific tax questions, please consult a qualified professional.
        </p>
        <p className="text-xs italic">
          This preview is informational only. Reporting rules can change.
        </p>
      </AlertDescription>
    </Alert>
  );
}
