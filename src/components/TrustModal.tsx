import { CheckCircle2, Circle, ShoppingBag, ListPlus, Lock } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";
import { TradeEligibility } from "@/hooks/useTradeEligibility";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useState } from "react";

interface TrustModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  eligibility: TradeEligibility | null;
}

export const TrustModal = ({ open, onOpenChange, eligibility }: TrustModalProps) => {
  const navigate = useNavigate();
  const [verifying, setVerifying] = useState(false);

  const handleVerifyStripe = async () => {
    setVerifying(true);
    try {
      const { data, error } = await supabase.functions.invoke('create-connect-account-link');
      
      if (error) throw error;
      
      if (data?.url) {
        window.open(data.url, '_blank');
        toast.success('Opening Stripe verification...');
      }
    } catch (error: any) {
      console.error('Error creating Stripe link:', error);
      toast.error('Failed to start Stripe verification');
    } finally {
      setVerifying(false);
    }
  };

  if (!eligibility) return null;

  const requirements = [
    {
      met: eligibility.total_completed_tx >= 3,
      label: "3 completed deals",
      value: `${eligibility.total_completed_tx}/3`,
      icon: eligibility.total_completed_tx >= 3 ? CheckCircle2 : Circle
    },
    {
      met: eligibility.stripe_account_verified,
      label: "Stripe account verified",
      value: eligibility.stripe_account_verified ? "Verified" : "Not verified",
      icon: eligibility.stripe_account_verified ? CheckCircle2 : Circle
    },
    {
      met: eligibility.account_age_days >= 7,
      label: "Account age ≥ 7 days",
      value: `${eligibility.account_age_days} days`,
      icon: eligibility.account_age_days >= 7 ? CheckCircle2 : Circle
    },
    {
      met: eligibility.no_open_disputes_last_30d,
      label: "No open disputes",
      value: eligibility.no_open_disputes_last_30d ? "OK" : "Resolve disputes",
      icon: eligibility.no_open_disputes_last_30d ? CheckCircle2 : Circle
    }
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Lock className="h-5 w-5" />
            Trading Requirements
          </DialogTitle>
          <DialogDescription>
            We keep trading safe by requiring a little history first. Complete a few deals, verify your account, and you'll unlock full trading access.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {eligibility.trade_override_allow && (
            <Badge variant="default" className="w-full justify-center py-2">
              Admin-Verified
            </Badge>
          )}

          {/* Success message when trading is unlocked */}
          {(eligibility.trade_override_allow || 
            (eligibility.total_completed_tx >= 3 && 
             eligibility.stripe_account_verified && 
             eligibility.account_age_days >= 7 && 
             eligibility.no_open_disputes_last_30d)) && (
            <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/20">
              <p className="text-center font-medium">
                🎉 Congrats! You've unlocked trading. You can now securely swap collectibles with other verified members.
              </p>
            </div>
          )}

          <div className="space-y-3">
            {requirements.map((req, index) => {
              const Icon = req.icon;
              return (
                <div
                  key={index}
                  className={`flex items-center gap-3 p-3 rounded-lg border ${
                    req.met ? 'border-green-500/20 bg-green-500/5' : 'border-border'
                  }`}
                >
                  <Icon className={`h-5 w-5 ${req.met ? 'text-green-500' : 'text-muted-foreground'}`} />
                  <div className="flex-1">
                    <p className="font-medium">
                      ☑ {req.label} — <span className="text-muted-foreground">{req.value}</span>
                    </p>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Encouragement message when trading is locked */}
          {!(eligibility.trade_override_allow || 
            (eligibility.total_completed_tx >= 3 && 
             eligibility.stripe_account_verified && 
             eligibility.account_age_days >= 7 && 
             eligibility.no_open_disputes_last_30d)) && (
            <div className="p-4 rounded-lg bg-muted border">
              <p className="text-sm text-center">
                Need a boost? Keep buying and selling through Grail Seeker to reach trusted status faster. Every completed deal gets you closer.
              </p>
            </div>
          )}

          {!eligibility.stripe_account_verified && (
            <Button
              variant="destructive"
              className="w-full"
              onClick={handleVerifyStripe}
              disabled={verifying}
            >
              {verifying ? 'Opening...' : 'Verify with Stripe'}
            </Button>
          )}

          <div className="flex gap-2">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => {
                navigate('/');
                onOpenChange(false);
              }}
            >
              <ShoppingBag className="h-4 w-4 mr-2" />
              Keep buying
            </Button>
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => {
                navigate('/sell/claim-sale');
                onOpenChange(false);
              }}
            >
              <ListPlus className="h-4 w-4 mr-2" />
              List an item
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
