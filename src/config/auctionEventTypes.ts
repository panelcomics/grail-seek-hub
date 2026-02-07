/**
 * Auction Event configuration types and defaults for the seller wizard.
 * UI-only — no DB persistence. AUCTIONS_ENABLED guard still applies.
 */

export type AuctionEventType = "weekly" | "featured" | "event";

export type CloseMode = "hard_close" | "rolling_close";

export interface AuctionCloseSchedule {
  mode: CloseMode;
  /** ISO-8601 timestamp for hard close or rolling start */
  scheduledAt: string;
  staggerSecondsPerLot: 10 | 20 | 30 | 60;
  /** Allow anti-sniping extension */
  snipingEnabled: boolean;
  /** Seconds to extend when a last-second bid arrives */
  extensionWindowSeconds: number;
  /** Max number of extensions per lot */
  extensionMaxCount: number;
}

export interface MockLot {
  id: string;
  title: string;
  issue: string;
  imageUrl: string;
  grade: string;
  startingBid: number;
}

export interface AuctionEventDraft {
  id: string;
  name: string;
  type: AuctionEventType;
  description: string;
  coverImageUrl: string;
  closeSchedule: AuctionCloseSchedule;
  lots: MockLot[];
  status: "draft";
}

export const DEFAULT_CLOSE_SCHEDULE: AuctionCloseSchedule = {
  mode: "hard_close",
  scheduledAt: new Date(
    new Date().setHours(21, 0, 0, 0) + 7 * 24 * 60 * 60 * 1000
  ).toISOString(),
  staggerSecondsPerLot: 20,
  snipingEnabled: true,
  extensionWindowSeconds: 120,
  extensionMaxCount: 10,
};

export const STAGGER_OPTIONS: { value: 10 | 20 | 30 | 60; label: string }[] = [
  { value: 10, label: "10 seconds" },
  { value: 20, label: "20 seconds" },
  { value: 30, label: "30 seconds" },
  { value: 60, label: "60 seconds" },
];

/**
 * Sample events for the seller dashboard (client-side only).
 */
export const SAMPLE_SELLER_EVENTS: AuctionEventDraft[] = [
  {
    id: "seller-evt-1",
    name: "Friday Night Grails",
    type: "weekly",
    description: "Weekly auction featuring key issues.",
    coverImageUrl: "/placeholder.svg",
    closeSchedule: {
      mode: "hard_close",
      scheduledAt: new Date(
        new Date().setHours(21, 0, 0, 0) + (new Date().getHours() >= 21 ? 24 * 60 * 60 * 1000 : 0)
      ).toISOString(),
      staggerSecondsPerLot: 20,
      snipingEnabled: true,
      extensionWindowSeconds: 120,
      extensionMaxCount: 10,
    },
    lots: [],
    status: "draft",
  },
  {
    id: "seller-evt-2",
    name: "February Featured Auction",
    type: "featured",
    description: "Key issues ending in sequence.",
    coverImageUrl: "/placeholder.svg",
    closeSchedule: {
      mode: "hard_close",
      scheduledAt: "2026-02-12T21:00:00-06:00",
      staggerSecondsPerLot: 20,
      snipingEnabled: true,
      extensionWindowSeconds: 120,
      extensionMaxCount: 10,
    },
    lots: [],
    status: "draft",
  },
];
