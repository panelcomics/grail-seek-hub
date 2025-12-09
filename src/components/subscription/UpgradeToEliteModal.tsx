import { useNavigate } from "react-router-dom";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Crown, Zap, Search, TrendingUp, Bookmark, Shield } from "lucide-react";

interface UpgradeToEliteModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  feature?: string;
  currentCount?: number;
  limit?: number;
}

export function UpgradeToEliteModal({
  open,
  onOpenChange,
  feature,
  currentCount,
  limit,
}: UpgradeToEliteModalProps) {
  const navigate = useNavigate();

  const handleUpgrade = () => {
    onOpenChange(false);
    navigate("/plans");
  };

  const getLimitMessage = () => {
    if (feature && currentCount !== undefined && limit !== undefined) {
      return `You've reached your limit of ${limit} ${feature}. Elite members get unlimited access!`;
    }
    return "Upgrade to Elite for unlimited access to premium features.";
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2 mb-2">
            <Crown className="h-6 w-6 text-yellow-500" />
            <DialogTitle className="text-xl">Upgrade to Elite</DialogTitle>
          </div>
          <DialogDescription className="text-base">
            {getLimitMessage()}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <Search className="h-5 w-5 text-primary mt-0.5" />
              <div>
                <p className="font-medium">Unlimited Saved Searches</p>
                <p className="text-sm text-muted-foreground">
                  Save as many search filters as you need
                </p>
              </div>
            </div>
            
            <div className="flex items-start gap-3">
              <Bookmark className="h-5 w-5 text-primary mt-0.5" />
              <div>
                <p className="font-medium">Expanded Watchlist</p>
                <p className="text-sm text-muted-foreground">
                  Track up to 500 listings (vs. 50 for free)
                </p>
              </div>
            </div>
            
            <div className="flex items-start gap-3">
              <Zap className="h-5 w-5 text-primary mt-0.5" />
              <div>
                <p className="font-medium">Deal Finder Alerts</p>
                <p className="text-sm text-muted-foreground">
                  Get notified when undervalued comics match your searches
                </p>
              </div>
            </div>
            
            <div className="flex items-start gap-3">
              <TrendingUp className="h-5 w-5 text-primary mt-0.5" />
              <div>
                <p className="font-medium">Early Access to AI Tools</p>
                <p className="text-sm text-muted-foreground">
                  Portfolio tracking, trending comics, and more
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-center gap-2 py-2">
            <span className="text-3xl font-bold">$9.99</span>
            <span className="text-muted-foreground">/month</span>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <Button onClick={handleUpgrade} className="w-full gap-2">
            <Crown className="h-4 w-4" />
            Upgrade Now
          </Button>
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            className="w-full"
          >
            Maybe Later
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
