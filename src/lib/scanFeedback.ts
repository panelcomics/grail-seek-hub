/**
 * Scan Feedback Storage
 * =====================
 * Stores user corrections for scanner results locally.
 * This data can be used to improve matching accuracy over time.
 */

export interface ScanCorrection {
  id: string;
  timestamp: number;
  // What the scanner detected
  detectedTitle: string | null;
  detectedIssue: string | null;
  detectedPublisher: string | null;
  detectedYear: string | null;
  detectedComicVineId: number | null;
  // What the user corrected to (null if scanner was correct)
  correctedTitle: string | null;
  correctedIssue: string | null;
  correctedPublisher: string | null;
  correctedYear: string | null;
  correctedComicVineId: number | null;
  // Feedback
  wasCorrect: boolean;
  confidence: number | null;
  // Optional: OCR text for future training
  ocrText?: string;
}

const STORAGE_KEY = 'grailseeker_scan_corrections';
const MAX_CORRECTIONS = 500; // Keep last 500 corrections

/**
 * Get all stored corrections
 */
export function getScanCorrections(): ScanCorrection[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

/**
 * Save a scan correction/feedback
 */
export function saveScanCorrection(correction: Omit<ScanCorrection, 'id' | 'timestamp'>): void {
  try {
    const corrections = getScanCorrections();
    
    const newCorrection: ScanCorrection = {
      ...correction,
      id: crypto.randomUUID(),
      timestamp: Date.now(),
    };
    
    corrections.unshift(newCorrection);
    
    // Keep only the last MAX_CORRECTIONS
    const trimmed = corrections.slice(0, MAX_CORRECTIONS);
    
    localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
  } catch (error) {
    console.error('Failed to save scan correction:', error);
  }
}

/**
 * Mark a scan as correct (positive feedback)
 */
export function markScanCorrect(
  detectedTitle: string | null,
  detectedIssue: string | null,
  detectedPublisher: string | null,
  detectedYear: string | null,
  detectedComicVineId: number | null,
  confidence: number | null
): void {
  saveScanCorrection({
    detectedTitle,
    detectedIssue,
    detectedPublisher,
    detectedYear,
    detectedComicVineId,
    correctedTitle: null,
    correctedIssue: null,
    correctedPublisher: null,
    correctedYear: null,
    correctedComicVineId: null,
    wasCorrect: true,
    confidence,
  });
}

/**
 * Mark a scan as incorrect and save the correction
 */
export function markScanIncorrect(
  detected: {
    title: string | null;
    issue: string | null;
    publisher: string | null;
    year: string | null;
    comicVineId: number | null;
  },
  corrected: {
    title: string | null;
    issue: string | null;
    publisher: string | null;
    year: string | null;
    comicVineId: number | null;
  },
  confidence: number | null,
  ocrText?: string
): void {
  saveScanCorrection({
    detectedTitle: detected.title,
    detectedIssue: detected.issue,
    detectedPublisher: detected.publisher,
    detectedYear: detected.year,
    detectedComicVineId: detected.comicVineId,
    correctedTitle: corrected.title,
    correctedIssue: corrected.issue,
    correctedPublisher: corrected.publisher,
    correctedYear: corrected.year,
    correctedComicVineId: corrected.comicVineId,
    wasCorrect: false,
    confidence,
    ocrText,
  });
}

/**
 * Get accuracy stats from stored corrections
 */
export function getScanAccuracyStats(): {
  total: number;
  correct: number;
  incorrect: number;
  accuracyRate: number;
} {
  const corrections = getScanCorrections();
  const correct = corrections.filter(c => c.wasCorrect).length;
  const incorrect = corrections.filter(c => !c.wasCorrect).length;
  const total = corrections.length;
  
  return {
    total,
    correct,
    incorrect,
    accuracyRate: total > 0 ? (correct / total) * 100 : 0,
  };
}

/**
 * Clear all stored corrections
 */
export function clearScanCorrections(): void {
  localStorage.removeItem(STORAGE_KEY);
}
