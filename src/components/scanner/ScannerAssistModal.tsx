/**
 * SCANNER ASSIST MODAL
 * ==========================================================================
 * Main modal component for Scanner Assist v1.
 * 
 * Flow:
 * 1. User uploads/captures comic cover image
 * 2. System performs OCR and queries ComicVine
 * 3. Display 3-5 candidate matches
 * 4. User MUST manually select the correct match
 * 5. Selected match auto-fills listing fields
 * 
 * Limits:
 * - Free users: 3 scans per day
 * - Elite users: Unlimited
 * ==========================================================================
 */

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Crown, Layers } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ComicVinePick } from "@/types/comicvine";
import { useScannerAssist } from "@/hooks/useScannerAssist";
import { useSubscriptionTier } from "@/hooks/useSubscriptionTier";
import { useFeatureFlags } from "@/hooks/useFeatureFlags";
import { useAuth } from "@/contexts/AuthContext";
import { ScannerAssistUploader } from "./ScannerAssistUploader";
import { ScannerAssistResults } from "./ScannerAssistResults";
import { BulkScanModal } from "./BulkScanModal";
import { UpgradeToEliteModal } from "@/components/subscription/UpgradeToEliteModal";
import { compressImageDataUrl } from "@/lib/imageCompression";
import {
  trackScannerAssistStarted,
  trackCandidatesReturned,
  trackScannerAssistConfirmed,
  trackScannerAssistNoMatch,
  trackUpgradeModalShown,
  trackUpgradeClicked,
} from "@/lib/analytics/scannerAnalytics";

type ScannerStep = "upload" | "processing" | "results" | "manual";

interface ScannerAssistModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (pick: ComicVinePick, imageUrl: string) => void;
  onSkip: () => void;
  onManualSearch: () => void;
}

