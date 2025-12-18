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
 * 
 * v2 Enhancement:
 * - No-match fallback with tips
 * - "Search Instead" prefills search with OCR text
 * - "Show Possible Matches" shows low-confidence candidates
 * - Debug logging for admins
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
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Sparkles, Crown, Layers, Info } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ComicVinePick } from "@/types/comicvine";
import { useScannerAssist } from "@/hooks/useScannerAssist";
import { useSubscriptionTier } from "@/hooks/useSubscriptionTier";
import { useFeatureFlags } from "@/hooks/useFeatureFlags";
import { useAuth } from "@/contexts/AuthContext";
import { useAdminCheck } from "@/hooks/useAdminCheck";
import { ScannerAssistUploader } from "./ScannerAssistUploader";
import { ScannerAssistResults } from "./ScannerAssistResults";
import { BulkScanModal } from "./BulkScanModal";
import { UpgradeToEliteModal } from "@/components/subscription/UpgradeToEliteModal";
import { ScannerDebugPanel } from "./ScannerDebugPanel";
import { ScannerNoMatchPanel } from "./ScannerNoMatchPanel";
import { compressImageDataUrl } from "@/lib/imageCompression";
import { logScannerMatchAttempt, estimateImageSizeKb } from "@/lib/scannerMatchLogger";
import {
  trackScannerAssistStarted,
  trackCandidatesReturned,
  trackScannerAssistConfirmed,
  trackScannerAssistNoMatch,
  trackLimitReached,
  trackUpgradeClicked,
} from "@/lib/analytics/scannerAnalytics";

type ScannerStep = "upload" | "processing" | "results" | "no-match" | "manual";

