/**
 * BULK SCAN MODAL
 * ==========================================================================
 * Main modal for Bulk Scan v2 (Elite only).
 * 
 * Core Safety Principle:
 * - NO auto-creation. Every item requires explicit user confirmation.
 * - NO batch "approve all"
 * 
 * Flow:
 * 1. Upload up to 20 images
 * 2. Process each through Scanner Assist
 * 3. User reviews and confirms each one-by-one
 * 4. Only confirmed items create inventory
 * ==========================================================================
 */

import { useState, useEffect, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Crown, Layers, CheckCircle2, ArrowRight, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { ComicVinePick } from "@/types/comicvine";
import { useBulkScan, BulkScanItem } from "@/hooks/useBulkScan";
import { useSubscriptionTier } from "@/hooks/useSubscriptionTier";
import { useFeatureFlags } from "@/hooks/useFeatureFlags";
import { BulkScanUploader } from "./BulkScanUploader";
import { BulkScanQueue } from "./BulkScanQueue";
import { BulkScanReviewModal } from "./BulkScanReviewModal";
import { UpgradeToEliteModal } from "@/components/subscription/UpgradeToEliteModal";
import { compressImageDataUrl } from "@/lib/imageCompression";
import {
  trackBulkScanStarted,
  trackBulkScanCompleted,
  trackScannerEvent,
} from "@/lib/analytics/scannerAnalytics";

type BulkScanStep = "upload" | "queue" | "complete";

interface BulkScanModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onComplete: () => void;
}

