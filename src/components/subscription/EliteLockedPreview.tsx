import { Lock, Crown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

interface EliteLockedPreviewProps {
  title: string;
  description: string;
  className?: string;
}

/**
 * Standardized locked preview block for Elite-only features.
 * Shows lock icon, benefit explanation, and single CTA button.
 */
export function EliteLockedPreview({ 
  title, 
  description, 
  className = "" 
}: EliteLockedPreviewProps) {
  const navigate = useNavigate();

  return (
    <div className={`flex flex-col items-center justify-center p-8 text-center rounded-lg border border-dashed border-muted-foreground/30 bg-muted/30 ${className}`}>
      <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-4">
        <Lock className="h-6 w-6 text-muted-foreground" />
      </div>
      
      <h3 className="text-lg font-semibold text-foreground mb-2">
        {title}
      </h3>
      
      <p className="text-sm text-muted-foreground mb-6 max-w-sm">
        {description}
      </p>
      
      <Button 
        onClick={() => navigate('/plans')}
        className="gap-2 bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 text-white"
      >
        <Crown className="h-4 w-4" />
        Unlock with Elite
      </Button>
    </div>
  );
}
