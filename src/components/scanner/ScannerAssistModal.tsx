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
import { Sparkles, Crown, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ComicVinePick } from "@/types/comicvine";
import { useScannerAssist } from "@/hooks/useScannerAssist";
import { ScannerAssistUploader } from "./ScannerAssistUploader";
import { ScannerAssistResults } from "./ScannerAssistResults";
import { UpgradeToEliteModal } from "@/components/subscription/UpgradeToEliteModal";
import { compressImageDataUrl } from "@/lib/imageCompression";

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
  const {
    canScan,
    usedToday,
    dailyLimit,
    isUnlimited,
    loading: usageLoading,
    incrementUsage,
    remainingScans,
  } = useScannerAssist();

  const [step, setStep] = useState<ScannerStep>("upload");
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [uploadedImageUrl, setUploadedImageUrl] = useState<string | null>(null);
  const [candidates, setCandidates] = useState<ComicVinePick[]>([]);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

  const handleImageSelected = async (imageData: string) => {
    // Check if user can scan
    if (!canScan) {
      setShowUpgradeModal(true);
      return;
    }

    setPreviewImage(imageData);
    setStep("processing");

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
      } else {
        // No matches found
        setCandidates([]);
        setStep("results");

        toast.info("No confident matches found", {
          description: "Try searching manually",
        });
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
                <Sparkles className="w-5 h-5" />
                Daily Limit Reached
              </DialogTitle>
              <DialogDescription>
                You've used all {dailyLimit} Scanner Assist scans for today.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="text-center">
                <Badge variant="secondary" className="mb-4">
                  {usedToday} of {dailyLimit} scans used today
                </Badge>
                <p className="text-sm text-muted-foreground mb-4">
                  Upgrade to Elite for unlimited Scanner Assist scans.
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={() => setShowUpgradeModal(true)}
                  className="flex-1"
                >
                  <Crown className="w-4 h-4 mr-2" />
                  Upgrade to Elite
                </Button>
                <Button
                  variant="outline"
                  onClick={handleManualSearch}
                  className="flex-1"
                >
                  Search Manually
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
            <DialogDescription>
              {step === "upload" &&
                "Snap a photo of your comic and we'll identify it instantly."}
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
    </>
  );
}
