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
    <div className="bg-gradient-to-r from-primary via-primary/90 to-primary text-primary-foreground py-2 md:py-3 px-3 md:px-4 relative">
      <div className="container mx-auto flex items-center justify-between gap-2 md:gap-4">
        <div className="flex-1 text-center pr-2">
          <p className="text-xs sm:text-sm md:text-base font-bold break-words hyphens-auto">
            🎯 <span className="hidden sm:inline">Founding Sellers:</span><span className="sm:hidden">Founding:</span> Lifetime 4% fee • First 100 • 0% fees first 30 days
          </p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleDismiss}
          className="text-primary-foreground hover:bg-primary-foreground/20 h-11 w-11 min-w-[44px] min-h-[44px] p-0 flex-shrink-0"
          aria-label="Dismiss banner"
        >
          <X className="h-5 w-5" />
        </Button>
      </div>
    </div>
  );
}
