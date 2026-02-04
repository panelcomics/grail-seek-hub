/**
 * Tax Disclaimer Component
 * MANDATORY disclaimer for legal compliance
 */

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertTriangle } from "lucide-react";

export function TaxDisclaimer() {
  return (
    <Alert className="border-amber-300 bg-amber-50 dark:bg-amber-950/30">
      <AlertTriangle className="h-5 w-5 text-amber-600" />
      <AlertTitle className="text-amber-800 dark:text-amber-200">Important Tax Notice</AlertTitle>
      <AlertDescription className="text-amber-700 dark:text-amber-300 mt-2">
        <p className="font-medium mb-2">
          GrailSeeker does not provide tax advice and does not file tax forms on your behalf at this time.
        </p>
        <p>
          This information is provided for reporting and record-keeping purposes only. 
          Please consult a qualified tax professional regarding your tax obligations.
        </p>
      </AlertDescription>
    </Alert>
  );
}
