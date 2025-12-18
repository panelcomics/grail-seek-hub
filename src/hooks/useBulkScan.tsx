/**
 * BULK SCAN HOOK
 * ==========================================================================
 * Manages state for Bulk Scan v2 (Elite only).
 * 
 * Core principle: NO auto-creation. Every item requires explicit user confirmation.
 * ==========================================================================
 */

import { useState, useCallback } from "react";
import { ComicVinePick } from "@/types/comicvine";

export type BulkScanItemStatus = 
  | "queued"
  | "processing"
  | "match_found"
  | "needs_review"
  | "no_match"
  | "completed"
  | "skipped";

export interface BulkScanItem {
  id: string;
  imageData: string;
  uploadedImageUrl: string | null;
  status: BulkScanItemStatus;
  candidates: ComicVinePick[];
  selectedPick: ComicVinePick | null;
  createdInventoryId: string | null;
  error: string | null;
}

interface UseBulkScanResult {
  items: BulkScanItem[];
  currentItemId: string | null;
  isProcessing: boolean;
  completedCount: number;
  totalCount: number;
  addImages: (imageDataList: string[]) => void;
  updateItem: (id: string, updates: Partial<BulkScanItem>) => void;
  setCurrentItem: (id: string | null) => void;
  markCompleted: (id: string, inventoryId: string) => void;
  markSkipped: (id: string) => void;
  resetQueue: () => void;
  getNextPendingItem: () => BulkScanItem | null;
}

export function useBulkScan(): UseBulkScanResult {
  const [items, setItems] = useState<BulkScanItem[]>([]);
  const [currentItemId, setCurrentItemId] = useState<string | null>(null);

  const addImages = useCallback((imageDataList: string[]) => {
    const newItems: BulkScanItem[] = imageDataList.map((imageData, index) => ({
      id: `bulk-${Date.now()}-${index}`,
      imageData,
      uploadedImageUrl: null,
      status: "queued",
      candidates: [],
      selectedPick: null,
      createdInventoryId: null,
      error: null,
    }));
    setItems((prev) => [...prev, ...newItems]);
  }, []);

  const updateItem = useCallback((id: string, updates: Partial<BulkScanItem>) => {
    setItems((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, ...updates } : item
      )
    );
  }, []);

  const setCurrentItem = useCallback((id: string | null) => {
    setCurrentItemId(id);
  }, []);

  const markCompleted = useCallback((id: string, inventoryId: string) => {
    setItems((prev) =>
      prev.map((item) =>
        item.id === id
          ? { ...item, status: "completed", createdInventoryId: inventoryId }
          : item
      )
    );
    setCurrentItemId(null);
  }, []);

  const markSkipped = useCallback((id: string) => {
    setItems((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, status: "skipped" } : item
      )
    );
    setCurrentItemId(null);
  }, []);

  const resetQueue = useCallback(() => {
    setItems([]);
    setCurrentItemId(null);
  }, []);

  const getNextPendingItem = useCallback((): BulkScanItem | null => {
    return items.find(
      (item) =>
        item.status === "match_found" ||
        item.status === "needs_review" ||
        item.status === "no_match"
    ) || null;
  }, [items]);

  const isProcessing = items.some((item) => item.status === "processing");
  const completedCount = items.filter(
    (item) => item.status === "completed" || item.status === "skipped"
  ).length;
  const totalCount = items.length;

  return {
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
    getNextPendingItem,
  };
}
