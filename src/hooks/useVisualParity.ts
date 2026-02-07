/**
 * Visual Parity Upgrade Feature Flag Hook
 * 
 * Controls the ENABLE_VISUAL_PARITY_UPGRADE flag.
 * Default: false (UI unchanged).
 * When true: enhanced card visuals, grid density toggle, contrast tuning.
 */

import { useState, useEffect } from "react";

const FLAG_KEY = "ENABLE_VISUAL_PARITY_UPGRADE";
const DENSITY_KEY = "grailseeker_grid_density";

export type GridDensity = "comfortable" | "compact";

/**
 * Check if Visual Parity Upgrade is enabled.
 * Reads from localStorage so admins can toggle in browser console:
 *   localStorage.setItem('ENABLE_VISUAL_PARITY_UPGRADE', 'true')
 */
export function useVisualParityFlag(): boolean {
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(FLAG_KEY);
    setEnabled(stored === "true");

    // Listen for storage changes (cross-tab sync)
    const handler = (e: StorageEvent) => {
      if (e.key === FLAG_KEY) {
        setEnabled(e.newValue === "true");
      }
    };
    window.addEventListener("storage", handler);
    return () => window.removeEventListener("storage", handler);
  }, []);

  return enabled;
}

/**
 * Grid density preference (localStorage-persisted).
 * Only active when visual parity flag is ON.
 */
export function useGridDensity(): [GridDensity, (d: GridDensity) => void] {
  const [density, setDensityState] = useState<GridDensity>(() => {
    if (typeof window === "undefined") return "comfortable";
    return (localStorage.getItem(DENSITY_KEY) as GridDensity) || "comfortable";
  });

  const setDensity = (d: GridDensity) => {
    setDensityState(d);
    localStorage.setItem(DENSITY_KEY, d);
  };

  return [density, setDensity];
}
