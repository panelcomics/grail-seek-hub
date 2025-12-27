/**
 * SCANNER GUIDANCE OVERLAY
 * ==========================================================================
 * Visual guides to help users take better photos.
 * - Ghost frame for alignment
 * - Dynamic hints that rotate
 * - Slab mode specific guidance
 * - Pre-scan ready state
 * ==========================================================================
 */

import { useState, useEffect } from "react";
import { FormatFilter } from "./ScannerAssistChips";

interface ScannerGuidanceOverlayProps {
  format: FormatFilter;
  isReady?: boolean;
}

// Rotating tips for better scan quality
const SCANNING_TIPS = [
  "Move phone slightly back if too close",
  "Keep cover straight for best results",
  "Reduce glare or tilt slightly",
  "Flat background helps scanning",
  "Good lighting improves accuracy",
];

const SLAB_TIPS = [
  "Include the top label if possible",
  "Case glare is okay — label text helps",
  "Center the slab in frame",
  "CGC/PGX/CBCS labels help matching",
];

export function ScannerGuidanceOverlay({ 
  format, 
  isReady = false 
}: ScannerGuidanceOverlayProps) {
  const [tipIndex, setTipIndex] = useState(0);
  const isSlabMode = format === 'slab';
  const tips = isSlabMode ? SLAB_TIPS : SCANNING_TIPS;

  // Rotate tips every 3 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setTipIndex((prev) => (prev + 1) % tips.length);
    }, 3000);
    return () => clearInterval(interval);
  }, [tips.length]);

  return (
    <div className="absolute inset-0 pointer-events-none">
      {/* Ghost frame - comic book aspect ratio guide */}
      <div className="absolute inset-4 sm:inset-8 flex items-center justify-center">
        <div 
          className="relative w-full max-w-[200px] sm:max-w-[240px] border-2 border-dashed border-white/40 rounded-lg"
          style={{ aspectRatio: '2/3' }}
        >
          {/* Corner accents */}
          <div className="absolute -top-1 -left-1 w-4 h-4 border-t-2 border-l-2 border-white/70 rounded-tl" />
          <div className="absolute -top-1 -right-1 w-4 h-4 border-t-2 border-r-2 border-white/70 rounded-tr" />
          <div className="absolute -bottom-1 -left-1 w-4 h-4 border-b-2 border-l-2 border-white/70 rounded-bl" />
          <div className="absolute -bottom-1 -right-1 w-4 h-4 border-b-2 border-r-2 border-white/70 rounded-br" />
        </div>
      </div>

      {/* Top overlay text */}
      <div className="absolute top-2 left-0 right-0 text-center px-4">
        <div className="inline-block bg-black/60 backdrop-blur-sm rounded-full px-3 py-1.5">
          <p className="text-white text-xs sm:text-sm font-medium">
            {isSlabMode ? "Include top label if possible" : "Align full cover inside frame"}
          </p>
        </div>
      </div>

      {/* Bottom overlay - tips or ready state */}
      <div className="absolute bottom-12 left-0 right-0 text-center px-4">
        {isReady ? (
          <div className="inline-block bg-primary/90 backdrop-blur-sm rounded-full px-4 py-2">
            <p className="text-primary-foreground text-sm font-medium">
              Ready to scan
            </p>
            <p className="text-primary-foreground/80 text-xs">
              You can always edit details after
            </p>
          </div>
        ) : (
          <div className="inline-block bg-black/60 backdrop-blur-sm rounded-full px-3 py-1.5">
            <p className="text-white/90 text-xs transition-opacity duration-300">
              {isSlabMode ? "Case glare is okay — label text helps" : "Logo + issue number visible works best"}
            </p>
          </div>
        )}
      </div>

      {/* Rotating tip - middle area */}
      {!isReady && (
        <div className="absolute bottom-24 left-0 right-0 text-center px-4">
          <p 
            key={tipIndex}
            className="text-white/70 text-xs animate-fade-in"
          >
            💡 {tips[tipIndex]}
          </p>
        </div>
      )}
    </div>
  );
}
