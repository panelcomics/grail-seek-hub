/**
 * SCANNER STATE TYPES & COPY CONSTANTS
 * ==========================================================================
 * Production-ready UX copy for all scanner states.
 * No screen ever says "failure" - users always have a forward action.
 * ==========================================================================
 */

export type ScannerState =
  | 'idle'
  | 'scanning'
  | 'transition'      // New: brief "Identifying match..." state
  | 'result'          // New: unified result summary card
  | 'match_high'
  | 'match_medium'
  | 'match_low'
  | 'multi_match'
  | 'confirm'
  | 'success'
  | 'error_camera'
  | 'error_image'
  | 'error_network';

export interface ScannerCopy {
  header: string;
  subtext: string;
  primaryButton?: string;
  secondaryButton?: string;
  tertiaryButton?: string;
  helperText?: string;
}

export const SCANNER_COPY: Record<ScannerState, ScannerCopy> = {
  idle: {
    header: "Scan Comic Cover",
    subtext: "Align the full cover inside the frame\nWorks best with flat, well-lit covers",
    primaryButton: "Start Scan",
    secondaryButton: "Upload Photo Instead",
    helperText: "Optimized for comics, variants, and slabs",
  },
  scanning: {
    header: "Scanning Cover…",
    subtext: "Identifying title and issue",
  },
  transition: {
    header: "Scan Complete",
    subtext: "Identifying match…",
  },
  result: {
    header: "Scan Complete",
    subtext: "We found the closest match — quick review before listing.",
    primaryButton: "Confirm & Continue",
    secondaryButton: "Edit Details",
    tertiaryButton: "Scan Again",
  },
  match_high: {
    header: "Scan Complete",
    subtext: "We found the closest match — quick review before listing.",
    primaryButton: "Confirm & Continue",
    secondaryButton: "Edit Details",
    tertiaryButton: "Scan Again",
  },
  match_medium: {
    header: "Scan Complete",
    subtext: "We found a possible match — quick review helps accuracy.",
    primaryButton: "Review Match",
    secondaryButton: "Search Manually",
  },
  match_low: {
    header: "Scan Complete",
    subtext: "We're still learning this one — add details to continue.",
    primaryButton: "Add Details",
    secondaryButton: "Try Another Photo",
    helperText: "You can always edit details after",
  },
  multi_match: {
    header: "Scan Complete",
    subtext: "Choose the closest match — you can edit details next.",
    primaryButton: "Confirm & Continue",
    tertiaryButton: "Search Manually",
  },
  confirm: {
    header: "Quick Check Before Listing",
    subtext: "Most sellers confirm in under 10 seconds.",
    primaryButton: "Save & Continue",
    secondaryButton: "Back to Scan",
  },
  success: {
    header: "Book Ready to List",
    subtext: "You can edit pricing, condition, or photos anytime.",
    primaryButton: "Set Price & Condition",
    secondaryButton: "Scan Another Book",
    tertiaryButton: "Go to My Listings",
  },
  error_camera: {
    header: "Camera Access Needed",
    subtext: "Enable camera access to scan covers.",
    primaryButton: "Enable Camera",
  },
  error_image: {
    header: "Let's Try a Clearer Photo",
    subtext: "Flat, well-lit covers scan best.",
    primaryButton: "Retake Photo",
    secondaryButton: "Upload Instead",
  },
  error_network: {
    header: "Connection Interrupted",
    subtext: "Check your connection and try again.",
    primaryButton: "Retry Scan",
    secondaryButton: "Save Photo & Finish Later",
  },
};

// Rotating subtext messages for scanning state
export const SCANNING_MESSAGES = [
  "Identifying title and issue",
  "Checking known variants",
  "Comparing cover layout",
];

// Confidence thresholds for state determination
export const CONFIDENCE_THRESHOLDS = {
  HIGH: 0.80,
  MEDIUM: 0.45,
};

/**
 * Determine scanner state based on results and confidence
 */
export function determineScannerState(
  confidenceScore: number | null,
  possibleMatches: any[],
  hasError: boolean = false,
  errorType?: 'camera' | 'image' | 'network'
): ScannerState {
  // Error states
  if (hasError && errorType) {
    return `error_${errorType}` as ScannerState;
  }

  // No results
  if (!possibleMatches || possibleMatches.length === 0) {
    return 'match_low';
  }

  // Multiple matches
  if (possibleMatches.length > 1 && (confidenceScore === null || confidenceScore < CONFIDENCE_THRESHOLDS.HIGH)) {
    return 'multi_match';
  }

  // Single match - determine by confidence
  if (confidenceScore !== null) {
    if (confidenceScore >= CONFIDENCE_THRESHOLDS.HIGH) {
      return 'match_high';
    }
    if (confidenceScore >= CONFIDENCE_THRESHOLDS.MEDIUM) {
      return 'match_medium';
    }
  }

  return 'match_low';
}