export function ScannerAssistModal({
  open,
  onOpenChange,
  onSelect,
  onSkip,
  onManualSearch,
}: ScannerAssistModalProps) {
  const { user } = useAuth();
  const {
    canScan,
    usedToday,
    dailyLimit,
    isUnlimited,
    loading: usageLoading,
    incrementUsage,
    remainingScans,
  } = useScannerAssist();
  const { isElite } = useSubscriptionTier();
  const { isEnabled } = useFeatureFlags();
  const bulkScanEnabled = isEnabled("bulkScanEnabled");

  const [step, setStep] = useState<ScannerStep>("upload");
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [uploadedImageUrl, setUploadedImageUrl] = useState<string | null>(null);
  const [candidates, setCandidates] = useState<ComicVinePick[]>([]);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [showBulkScanModal, setShowBulkScanModal] = useState(false);

  const handleImageSelected = async (imageData: string) => {
    // Check if user can scan
    if (!canScan) {
      setShowUpgradeModal(true);
      trackUpgradeModalShown(user?.id);
      return;
    }

    setPreviewImage(imageData);
    setStep("processing");
    
    // Track analytics
    const tier = isElite ? "elite" : "free";
    trackScannerAssistStarted(user?.id, tier);

    try {
      // Compress image
      const compressed = await compressImageDataUrl(imageData, 1200, 0.85);

      // Upload to storage
      const blob = await fetch(compressed).then((r) => r.blob());
      const file = new File([blob], `scan-assist-${Date.now()}.jpg`, {
        type: "image/jpeg",
      });

      const { uploadViaProxy } = await import("@/lib/uploadImage");
      const { publicUrl } = await uploadViaProxy(file);
      setUploadedImageUrl(publicUrl);

      console.log("[SCANNER_ASSIST] Image uploaded:", publicUrl);

      // Call scan-item edge function for OCR + ComicVine matching
      const { data, error } = await supabase.functions.invoke("scan-item", {
        body: { imageData: compressed },
      });

      if (error) {
        throw error;
      }

      // Track usage after successful scan
      incrementUsage();

      if (data.ok && data.picks && data.picks.length > 0) {
        // Filter to top 5 candidates
        const topCandidates = data.picks.slice(0, 5);
        setCandidates(topCandidates);
        setStep("results");

        toast.success("Found possible matches!", {
          description: `${topCandidates.length} candidates found`,
        });
        
        // Track analytics
        trackCandidatesReturned(topCandidates.length, user?.id, tier);
      } else {
        // No matches found
        setCandidates([]);
        setStep("results");

        toast.info("No confident matches found", {
          description: "Try searching manually",
        });
        
        // Track analytics
        trackScannerAssistNoMatch(user?.id, tier);
      }
    } catch (err: any) {
      console.error("[SCANNER_ASSIST] Error:", err);
      toast.error("Scan failed", {
        description: "Please try again or search manually",
      });
      setStep("upload");
    }
  };

  const handleSelect = (pick: ComicVinePick) => {
    if (uploadedImageUrl) {
      onSelect(pick, uploadedImageUrl);
      handleClose();
      
      // Track analytics
      trackScannerAssistConfirmed(user?.id, isElite ? "elite" : "free");
    }
  };

  const handleSkip = () => {
    onSkip();
    handleClose();
  };

  const handleManualSearch = () => {
    onManualSearch();
    handleClose();
  };

  const handleClose = () => {
    setStep("upload");
    setPreviewImage(null);
    setUploadedImageUrl(null);
    setCandidates([]);
    onOpenChange(false);
  };

  // If user is at limit, show upgrade prompt
  if (!usageLoading && !canScan && open && step === "upload") {
    return (
      <>
        <Dialog open={open} onOpenChange={handleClose}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Crown className="w-5 h-5 text-amber-500" />
                Unlock Unlimited Scanner Assist
              </DialogTitle>
              <DialogDescription>
                You've used your free daily scans.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <p className="text-sm text-muted-foreground">
                Elite members get unlimited photo scans, faster listings, and access to advanced tools like Deal Finder and Portfolio Tracking.
              </p>
              
              <ul className="space-y-2 text-sm">
                <li className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-primary" />
                  <span>Unlimited Scanner Assist</span>
                </li>
                <li className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-primary" />
                  <span>Bulk scanning (coming soon)</span>
                </li>
                <li className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-primary" />
                  <span>Faster listings, less typing</span>
                </li>
                <li className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-primary" />
                  <span>All Elite tools included</span>
                </li>
              </ul>

              <div className="flex flex-col gap-2 pt-2">
                <Button
                  onClick={() => {
                    setShowUpgradeModal(true);
                    trackUpgradeClicked(user?.id);
                  }}
                  className="w-full bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 text-white"
                >
                  <Crown className="w-4 h-4 mr-2" />
                  Upgrade to Elite
                </Button>
                <Button
                  variant="ghost"
                  onClick={handleManualSearch}
                  className="w-full text-muted-foreground"
                >
                  I'll list manually for now
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
        <UpgradeToEliteModal
          open={showUpgradeModal}
          onOpenChange={setShowUpgradeModal}
          feature="Scanner Assist"
          currentCount={usedToday}
          limit={dailyLimit}
        />
      </>
    );
  }

  return (
    <>
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-primary" />
                Scanner Assist
              </DialogTitle>
              <div className="flex items-center gap-2">
                {bulkScanEnabled && isElite && (
                  <Badge
                    variant="secondary"
                    className="text-xs cursor-pointer hover:bg-secondary/80 transition-colors"
                    onClick={() => {
                      onOpenChange(false);
                      setShowBulkScanModal(true);
                    }}
                  >
                    <Layers className="w-3 h-3 mr-1" />
                    Bulk Scan
                  </Badge>
                )}
                {bulkScanEnabled && !isElite && (
                  <Badge
                    variant="secondary"
                    className="text-xs text-muted-foreground cursor-pointer hover:bg-secondary/80"
                    onClick={() => setShowUpgradeModal(true)}
                  >
                    <Layers className="w-3 h-3 mr-1" />
                    Bulk Scan (Elite)
                  </Badge>
                )}
                {!isUnlimited && (
                  <Badge variant="outline" className="text-xs">
                    {remainingScans} scan{remainingScans !== 1 ? "s" : ""} left today
                  </Badge>
                )}
                {isUnlimited && (
                  <Badge className="text-xs bg-amber-500/20 text-amber-600 border-amber-500/30">
                    <Crown className="w-3 h-3 mr-1" />
                    Unlimited
                  </Badge>
                )}
              </div>
            </div>
            <DialogDescription>
              {step === "upload" &&
                "Snap a photo and we'll suggest the closest matches. You pick the right one."}
              {step === "processing" && "Analyzing your comic cover..."}
              {step === "results" && "Select the correct match for your comic."}
            </DialogDescription>
          </DialogHeader>

          <div className="py-2">
            {step === "upload" && (
              <ScannerAssistUploader
                onImageSelected={handleImageSelected}
                isProcessing={false}
                previewImage={null}
              />
            )}

            {step === "processing" && (
              <ScannerAssistUploader
                onImageSelected={() => {}}
                isProcessing={true}
                previewImage={previewImage}
              />
            )}

            {step === "results" && (
              <ScannerAssistResults
                candidates={candidates}
                onSelect={handleSelect}
                onSkip={handleSkip}
                onManualSearch={handleManualSearch}
              />
            )}
          </div>
        </DialogContent>
      </Dialog>

      <UpgradeToEliteModal
        open={showUpgradeModal}
        onOpenChange={setShowUpgradeModal}
        feature="Scanner Assist"
        currentCount={usedToday}
        limit={dailyLimit}
      />

      <BulkScanModal
        open={showBulkScanModal}
        onOpenChange={setShowBulkScanModal}
        onComplete={() => {
          // Navigate to inventory after bulk scan
          window.location.href = "/inventory";
        }}
      />
    </>
  );
}