// Confidence threshold for "confident match"
const CONFIDENCE_THRESHOLD = 0.50;

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
  const { isAdmin } = useAdminCheck();
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
  const [allCandidates, setAllCandidates] = useState<ComicVinePick[]>([]); // All candidates including low-confidence
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [showBulkScanModal, setShowBulkScanModal] = useState(false);
  const [showLowConfidenceCandidates, setShowLowConfidenceCandidates] = useState(false);
  
  // Debug data for admin panel
  const [debugData, setDebugData] = useState<{
    ocrText?: string;
    extractedTitle?: string;
    extractedIssue?: string;
    extractedPublisher?: string;
    extractedYear?: number | null;
    confidence?: number;
    candidateCount: number;
    matchMode?: string;
    timings?: { vision?: number; total?: number };
  }>({ candidateCount: 0 });

  // OCR text for "Search Instead" prefill
  const [ocrExtractedText, setOcrExtractedText] = useState<string | null>(null);

  const handleImageSelected = async (imageData: string) => {
    // Check if user can scan
    if (!canScan) {
      setShowUpgradeModal(true);
      trackLimitReached(user?.id);
      return;
    }

    setPreviewImage(imageData);
    setStep("processing");
    setShowLowConfidenceCandidates(false);
    
    // Track analytics
    const tier = isElite ? "elite" : "free";
    trackScannerAssistStarted(user?.id, tier);

    // Estimate image size for logging
    const imageSizeKb = estimateImageSizeKb(imageData);

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

      // Extract debug data
      const extracted = data.extracted || {};
      const topConfidence = data.picks?.[0]?.score || 0;
      
      setOcrExtractedText(extracted.title || extracted.finalCleanTitle || null);
      setDebugData({
        ocrText: data.ocrText,
        extractedTitle: extracted.title || extracted.finalCleanTitle,
        extractedIssue: extracted.issueNumber,
        extractedPublisher: extracted.publisher,
        extractedYear: extracted.year,
        confidence: topConfidence,
        candidateCount: data.picks?.length || 0,
        matchMode: data.debug?.queryMode || extracted.matchMode,
        timings: data.timings,
      });

      // Log match attempt to database
      logScannerMatchAttempt({
        userId: user?.id,
        imageSizeKb,
        matched: topConfidence >= CONFIDENCE_THRESHOLD && data.picks?.length > 0,
        confidence: topConfidence,
        candidateCount: data.picks?.length || 0,
        ocrText: data.ocrText,
        extractedTitle: extracted.title || extracted.finalCleanTitle,
        extractedIssue: extracted.issueNumber,
        extractedPublisher: extracted.publisher,
        matchMode: data.debug?.queryMode,
      });

      // Store all candidates for "Show Possible Matches"
      const allPicks = data.picks || [];
      setAllCandidates(allPicks);

      if (data.ok && allPicks.length > 0) {
        // Check if we have confident matches (above threshold)
        const confidentMatches = allPicks.filter((p: ComicVinePick) => p.score >= CONFIDENCE_THRESHOLD);
        
        if (confidentMatches.length > 0) {
          // Show confident matches
          setCandidates(confidentMatches.slice(0, 5));
          setStep("results");

          toast.success("Found possible matches!", {
            description: `${confidentMatches.length} candidate${confidentMatches.length > 1 ? 's' : ''} found`,
          });
          
          trackCandidatesReturned(confidentMatches.length, user?.id, tier);
        } else {
          // No confident matches, but have low-confidence candidates
          setCandidates([]);
          setStep("no-match");

          toast.info("No confident matches found", {
            description: "See tips below or view possible matches",
          });
          
          trackScannerAssistNoMatch(user?.id, tier);
        }
      } else {
        // No matches found at all
        setCandidates([]);
        setAllCandidates([]);
        setStep("no-match");

        toast.info("No matches found", {
          description: "Try searching manually",
        });
        
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
      
      // Success toast with soft upsell for free users (NOT at limit)
      if (!isElite && canScan) {
        toast.success("Comic identified — review & edit", {
          description: "Nice! Elite users scan without daily limits.",
          action: {
            label: "Learn more",
            onClick: () => window.location.href = "/plans",
          },
        });
      } else {
        toast.success("Comic identified — review & edit");
      }
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

  // "Search Instead" - prefill with OCR extracted text
  const handleSearchInstead = () => {
    // If we have OCR text, we could pass it to a search handler
    // For now, just navigate to manual search with the extracted text in localStorage
    if (ocrExtractedText) {
      localStorage.setItem("grailseeker_search_prefill", ocrExtractedText);
    }
    onManualSearch();
    handleClose();
  };

  // "Show Possible Matches" - show low-confidence candidates
  const handleShowPossibleMatches = () => {
    setShowLowConfidenceCandidates(true);
    setCandidates(allCandidates.slice(0, 5));
    setStep("results");
  };

  // "Start Over" - reset to upload
  const handleStartOver = () => {
    setStep("upload");
    setPreviewImage(null);
    setCandidates([]);
    setAllCandidates([]);
    setShowLowConfidenceCandidates(false);
    setOcrExtractedText(null);
  };

  const handleClose = () => {
    setStep("upload");
    setPreviewImage(null);
    setUploadedImageUrl(null);
    setCandidates([]);
    setAllCandidates([]);
    setShowLowConfidenceCandidates(false);
    setOcrExtractedText(null);
    setDebugData({ candidateCount: 0 });
    onOpenChange(false);
  };

  // Can show debug panel to admins or Elite users
  const canShowDebug = isAdmin || isElite;

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
    <TooltipProvider>
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
                  <Tooltip>
                    <TooltipTrigger asChild>
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
                    </TooltipTrigger>
                    <TooltipContent side="bottom">
                      <p className="text-xs">Scan up to 20 comics at once</p>
                    </TooltipContent>
                  </Tooltip>
                )}
                {bulkScanEnabled && !isElite && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Badge
                        variant="secondary"
                        className="text-xs text-muted-foreground cursor-pointer hover:bg-secondary/80"
                        onClick={() => setShowUpgradeModal(true)}
                      >
                        <Layers className="w-3 h-3 mr-1" />
                        Bulk Scan (Elite)
                      </Badge>
                    </TooltipTrigger>
                    <TooltipContent side="bottom">
                      <p className="text-xs">Elite saves ~5-10 min per listing session</p>
                    </TooltipContent>
                  </Tooltip>
                )}
                {!isUnlimited && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Badge variant="outline" className="text-xs cursor-help">
                        {remainingScans} scan{remainingScans !== 1 ? "s" : ""} left today
                      </Badge>
                    </TooltipTrigger>
                    <TooltipContent side="bottom">
                      <p className="text-xs">Elite users get unlimited scans</p>
                    </TooltipContent>
                  </Tooltip>
                )}
                {isUnlimited && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Badge className="text-xs bg-amber-500/20 text-amber-600 border-amber-500/30 cursor-help">
                        <Crown className="w-3 h-3 mr-1" />
                        Unlimited
                      </Badge>
                    </TooltipTrigger>
                    <TooltipContent side="bottom">
                      <p className="text-xs">Unlimited scans as an Elite member</p>
                    </TooltipContent>
                  </Tooltip>
                )}
              </div>
            </div>
            <DialogDescription>
              {step === "upload" &&
                "Snap a photo and we'll suggest the closest matches. You pick the right one."}
              {step === "processing" && "Analyzing your comic cover..."}
              {step === "results" && "Select the correct match for your comic."}
              {step === "no-match" && "We couldn't confidently identify this comic."}
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
                showingLowConfidence={showLowConfidenceCandidates}
              />
            )}

            {step === "no-match" && (
              <div className="space-y-4">
                {/* Import and use ScannerNoMatchPanel */}
                <ScannerNoMatchPanel
                  lowConfidenceCandidates={allCandidates}
                  ocrExtractedText={ocrExtractedText}
                  onSearchInstead={handleSearchInstead}
                  onShowPossibleMatches={handleShowPossibleMatches}
                  onStartOver={handleStartOver}
                  hasAnyCandidates={allCandidates.length > 0}
                />
              </div>
            )}

            {/* Debug panel for admins/Elite */}
            {(step === "results" || step === "no-match") && canShowDebug && (
              <ScannerDebugPanel
                debugData={debugData}
                isVisible={true}
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
    </TooltipProvider>
  );
}
