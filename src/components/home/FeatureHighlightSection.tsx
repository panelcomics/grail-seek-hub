/**
 * Feature Highlight Section
 * 
 * Reusable section for highlighting Heat Index and Scanner Assist
 * with consistent styling.
 */

import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { Flame, Camera } from "lucide-react";

interface FeatureHighlightSectionProps {
  feature: "heat-index" | "scanner-assist";
}

export function FeatureHighlightSection({ feature }: FeatureHighlightSectionProps) {
  const navigate = useNavigate();

  if (feature === "heat-index") {
    return (
      <section className="py-10 sm:py-14 px-4 bg-background">
        <div className="container mx-auto max-w-3xl text-center">
          <div className="flex items-center justify-center gap-2 mb-3">
            <Flame className="h-6 w-6 sm:h-7 sm:w-7 text-orange-500" />
            <h2 className="text-2xl sm:text-3xl font-bold">
              Heat Index
            </h2>
          </div>
          
          <p className="text-base sm:text-lg text-muted-foreground mb-6 max-w-xl mx-auto">
            See which comics are gaining real collector attention right now.
          </p>
          
          <Button 
            size="lg"
            variant="outline"
            onClick={() => navigate('/signals')}
            className="px-8 py-6 text-base sm:text-lg font-semibold border-2 hover:bg-primary hover:text-primary-foreground transition-all"
          >
            See What's Heating Up
          </Button>
        </div>
      </section>
    );
  }

  return (
    <section className="py-10 sm:py-14 px-4 bg-muted/20">
      <div className="container mx-auto max-w-3xl text-center">
        <div className="flex items-center justify-center gap-2 mb-3">
          <Camera className="h-6 w-6 sm:h-7 sm:w-7 text-primary" />
          <h2 className="text-2xl sm:text-3xl font-bold">
            Scanner Assist
          </h2>
        </div>
        
        <p className="text-base sm:text-lg text-muted-foreground mb-6 max-w-xl mx-auto">
          Scan a comic cover to identify the issue and see collector interest instantly.
        </p>
        
        <Button 
          size="lg"
          onClick={() => navigate('/scanner')}
          className="px-8 py-6 text-base sm:text-lg font-semibold shadow-lg hover:shadow-xl transition-all bg-primary hover:bg-primary/90"
        >
          Try Scanner Assist
        </Button>
      </div>
    </section>
  );
}
