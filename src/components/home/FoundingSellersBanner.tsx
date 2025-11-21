import { useState, useEffect } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

export function FoundingSellersBanner() {
  const [isVisible, setIsVisible] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkFoundingSellerCount = async () => {
      // Check if user dismissed the banner
      const dismissed = sessionStorage.getItem("founding-banner-dismissed");
      if (dismissed) {
        setIsVisible(false);
        setLoading(false);
        return;
      }

      // Check founding seller count
      const { data, error } = await supabase.rpc('get_founding_seller_count');
      
      if (!error && data !== null) {
        // Only show banner if less than 100 founding sellers
        setIsVisible(data < 100);
      }
      
      setLoading(false);
    };

    checkFoundingSellerCount();
  }, []);

  const handleDismiss = () => {
    setIsVisible(false);
    sessionStorage.setItem("founding-banner-dismissed", "true");
  };

  if (loading || !isVisible) return null;

  return (
    <div className="bg-gradient-to-r from-primary/90 via-primary to-primary/90 text-primary-foreground py-2 sm:py-2.5 px-3 sm:px-4 relative overflow-hidden">
      <div className="container mx-auto max-w-6xl">
        <div className="flex items-center justify-between gap-2">
          <p className="text-[11px] sm:text-sm font-semibold flex-1 leading-snug pr-1">
            <span className="block sm:inline">Founding Sellers (First 100): Lifetime 2% GrailSeeker Fee</span>
            <span className="block sm:inline sm:ml-1 opacity-95">• Stripe fees apply (2.9% + $0.30)</span>
          </p>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleDismiss}
            className="text-primary-foreground hover:bg-primary-foreground/20 flex-shrink-0 h-7 w-7 sm:h-6 sm:w-6 p-0"
            aria-label="Dismiss banner"
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );
}
