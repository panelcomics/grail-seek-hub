/**
 * SCANNER ANALYTICS
 * ==========================================================================
 * Privacy-respecting analytics for Scanner Assist and Bulk Scan.
 * 
 * Policy:
 * - NO images, OCR text, comic titles, or raw queries stored
 * - Only event names, timestamps, tier, and numeric counts
 * ==========================================================================
 */

import { supabase } from "@/integrations/supabase/client";
import { getFeatureFlag } from "@/config/featureFlags";

export type ScannerEvent =
  | "scanner_assist_started"
  | "scanner_assist_candidates_returned"
  | "scanner_assist_confirmed"
  | "scanner_assist_no_match"
  | "scanner_assist_skipped"
  | "bulk_scan_started"
  | "bulk_scan_item_review_opened"
  | "bulk_scan_item_confirmed"
  | "bulk_scan_item_skipped"
  | "bulk_scan_completed"
  | "upgrade_modal_shown_scanner_limit"
  | "upgrade_clicked_from_scanner_limit";

interface EventMetadata {
  candidate_count_bucket?: "0" | "1-2" | "3-5";
  image_count?: number;
  confirmed_count?: number;
  skipped_count?: number;
}

/**
 * Get candidate count bucket (privacy-preserving)
 */
function getCandidateCountBucket(count: number): "0" | "1-2" | "3-5" {
  if (count === 0) return "0";
  if (count <= 2) return "1-2";
  return "3-5";
}

/**
 * Track a scanner-related event
 */
export async function trackScannerEvent(
  event: ScannerEvent,
  userId?: string,
  tier?: "free" | "elite",
  metadata?: EventMetadata
): Promise<void> {
  // Check if analytics is enabled
  if (!getFeatureFlag("analyticsEnabled")) {
    return;
  }

  try {
    const { error } = await supabase.from("usage_events").insert({
      event_name: event,
      user_id: userId || null,
      tier: tier || null,
      metadata: metadata || null,
    });

    if (error) {
      console.warn("[SCANNER_ANALYTICS] Failed to track event:", error);
    }
  } catch (err) {
    // Silently fail - analytics should never break the app
    console.warn("[SCANNER_ANALYTICS] Error:", err);
  }
}

/**
 * Helper: Track scanner assist started
 */
export function trackScannerAssistStarted(userId?: string, tier?: "free" | "elite"): void {
  trackScannerEvent("scanner_assist_started", userId, tier);
}

/**
 * Helper: Track candidates returned
 */
export function trackCandidatesReturned(
  candidateCount: number,
  userId?: string,
  tier?: "free" | "elite"
): void {
  trackScannerEvent("scanner_assist_candidates_returned", userId, tier, {
    candidate_count_bucket: getCandidateCountBucket(candidateCount),
  });
}

/**
 * Helper: Track scanner assist confirmed
 */
export function trackScannerAssistConfirmed(userId?: string, tier?: "free" | "elite"): void {
  trackScannerEvent("scanner_assist_confirmed", userId, tier);
}

/**
 * Helper: Track no match
 */
export function trackScannerAssistNoMatch(userId?: string, tier?: "free" | "elite"): void {
  trackScannerEvent("scanner_assist_no_match", userId, tier);
}

/**
 * Helper: Track bulk scan started
 */
export function trackBulkScanStarted(
  imageCount: number,
  userId?: string,
  tier?: "free" | "elite"
): void {
  trackScannerEvent("bulk_scan_started", userId, tier, {
    image_count: imageCount,
  });
}

/**
 * Helper: Track bulk scan completed
 */
export function trackBulkScanCompleted(
  confirmedCount: number,
  skippedCount: number,
  userId?: string,
  tier?: "free" | "elite"
): void {
  trackScannerEvent("bulk_scan_completed", userId, tier, {
    confirmed_count: confirmedCount,
    skipped_count: skippedCount,
  });
}

/**
 * Helper: Track upgrade modal shown
 */
export function trackUpgradeModalShown(userId?: string): void {
  trackScannerEvent("upgrade_modal_shown_scanner_limit", userId, "free");
}

/**
 * Helper: Track upgrade clicked
 */
export function trackUpgradeClicked(userId?: string): void {
  trackScannerEvent("upgrade_clicked_from_scanner_limit", userId, "free");
}
