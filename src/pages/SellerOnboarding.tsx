import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { 
  CheckCircle2, 
  Circle, 
  User, 
  CreditCard, 
  UserCircle, 
  Package, 
  FileText,
  ArrowRight,
  Loader2,
  Store
} from "lucide-react";

interface ChecklistItem {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  done: boolean;
  link?: string;
  linkText?: string;
}

export default function SellerOnboarding() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(true);
  const [displayName, setDisplayName] = useState("");
  const [checklist, setChecklist] = useState<ChecklistItem[]>([]);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      navigate("/auth?redirect=/seller-onboarding");
      return;
    }
    checkSellerStatus();
  }, [user, authLoading]);

  const checkSellerStatus = async () => {
    if (!user) return;

    try {
      // Fetch profile data
      const { data: profile } = await supabase
        .from("profiles")
        .select("username, avatar_url, city, state, postal_code, stripe_account_id, stripe_onboarding_complete, shipping_address")
        .eq("user_id", user.id)
        .single();

      // Check if user has any listings
      const { count: listingCount } = await supabase
        .from("listings")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id);

      // Check if user has any inventory items
      const { count: inventoryCount } = await supabase
        .from("inventory_items")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id);

      const username = profile?.username || user.email?.split("@")[0] || "Seller";
      setDisplayName(username);

      // Build checklist based on actual data
      const hasAccount = true; // They're logged in
      const hasPayoutSetup = !!(profile?.stripe_account_id && profile?.stripe_onboarding_complete);
      const hasProfile = !!(profile?.username && profile?.city && profile?.state);
      const hasListing = (listingCount || 0) > 0 || (inventoryCount || 0) > 0;
      const hasShippingAddress = !!(
        profile?.shipping_address &&
        typeof profile.shipping_address === "object" &&
        (profile.shipping_address as any)?.street1
      );

      setChecklist([
        {
          id: "account",
          title: "Create an account",
          description: "Sign up or log in to GrailSeeker",
          icon: <User className="h-5 w-5" />,
          done: hasAccount,
          link: "/auth",
          linkText: "Sign In",
        },
        {
          id: "payout",
          title: "Connect payout account",
          description: "Set up Stripe to receive payments from sales",
          icon: <CreditCard className="h-5 w-5" />,
          done: hasPayoutSetup,
          link: "/seller-setup",
          linkText: "Set Up Payouts",
        },
        {
          id: "profile",
          title: "Complete your profile",
          description: "Add username, location, and optional avatar",
          icon: <UserCircle className="h-5 w-5" />,
          done: hasProfile,
          link: "/profile",
          linkText: "Edit Profile",
        },
        {
          id: "shipping",
          title: "Add shipping address",
          description: "Enter your ship-from address for labels",
          icon: <Package className="h-5 w-5" />,
          done: hasShippingAddress,
          link: "/seller-setup",
          linkText: "Add Address",
        },
        {
          id: "listing",
          title: "List your first item",
          description: "Add a comic to your inventory and create a listing",
          icon: <Store className="h-5 w-5" />,
          done: hasListing,
          link: "/scanner",
          linkText: "Scan a Comic",
        },
        {
          id: "rules",
          title: "Review seller rules & fees",
          description: "Understand how fees and payouts work",
          icon: <FileText className="h-5 w-5" />,
          done: false, // Always show as available to review
          link: "/seller-rules-fees",
          linkText: "View Rules & Fees",
        },
      ]);
    } catch (error) {
      console.error("Error checking seller status:", error);
    } finally {
      setLoading(false);
    }
  };

  const completedCount = checklist.filter((item) => item.done).length;
  const totalCount = checklist.length;
  const progressPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  if (authLoading || loading) {
    return (
      <main className="flex-1 container py-8 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </main>
    );
  }

  return (
    <main className="flex-1 container py-8">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold">
            Welcome, {displayName}! 👋
          </h1>
          <p className="text-muted-foreground">
            Complete these steps to start selling on GrailSeeker
          </p>
        </div>

        {/* Progress Card */}
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="font-medium">Setup Progress</span>
                <span className="text-muted-foreground">
                  {completedCount} of {totalCount} completed
                </span>
              </div>
              <Progress value={progressPercent} className="h-2" />
              {progressPercent === 100 && (
                <p className="text-sm text-green-600 font-medium text-center pt-2">
                  🎉 You're all set to start selling!
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Checklist */}
        <Card>
          <CardHeader>
            <CardTitle>Seller Setup Checklist</CardTitle>
            <CardDescription>
              Complete these steps to unlock all seller features
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-1">
            {checklist.map((item, index) => (
              <div
                key={item.id}
                className={`flex items-start gap-4 p-4 rounded-lg transition-colors ${
                  item.done ? "bg-green-50 dark:bg-green-950/20" : "bg-muted/30 hover:bg-muted/50"
                }`}
              >
                <div className={`mt-0.5 ${item.done ? "text-green-600" : "text-muted-foreground"}`}>
                  {item.done ? (
                    <CheckCircle2 className="h-6 w-6" />
                  ) : (
                    <Circle className="h-6 w-6" />
                  )}
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={`${item.done ? "text-muted-foreground" : ""}`}>
                      {item.icon}
                    </span>
                    <h3 className={`font-medium ${item.done ? "line-through text-muted-foreground" : ""}`}>
                      {item.title}
                    </h3>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    {item.description}
                  </p>
                </div>

                {item.link && !item.done && (
                  <Button
                    variant="outline"
                    size="sm"
                    asChild
                    className="shrink-0"
                  >
                    <Link to={item.link}>
                      {item.linkText}
                      <ArrowRight className="ml-1 h-3 w-3" />
                    </Link>
                  </Button>
                )}
                
                {item.link && item.done && item.id === "rules" && (
                  <Button
                    variant="ghost"
                    size="sm"
                    asChild
                    className="shrink-0"
                  >
                    <Link to={item.link}>
                      Review
                      <ArrowRight className="ml-1 h-3 w-3" />
                    </Link>
                  </Button>
                )}
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <div className="flex flex-col sm:flex-row gap-3">
          <Button asChild className="flex-1">
            <Link to="/scanner">
              <Package className="mr-2 h-4 w-4" />
              Scan & List a Comic
            </Link>
          </Button>
          <Button variant="outline" asChild className="flex-1">
            <Link to="/seller-rules-fees">
              <FileText className="mr-2 h-4 w-4" />
              View Seller Rules & Fees
            </Link>
          </Button>
        </div>

        {/* Help Text */}
        <p className="text-center text-sm text-muted-foreground">
          Questions? Check out our{" "}
          <Link to="/help/selling" className="text-primary underline">
            Selling Guide
          </Link>,{" "}
          <Link to="/help/fees" className="text-primary underline">
            Fees & Pricing
          </Link>, or{" "}
          <Link to="/help/trading" className="text-primary underline">
            Trading Guide
          </Link>
          .
        </p>
      </div>
    </main>
  );
}
