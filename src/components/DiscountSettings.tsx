import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useDiscount } from "@/hooks/useDiscount";
import { toast } from "sonner";
import { Percent, TrendingDown, AlertCircle } from "lucide-react";

export const DiscountSettings = () => {
  const { discount, loading, applyDiscountCode } = useDiscount();
  const [code, setCode] = useState("");
  const [applying, setApplying] = useState(false);

  const handleApplyCode = async () => {
    if (!code.trim()) {
      toast.error("Please enter a discount code");
      return;
    }

    setApplying(true);
    const result = await applyDiscountCode(code.trim());
    setApplying(false);

    if (result.success) {
      toast.success(result.message);
      setCode("");
    } else {
      toast.error(result.message);
    }
  };

  if (loading) {
    return <div className="text-muted-foreground">Loading discount info...</div>;
  }

  const usagePercentage = discount
    ? (discount.currentMonthSavings / discount.monthlyCap) * 100
    : 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Percent className="h-5 w-5" />
          Pro Seller Discount
        </CardTitle>
        <CardDescription>
          Get reduced seller fees with an influencer discount code
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {discount ? (
          <>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Active Code</span>
                <Badge variant="default" className="font-mono">
                  {discount.code}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Your Rate</span>
                <div className="flex items-center gap-1">
                  <TrendingDown className="h-4 w-4 text-green-500" />
                  <span className="font-semibold text-green-500">
                    {discount.discountRate}%
                  </span>
                  <span className="text-xs text-muted-foreground line-through ml-1">
                    5%
                  </span>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium">Monthly Savings Usage</span>
                <span className="text-muted-foreground">
                  ${discount.currentMonthSavings.toFixed(2)} / ${discount.monthlyCap.toFixed(2)}
                </span>
              </div>
              <Progress value={usagePercentage} className="h-2" />
              {usagePercentage >= 90 && (
                <div className="flex items-start gap-2 text-xs text-amber-600">
                  <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                  <span>
                    You're approaching your monthly discount cap. Standard 5% fees will apply once the cap is reached.
                  </span>
                </div>
              )}
            </div>

            <div className="pt-4 border-t text-xs text-muted-foreground">
              Your discount code reduces seller fees from 5% to {discount.discountRate}% on nationwide shipping, with a maximum of ${discount.monthlyCap} in monthly savings.
            </div>
          </>
        ) : (
          <>
            <div className="space-y-2">
              <label htmlFor="discount-code" className="text-sm font-medium">
                Enter Discount Code
              </label>
              <div className="flex gap-2">
                <Input
                  id="discount-code"
                  placeholder="e.g., CLANMCDONALDS"
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  onKeyDown={(e) => e.key === "Enter" && handleApplyCode()}
                  disabled={applying}
                />
                <Button onClick={handleApplyCode} disabled={applying}>
                  {applying ? "Applying..." : "Apply"}
                </Button>
              </div>
            </div>

            <div className="pt-4 border-t text-xs text-muted-foreground">
              Have an influencer discount code? Enter it above to unlock reduced seller fees. Contact support if you're interested in becoming a pro seller partner.
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};
