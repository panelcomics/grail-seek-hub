/**
 * SCANNER ASSIST BUTTON
 * ==========================================================================
 * Reusable button that opens Scanner Assist modal.
 * Shows remaining scans for free users.
 * ==========================================================================
 */

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Crown } from "lucide-react";
import { useScannerAssist } from "@/hooks/useScannerAssist";
import { ScannerAssistModal } from "./ScannerAssistModal";
import { ComicVinePick } from "@/types/comicvine";
import { cn } from "@/lib/utils";

interface ScannerAssistButtonProps {
  onSelect: (pick: ComicVinePick, imageUrl: string) => void;
  onSkip?: () => void;
  onManualSearch?: () => void;
  variant?: "default" | "outline" | "secondary" | "ghost";
  size?: "default" | "sm" | "lg" | "icon";
  className?: string;
  showBadge?: boolean;
}

export function ScannerAssistButton({
  onSelect,
  onSkip,
  onManualSearch,
  variant = "default",
  size = "default",
  className,
  showBadge = true,
}: ScannerAssistButtonProps) {
  const [modalOpen, setModalOpen] = useState(false);
  const { remainingScans, isUnlimited, loading } = useScannerAssist();

  const handleSkip = () => {
    setModalOpen(false);
    onSkip?.();
  };

  const handleManualSearch = () => {
    setModalOpen(false);
    onManualSearch?.();
  };

  return (
    <>
      <Button
        variant={variant}
        size={size}
        onClick={() => setModalOpen(true)}
        className={cn("gap-2", className)}
        disabled={loading}
      >
        <Sparkles className="w-4 h-4" />
        Scanner Assist
        {showBadge && !loading && (
          <>
            {isUnlimited ? (
              <Badge variant="secondary" className="ml-1 text-xs bg-amber-500/20 text-amber-600 border-amber-500/30">
                <Crown className="w-3 h-3 mr-0.5" />
                ∞
              </Badge>
            ) : (
              <Badge variant="outline" className="ml-1 text-xs">
                {remainingScans} left
              </Badge>
            )}
          </>
        )}
      </Button>

      <ScannerAssistModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        onSelect={onSelect}
        onSkip={handleSkip}
        onManualSearch={handleManualSearch}
      />
    </>
  );
}
