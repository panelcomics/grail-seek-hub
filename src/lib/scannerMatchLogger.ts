/**
 * SCANNER MATCH LOGGER
 * ==========================================================================
 * Logs scanner match attempts to scanner_match_logs table for debugging.
 * Only logs for authenticated users. Logs silently without blocking UX.
 * ==========================================================================
 */

import { supabase } from "@/integrations/supabase/client";

interface ScannerMatchLogData {
  userId?: string;
  imageSizeKb?: number;
  imageResolution?: string;
  matched: boolean;
  confidence?: number;
  candidateCount: number;
  ocrText?: string;
  extractedTitle?: string;
  extractedIssue?: string;
  extractedPublisher?: string;
  matchMode?: string;
}

/**
 * Log a scanner match attempt to the database
 * Fails silently - never blocks the main UX flow
 */
export async function logScannerMatchAttempt(data: ScannerMatchLogData): Promise<void> {
  try {
    // Only log if user is authenticated
    if (!data.userId) {
      console.log("[SCANNER_LOG] Skipping log - no user ID");
      return;
    }

    const { error } = await (supabase as any).from("scanner_match_logs").insert({
      user_id: data.userId,
      image_size_kb: data.imageSizeKb || null,
      image_resolution: data.imageResolution || null,
      matched: data.matched,
      confidence: data.confidence || null,
      candidate_count: data.candidateCount,
      ocr_text: data.ocrText?.slice(0, 500) || null, // Truncate to 500 chars
      extracted_title: data.extractedTitle || null,
      extracted_issue: data.extractedIssue || null,
      extracted_publisher: data.extractedPublisher || null,
      match_mode: data.matchMode || null,
    });

    if (error) {
      console.warn("[SCANNER_LOG] Failed to log match attempt:", error.message);
    } else {
      console.log("[SCANNER_LOG] Match attempt logged successfully");
    }
  } catch (err) {
    // Silently fail - logging should never break the scanner
    console.warn("[SCANNER_LOG] Error logging match attempt:", err);
  }
}

/**
 * Estimate image size in KB from base64 data URL
 */
export function estimateImageSizeKb(dataUrl: string): number {
  // Remove the data:image/...;base64, prefix
  const base64 = dataUrl.split(",")[1] || "";
  // Base64 encoding increases size by ~33%, so actual bytes ≈ length * 0.75
  const bytes = base64.length * 0.75;
  return Math.round(bytes / 1024);
}
