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
    <div className="bg-gradient-to-r from-primary via-primary/90 to-primary text-primary-foreground py-3 px-4 relative">
      <div className="container mx-auto flex items-center justify-between gap-4">
        <div className="flex-1 text-center">
          <p className="text-sm md:text-base font-bold">
            🎯 <span className="hidden sm:inline">Founding Sellers:</span> Lifetime 4% marketplace fee • First 100 only • 0% fees on your first 30 days
          </p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleDismiss}
          className="text-primary-foreground hover:bg-primary-foreground/20 h-8 w-8 p-0"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
