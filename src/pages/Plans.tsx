import { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Check, Crown, Loader2, Sparkles, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import { useSubscriptionTier } from "@/hooks/useSubscriptionTier";
import { TIER_INFO } from "@/config/subscriptionsConfig";
import { formatSubscriptionExpiry } from "@/lib/subscription";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { EliteBadge } from "@/components/subscription/EliteBadge";

export default function Plans() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { tier, isElite, loading: tierLoading, expiresAt, refresh } = useSubscriptionTier();
  const [upgrading, setUpgrading] = useState(false);
  const [managingSubscription, setManagingSubscription] = useState(false);

  // Handle success/cancel from Stripe redirect
  useEffect(() => {
    const success = searchParams.get('success');
    const canceled = searchParams.get('canceled');

    if (success === 'true') {
      toast.success("You're all set — Elite is active! Welcome to the club.");
      refresh();
      // Clean up URL
      navigate('/plans', { replace: true });
    } else if (canceled === 'true') {
      toast.info("No worries — you can upgrade anytime.");
      navigate('/plans', { replace: true });
    }
  }, [searchParams, navigate, refresh]);

  const handleUpgrade = async () => {
    if (!user) {
      toast.error('Please sign in to upgrade');
      navigate('/auth');
      return;
    }

    setUpgrading(true);
    try {
      const { data, error } = await supabase.functions.invoke('create-subscription-checkout', {
        body: { tier: 'elite' },
      });

      if (error) throw error;

      if (data?.url) {
        // Open in new tab to escape iframe
        window.open(data.url, '_blank');
      } else {
        throw new Error('No checkout URL returned');
      }
    } catch (err) {
      console.error('[PLANS] Upgrade error:', err);
      toast.error("Something went wrong. Please try again.");
    } finally {
      setUpgrading(false);
    }
  };

  const handleManageSubscription = async () => {
    if (!user) return;

    setManagingSubscription(true);
    try {
      const { data, error } = await supabase.functions.invoke('subscription-portal', {});

      if (error) throw error;

      if (data?.url) {
        window.open(data.url, '_blank');
      } else {
        throw new Error('No portal URL returned');
      }
    } catch (err) {
      console.error('[PLANS] Portal error:', err);
      toast.error("Something went wrong. Please try again.");
    } finally {
      setManagingSubscription(false);
    }
  };

  if (tierLoading) {
    return (
      <div className="container max-w-4xl py-12 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="container max-w-4xl py-8 px-4">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold mb-2">Choose Your Plan</h1>
        <p className="text-muted-foreground">
          Unlock premium features to supercharge your comic hunting
        </p>
      </div>

      {isElite && expiresAt && (
        <div className="mb-8 p-4 bg-primary/5 border border-primary/20 rounded-lg text-center">
          <div className="flex items-center justify-center gap-2 mb-1">
            <EliteBadge size="md" />
            <span className="font-medium">You're an Elite member!</span>
          </div>
          <p className="text-sm text-muted-foreground">
            Renews on {formatSubscriptionExpiry(expiresAt)}
          </p>
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-6">
        {/* Free Tier */}
        <Card className={`relative ${tier === 'free' ? 'border-primary' : ''}`}>
          {tier === 'free' && (
            <div className="absolute -top-3 left-1/2 -translate-x-1/2">
              <span className="bg-primary text-primary-foreground text-xs px-3 py-1 rounded-full font-medium">
                Current Plan
              </span>
            </div>
          )}
          <CardHeader className="text-center pb-2">
            <div className="mx-auto mb-2 h-12 w-12 rounded-full bg-muted flex items-center justify-center">
              <Star className="h-6 w-6 text-muted-foreground" />
            </div>
            <CardTitle className="text-2xl">{TIER_INFO.free.name}</CardTitle>
            <CardDescription>{TIER_INFO.free.description}</CardDescription>
          </CardHeader>
          <CardContent className="pb-4">
            <div className="text-center mb-6">
              <span className="text-4xl font-bold">{TIER_INFO.free.priceDisplay}</span>
            </div>
            <ul className="space-y-3">
              {TIER_INFO.free.features.map((feature, i) => (
                <li key={i} className="flex items-start gap-2 text-sm">
                  <Check className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                  <span>{feature}</span>
                </li>
              ))}
            </ul>
          </CardContent>
          <CardFooter>
            <Button variant="outline" className="w-full" disabled>
              {tier === 'free' ? 'Your Current Plan' : 'Free Forever'}
            </Button>
          </CardFooter>
        </Card>

        {/* Elite Tier */}
        <Card className={`relative ${isElite ? 'border-primary' : 'border-amber-500/50'}`}>
          {isElite ? (
            <div className="absolute -top-3 left-1/2 -translate-x-1/2">
              <span className="bg-primary text-primary-foreground text-xs px-3 py-1 rounded-full font-medium">
                Current Plan
              </span>
            </div>
          ) : (
            <div className="absolute -top-3 left-1/2 -translate-x-1/2">
              <span className="bg-gradient-to-r from-amber-500 to-yellow-500 text-white text-xs px-3 py-1 rounded-full font-medium flex items-center gap-1">
                <Sparkles className="h-3 w-3" />
                Recommended
              </span>
            </div>
          )}
          <CardHeader className="text-center pb-2">
            <div className="mx-auto mb-2 h-12 w-12 rounded-full bg-gradient-to-br from-amber-500/20 to-yellow-500/20 flex items-center justify-center">
              <Crown className="h-6 w-6 text-amber-500" />
            </div>
            <CardTitle className="text-2xl">{TIER_INFO.elite.name}</CardTitle>
            <CardDescription>{TIER_INFO.elite.description}</CardDescription>
          </CardHeader>
          <CardContent className="pb-4">
            <div className="text-center mb-6">
              <span className="text-4xl font-bold">${TIER_INFO.elite.price}</span>
              <span className="text-muted-foreground">/month</span>
            </div>
            <ul className="space-y-3">
              {TIER_INFO.elite.features.map((feature, i) => (
                <li key={i} className="flex items-start gap-2 text-sm">
                  <Check className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
                  <span>{feature}</span>
                </li>
              ))}
            </ul>
          </CardContent>
          <CardFooter>
            {isElite ? (
              <Button 
                variant="outline" 
                className="w-full"
                onClick={handleManageSubscription}
                disabled={managingSubscription}
              >
                {managingSubscription ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Opening...
                  </>
                ) : (
                  'Manage Subscription'
                )}
              </Button>
            ) : (
              <Button 
                className="w-full bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 text-white"
                onClick={handleUpgrade}
                disabled={upgrading}
              >
                {upgrading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Starting checkout...
                  </>
                ) : (
                  <>
                    <Crown className="mr-2 h-4 w-4" />
                    Upgrade to Elite
                  </>
                )}
              </Button>
            )}
          </CardFooter>
        </Card>
      </div>

      <div className="mt-8 text-center text-sm text-muted-foreground">
        <p>
          All plans include access to the GrailSeeker marketplace.
          <br />
          Trading eligibility is based on account activity, not subscription tier.
        </p>
      </div>
    </div>
  );
}
