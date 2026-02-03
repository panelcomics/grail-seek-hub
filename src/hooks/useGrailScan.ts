/**
 * GRAIL SCAN HOOK
 * ==========================================================================
 * Manages Grail Scan feature state including mode selection and recap overlay.
 * This is an additive wrapper around the existing scanner flow.
 * ==========================================================================
 */

import { useState, useCallback, useEffect } from "react";
import {
  GrailScanMode,
  getStoredGrailScanMode,
  setStoredGrailScanMode,
} from "@/components/scanner/GrailScanModeSelector";

interface UseGrailScanResult {
  // Mode selection
  scanMode: GrailScanMode;
  setScanMode: (mode: GrailScanMode) => void;
  
  // Pre-scan mode selector visibility
  showModeSelector: boolean;
  setShowModeSelector: (show: boolean) => void;
  
  // Recap card visibility (after successful scan)
  showRecapCard: boolean;
  setShowRecapCard: (show: boolean) => void;
  
  // Actions
  dismissModeSelector: () => void;
  dismissRecapCard: () => void;
  resetGrailScan: () => void;
}

export function useGrailScan(): UseGrailScanResult {
  // Load persisted mode from localStorage
  const [scanMode, setScanModeState] = useState<GrailScanMode>(() => 
    getStoredGrailScanMode()
  );
  
  // Show mode selector before first scan in session
  const [showModeSelector, setShowModeSelector] = useState(true);
  
  // Show recap card after successful scan
  const [showRecapCard, setShowRecapCard] = useState(false);

  // Persist mode changes
  const setScanMode = useCallback((mode: GrailScanMode) => {
    setScanModeState(mode);
    setStoredGrailScanMode(mode);
  }, []);

  // Dismiss mode selector and proceed to scanner
  const dismissModeSelector = useCallback(() => {
    setShowModeSelector(false);
  }, []);

  // Dismiss recap card and show existing success flow
  const dismissRecapCard = useCallback(() => {
    setShowRecapCard(false);
  }, []);

  // Reset for new scan session
  const resetGrailScan = useCallback(() => {
    setShowRecapCard(false);
    // Don't reset mode selector - user already chose
  }, []);

  return {
    scanMode,
    setScanMode,
    showModeSelector,
    setShowModeSelector,
    showRecapCard,
    setShowRecapCard,
    dismissModeSelector,
    dismissRecapCard,
    resetGrailScan,
  };
}