export function BulkScanModal({
  open,
  onOpenChange,
  onComplete,
}: BulkScanModalProps) {
  const { user } = useAuth();
  const { isElite, loading: tierLoading } = useSubscriptionTier();
  const { isEnabled } = useFeatureFlags();
  const {
    items,
    currentItemId,
    isProcessing,
    completedCount,
    totalCount,
    addImages,
    updateItem,
    setCurrentItem,
    markCompleted,
    markSkipped,
    resetQueue,
  } = useBulkScan();

  const [step, setStep] = useState<BulkScanStep>("upload");
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [reviewItem, setReviewItem] = useState<BulkScanItem | null>(null);
  const [processingQueue, setProcessingQueue] = useState(false);

  // Reset on close
  useEffect(() => {
    if (!open) {
      setStep("upload");
      resetQueue();
      setReviewItem(null);
    }
  }, [open, resetQueue]);

  // Process queue items sequentially
  const processNextInQueue = useCallback(async () => {
    const nextQueued = items.find((item) => item.status === "queued");
    if (!nextQueued || processingQueue) return;

    setProcessingQueue(true);
    updateItem(nextQueued.id, { status: "processing" });

    try {
      // Compress image
      const compressed = await compressImageDataUrl(nextQueued.imageData, 1200, 0.85);

      // Upload to storage
      const blob = await fetch(compressed).then((r) => r.blob());
      const file = new File([blob], `bulk-scan-${Date.now()}.jpg`, {
        type: "image/jpeg",
      });

      const { uploadViaProxy } = await import("@/lib/uploadImage");
      const { publicUrl } = await uploadViaProxy(file);

      // Call scan-item edge function
      const { data, error } = await supabase.functions.invoke("scan-item", {
        body: { imageData: compressed },
      });

      if (error) throw error;

      if (data.ok && data.picks && data.picks.length > 0) {
        const topCandidates = data.picks.slice(0, 5);
        updateItem(nextQueued.id, {
          status: topCandidates[0].score >= 0.5 ? "match_found" : "needs_review",
          candidates: topCandidates,
          uploadedImageUrl: publicUrl,
        });
      } else {
        updateItem(nextQueued.id, {
          status: "no_match",
          candidates: [],
          uploadedImageUrl: publicUrl,
        });
      }
    } catch (err: any) {
      console.error("[BULK_SCAN] Processing error:", err);
      updateItem(nextQueued.id, {
        status: "no_match",
        error: "Failed to analyze image",
      });
    } finally {
      setProcessingQueue(false);
    }
  }, [items, processingQueue, updateItem]);

  // Auto-process queue
  useEffect(() => {
    if (step === "queue") {
      processNextInQueue();
    }
  }, [step, items, processNextInQueue]);

  // Check for completion
  useEffect(() => {
    if (step === "queue" && totalCount > 0) {
      const allDone = items.every(
        (item) => item.status === "completed" || item.status === "skipped"
      );
      if (allDone) {
        setStep("complete");
      }
    }
  }, [step, items, totalCount]);

  const handleImagesSelected = (imageDataList: string[]) => {
    addImages(imageDataList);
    setStep("queue");
    toast.success(`${imageDataList.length} images added to queue`);
    
    // Track analytics
    trackBulkScanStarted(imageDataList.length, user?.id, isElite ? "elite" : "free");
  };

  const handleReviewItem = (item: BulkScanItem) => {
    setCurrentItem(item.id);
    setReviewItem(item);
    
    // Track analytics
    trackScannerEvent("bulk_scan_item_review_opened", user?.id, isElite ? "elite" : "free");
  };

  const handleConfirmSelection = async (pick: ComicVinePick) => {
    if (!reviewItem || !user) return;

    try {
      // Create inventory item
      const { data: inventoryItem, error } = await supabase
        .from("inventory_items")
        .insert({
          user_id: user.id,
          title: pick.title,
          series: pick.volumeName || pick.title,
          issue_number: pick.issue,
          publisher: pick.publisher,
          year: pick.year,
          comicvine_volume_id: pick.volumeId?.toString(),
          comicvine_issue_id: pick.id?.toString(),
          writer: pick.writer,
          artist: pick.artist,
          cover_artist: pick.coverArtist,
          key_issue: !!pick.keyNotes,
          key_details: pick.keyNotes,
          images: {
            primary: reviewItem.uploadedImageUrl,
            others: [],
          },
        })
        .select("id")
        .single();

      if (error) throw error;

      markCompleted(reviewItem.id, inventoryItem.id);
      setReviewItem(null);
      toast.success("Comic added to inventory!");
      
      // Track analytics
      trackScannerEvent("bulk_scan_item_confirmed", user?.id, isElite ? "elite" : "free");
    } catch (err: any) {
      console.error("[BULK_SCAN] Failed to create inventory:", err);
      toast.error("Failed to save comic", {
        description: "Please try again",
      });
    }
  };

  const handleSkipItem = (id: string) => {
    markSkipped(id);
    if (reviewItem?.id === id) {
      setReviewItem(null);
    }
    
    // Track analytics
    trackScannerEvent("bulk_scan_item_skipped", user?.id, isElite ? "elite" : "free");
  };

  const handleManualSearch = (item: BulkScanItem) => {
    // For now, skip the item - manual search would need a separate flow
    toast.info("Manual search coming soon", {
      description: "Item skipped for now",
    });
    markSkipped(item.id);
    setReviewItem(null);
  };

  const handleClose = () => {
    onOpenChange(false);
  };

  const handleViewInventory = () => {
    // Track completion analytics
    const skippedCount = items.filter((i) => i.status === "skipped").length;
    trackBulkScanCompleted(completedCount, skippedCount, user?.id, isElite ? "elite" : "free");
    
    onComplete();
    handleClose();
  };

  // Show disabled message if feature is turned off
  if (!isEnabled("bulkScanEnabled") && open) {
    return (
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-muted-foreground" />
              Bulk Scan Temporarily Disabled
            </DialogTitle>
            <DialogDescription>
              This feature is temporarily unavailable. Please try again later or use Scanner Assist for single scans.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end pt-4">
            <Button variant="outline" onClick={handleClose}>
              Got it
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }
  if (!tierLoading && !isElite && open) {
    return (
      <>
        <Dialog open={open} onOpenChange={handleClose}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Crown className="w-5 h-5 text-amber-500" />
                Bulk Scan — Elite Feature
              </DialogTitle>
              <DialogDescription>
                Upgrade to Elite to scan multiple comics at once.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <ul className="space-y-2 text-sm">
                <li className="flex items-center gap-2">
                  <Layers className="w-4 h-4 text-primary" />
                  <span>Upload up to 20 comics at once</span>
                </li>
                <li className="flex items-center gap-2">
                  <Layers className="w-4 h-4 text-primary" />
                  <span>Process entire stacks in minutes</span>
                </li>
                <li className="flex items-center gap-2">
                  <Layers className="w-4 h-4 text-primary" />
                  <span>Review and confirm each match</span>
                </li>
              </ul>
              <div className="flex flex-col gap-2 pt-2">
                <Button
                  onClick={() => setShowUpgradeModal(true)}
                  className="w-full bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 text-white"
                >
                  <Crown className="w-4 h-4 mr-2" />
                  Upgrade to Elite
                </Button>
                <Button variant="ghost" onClick={handleClose}>
                  Maybe later
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
        <UpgradeToEliteModal
          open={showUpgradeModal}
          onOpenChange={setShowUpgradeModal}
          feature="Bulk Scan"
        />
      </>
    );
  }

  return (
    <>
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle className="flex items-center gap-2">
                <Layers className="w-5 h-5 text-primary" />
                Bulk Scan
              </DialogTitle>
              <Badge className="text-xs bg-amber-500/20 text-amber-600 border-amber-500/30">
                <Crown className="w-3 h-3 mr-1" />
                Elite
              </Badge>
            </div>
            <DialogDescription>
              {step === "upload" &&
                "Upload multiple comic covers to scan them all at once."}
              {step === "queue" &&
                "Review each comic and confirm to add to inventory."}
              {step === "complete" && "All comics processed!"}
            </DialogDescription>
          </DialogHeader>

          <div className="py-2">
            {step === "upload" && (
              <BulkScanUploader onImagesSelected={handleImagesSelected} />
            )}

            {step === "queue" && (
              <BulkScanQueue
                items={items}
                completedCount={completedCount}
                totalCount={totalCount}
                currentItemId={currentItemId}
                onReviewItem={handleReviewItem}
                onSkipItem={handleSkipItem}
                onManualSearch={handleManualSearch}
              />
            )}

            {step === "complete" && (
              <div className="text-center py-8 space-y-4">
                <div className="w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-8 h-8 text-green-500" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold">Bulk Scan Complete!</h3>
                  <p className="text-sm text-muted-foreground">
                    {completedCount} comic{completedCount !== 1 ? "s" : ""} added
                    to your inventory
                  </p>
                </div>
                <Button onClick={handleViewInventory} className="gap-2">
                  View Inventory
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Review Modal */}
      <BulkScanReviewModal
        open={reviewItem !== null}
        onOpenChange={(open) => !open && setReviewItem(null)}
        item={reviewItem}
        onConfirm={handleConfirmSelection}
        onSkip={() => reviewItem && handleSkipItem(reviewItem.id)}
        onManualSearch={() => reviewItem && handleManualSearch(reviewItem)}
      />
    </>
  );
}
