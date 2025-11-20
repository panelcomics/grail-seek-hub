import { useState, useEffect } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";

export function FoundingSellersBanner() {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const dismissed = sessionStorage.getItem("founding-banner-dismissed");
    if (dismissed) {
      setIsVisible(false);
    }
  }, []);

  const handleDismiss = () => {
    setIsVisible(false);
    sessionStorage.setItem("founding-banner-dismissed", "true");
  };

  if (!isVisible) return null;

  return (
    <div className="bg-gradient-to-r from-primary via-primary/90 to-primary text-primary-foreground py-0.5 px-3 md:px-4 relative">
      <div className="container mx-auto flex items-center justify-between gap-2 md:gap-4">
        <div className="flex-1 text-center pr-2">
          <p className="text-xs font-bold">
            Founding Sellers: Lifetime 2% GrailSeeker Fee
            <span className="text-[10px] font-normal opacity-90 ml-1">*Stripe processing fees apply (2.9% + $0.30)</span>
          </p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleDismiss}
          className="text-primary-foreground hover:bg-primary-foreground/20 h-6 w-6 min-w-[24px] min-h-[24px] p-0 flex-shrink-0"
          aria-label="Dismiss banner"
        >
          <X className="h-3 w-3" />
        </Button>
      </div>
    </div>
  );
}
