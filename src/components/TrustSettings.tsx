import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Circle, Lock } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useTradeEligibility } from "@/hooks/useTradeEligibility";
import { TrustModal } from "./TrustModal";
import { useState } from "react";

export const TrustSettings = () => {
  const { user } = useAuth();
  const { eligibility, canTrade, loading } = useTradeEligibility(user?.id);
  const [modalOpen, setModalOpen] = useState(false);

  if (loading || !eligibility) {
    return null;
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lock className="h-5 w-5" />
            Unlock Trading on Grail Seeker
          </CardTitle>
          <CardDescription>
            {canTrade 
              ? "You're all set to trade!" 
              : "Complete these requirements to unlock trading"}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <div className={`flex items-center gap-3 p-3 rounded-lg border ${
              eligibility.total_completed_tx >= 3 ? 'border-green-500/20 bg-green-500/5' : 'border-border'
            }`}>
              {eligibility.total_completed_tx >= 3 ? (
                <CheckCircle2 className="h-5 w-5 text-green-500" />
              ) : (
                <Circle className="h-5 w-5 text-muted-foreground" />
              )}
              <div className="flex-1">
                <p className="font-medium">3 completed deals</p>
                <p className="text-sm text-muted-foreground">{eligibility.total_completed_tx}/3</p>
              </div>
            </div>

            <div className={`flex items-center gap-3 p-3 rounded-lg border ${
              eligibility.stripe_account_verified ? 'border-green-500/20 bg-green-500/5' : 'border-border'
            }`}>
              {eligibility.stripe_account_verified ? (
                <CheckCircle2 className="h-5 w-5 text-green-500" />
              ) : (
                <Circle className="h-5 w-5 text-muted-foreground" />
              )}
              <div className="flex-1">
                <p className="font-medium">Stripe account verified</p>
                <p className="text-sm text-muted-foreground">
                  {eligibility.stripe_account_verified ? "Verified" : "Not verified"}
                </p>
              </div>
            </div>

            <div className={`flex items-center gap-3 p-3 rounded-lg border ${
              eligibility.account_age_days >= 7 ? 'border-green-500/20 bg-green-500/5' : 'border-border'
            }`}>
              {eligibility.account_age_days >= 7 ? (
                <CheckCircle2 className="h-5 w-5 text-green-500" />
              ) : (
                <Circle className="h-5 w-5 text-muted-foreground" />
              )}
              <div className="flex-1">
                <p className="font-medium">Account age ≥ 7 days</p>
                <p className="text-sm text-muted-foreground">{eligibility.account_age_days} days</p>
              </div>
            </div>

            <div className={`flex items-center gap-3 p-3 rounded-lg border ${
              eligibility.no_open_disputes_last_30d ? 'border-green-500/20 bg-green-500/5' : 'border-border'
            }`}>
              {eligibility.no_open_disputes_last_30d ? (
                <CheckCircle2 className="h-5 w-5 text-green-500" />
              ) : (
                <Circle className="h-5 w-5 text-muted-foreground" />
              )}
              <div className="flex-1">
                <p className="font-medium">No open disputes</p>
                <p className="text-sm text-muted-foreground">
                  {eligibility.no_open_disputes_last_30d ? "OK" : "Resolve disputes"}
                </p>
              </div>
            </div>
          </div>

          <Button 
            onClick={() => setModalOpen(true)}
            className="w-full"
            variant={canTrade ? "outline" : "default"}
          >
            {canTrade ? "View Details" : "See Requirements"}
          </Button>
        </CardContent>
      </Card>

      <TrustModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        eligibility={eligibility}
      />
    </>
  );
};
