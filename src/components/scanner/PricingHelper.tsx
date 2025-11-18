import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { DollarSign, TrendingDown, TrendingUp } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface PricingHelperProps {
  title: string;
  issueNumber?: string;
  grade?: string;
  onPriceSelect: (price: number) => void;
}

interface PricingData {
  floor: number;
  median: number;
  high: number;
  confidence: number;
}

export function PricingHelper({ title, issueNumber, grade, onPriceSelect }: PricingHelperProps) {
  const [loading, setLoading] = useState(false);
  const [pricing, setPricing] = useState<PricingData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!title) return;
    
    const fetchPricing = async () => {
      setLoading(true);
      setError(null);
      
      try {
        const { data, error: functionError } = await supabase.functions.invoke('ebay-pricing', {
          body: { title, issueNumber, grade }
        });

        if (functionError) throw functionError;
        
        if (data?.prices && data.prices.length > 0) {
          const prices = data.prices.sort((a: number, b: number) => a - b);
          const floor = prices[0];
          const high = prices[prices.length - 1];
          const median = prices[Math.floor(prices.length / 2)];
          
          setPricing({
            floor,
            median,
            high,
            confidence: data.prices.length >= 3 ? 85 : 50
          });
        } else {
          setError("No pricing data available");
        }
      } catch (err) {
        console.error('Pricing fetch error:', err);
        setError("Unable to fetch pricing");
      } finally {
        setLoading(false);
      }
    };

    fetchPricing();
  }, [title, issueNumber, grade]);

  if (loading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <DollarSign className="h-4 w-4" />
            Market Pricing
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-2/3" />
        </CardContent>
      </Card>
    );
  }

  if (error || !pricing) {
    return (
      <Alert className="border-muted">
        <AlertDescription className="text-xs text-muted-foreground">
          {error || "No pricing data yet"}
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <DollarSign className="h-4 w-4" />
          Market Pricing
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Floor: ${pricing.floor.toFixed(2)}</span>
          <span className="font-medium">Median: ${pricing.median.toFixed(2)}</span>
          <span className="text-muted-foreground">High: ${pricing.high.toFixed(2)}</span>
        </div>
        <div className="text-xs text-muted-foreground text-center">
          Confidence: {pricing.confidence}%
        </div>
        
        <div className="grid grid-cols-3 gap-2 pt-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPriceSelect(pricing.median * 0.9)}
            className="text-xs"
          >
            <TrendingDown className="h-3 w-3 mr-1" />
            Market -10%
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPriceSelect(pricing.floor)}
            className="text-xs"
          >
            Quick Sale
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPriceSelect(0.99)}
            className="text-xs"
          >
            <TrendingUp className="h-3 w-3 mr-1" />
            Auction $0.99
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
