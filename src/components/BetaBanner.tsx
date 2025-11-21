import { Info } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

export const BetaBanner = () => {
  return (
    <Alert className="hidden md:flex rounded-none border-x-0 border-t-0 bg-muted/30 py-2 text-center">
      <div className="flex items-center justify-center gap-2 text-sm">
        <Info className="h-4 w-4 text-muted-foreground" />
        <AlertDescription className="text-muted-foreground">
          <span className="font-semibold text-primary">Beta:</span> GrailSeeker is currently in public beta. Some features, fees, and integrations are still being finalized.
        </AlertDescription>
      </div>
    </Alert>
  );
};
