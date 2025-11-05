import { Alert, AlertDescription } from "@/components/ui/alert";
import { Lock } from "lucide-react";

export const ArtSafetyBanner = () => {
  return (
    <Alert className="bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800">
      <Lock className="h-4 w-4 text-blue-600 dark:text-blue-400" />
      <AlertDescription className="text-blue-900 dark:text-blue-100">
        <strong>Safety Tip:</strong> Only verified sellers can list in Original Art. Always request COA documentation for high-value pieces.
      </AlertDescription>
    </Alert>
  );
};
