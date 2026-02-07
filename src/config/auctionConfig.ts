/**
 * Auction system configuration
 * 
 * Single guard controls all auction interactivity.
 * When false: UI renders in preview mode, all actions disabled.
 * When true: (future) bidding, timers, and settlement become active.
 */

export const AUCTIONS_ENABLED = false;

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export type AuctionLotStatus = "preview" | "live" | "ended";

export interface AuctionEvent {
  eventId: string;
  eventTitle: string;
  /** If set, every lot in the event closes relative to this anchor */
  hardCloseAt?: string; // ISO-8601
  /** Seconds between successive lot closes (default 20) */
  lotCloseGapSeconds: number;
  timezoneLabel: string;
}

export interface AuctionPreviewItem {
  id: string;
  title: string;
  issue: string;
  publisher: string;
  year: string;
  grade: string;
  certification: string;
  imageUrl: string;
  currentBid: number;
  nextMinBid: number;
  /** @deprecated — use computeCloseAt() instead */
  endsAt: Date;
  bidCount: number;

  /* ---- v2 fields ---- */
  lotNumber?: number;
  /** Standalone close time (non-event lots) */
  baseCloseAt?: string; // ISO-8601
  /** Index within an event, used to compute stagger offset */
  eventLotIndex?: number;
  startingBid?: number;
  buyNowPrice?: number;
  status?: AuctionLotStatus;
  /** Reference to shared event definition */
  auctionEvent?: AuctionEvent;
}

/* ------------------------------------------------------------------ */
/*  Shared Event Definitions                                           */
/* ------------------------------------------------------------------ */

const FRIDAY_NIGHT_EVENT: AuctionEvent = {
  eventId: "event-friday-night-grails",
  eventTitle: "Friday Night Grails",
  hardCloseAt: new Date(
    new Date().setHours(21, 0, 0, 0) + (
      // Push to next occurrence if already past 9 PM today
      new Date().getHours() >= 21 ? 24 * 60 * 60 * 1000 : 0
    )
  ).toISOString(),
  lotCloseGapSeconds: 20,
  timezoneLabel: "Local Time",
};

/* ------------------------------------------------------------------ */
/*  Sample Data                                                        */
/* ------------------------------------------------------------------ */

export const SAMPLE_AUCTIONS: AuctionPreviewItem[] = [
  {
    id: "auction-preview-1",
    title: "Amazing Spider-Man",
    issue: "#300",
    publisher: "Marvel",
    year: "1988",
    grade: "9.8",
    certification: "CGC",
    imageUrl: "/placeholder.svg",
    currentBid: 1250,
    nextMinBid: 1300,
    endsAt: new Date(Date.now() + 4 * 60 * 60 * 1000),
    bidCount: 14,
    lotNumber: 1,
    startingBid: 500,
    status: "preview",
    auctionEvent: FRIDAY_NIGHT_EVENT,
    eventLotIndex: 0,
  },
  {
    id: "auction-preview-2",
    title: "Incredible Hulk",
    issue: "#181",
    publisher: "Marvel",
    year: "1974",
    grade: "9.0",
    certification: "CGC",
    imageUrl: "/placeholder.svg",
    currentBid: 3200,
    nextMinBid: 3350,
    endsAt: new Date(Date.now() + 8 * 60 * 60 * 1000),
    bidCount: 22,
    lotNumber: 2,
    startingBid: 1500,
    status: "preview",
    auctionEvent: FRIDAY_NIGHT_EVENT,
    eventLotIndex: 1,
  },
  {
    id: "auction-preview-3",
    title: "Giant-Size X-Men",
    issue: "#1",
    publisher: "Marvel",
    year: "1975",
    grade: "9.4",
    certification: "CGC",
    imageUrl: "/placeholder.svg",
    currentBid: 2850,
    nextMinBid: 2950,
    endsAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    bidCount: 18,
    lotNumber: 3,
    startingBid: 1000,
    status: "preview",
    auctionEvent: FRIDAY_NIGHT_EVENT,
    eventLotIndex: 2,
  },
  {
    id: "auction-preview-4",
    title: "Batman Adventures",
    issue: "#12",
    publisher: "DC",
    year: "1993",
    grade: "9.6",
    certification: "CGC",
    imageUrl: "/placeholder.svg",
    currentBid: 1800,
    nextMinBid: 1875,
    endsAt: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
    bidCount: 9,
    lotNumber: 4,
    startingBid: 800,
    status: "preview",
    auctionEvent: FRIDAY_NIGHT_EVENT,
    eventLotIndex: 3,
  },
  {
    id: "auction-preview-5",
    title: "Ultimate Fallout",
    issue: "#4",
    publisher: "Marvel",
    year: "2011",
    grade: "9.8",
    certification: "CGC",
    imageUrl: "/placeholder.svg",
    currentBid: 680,
    nextMinBid: 720,
    endsAt: new Date(Date.now() + 6 * 60 * 60 * 1000),
    bidCount: 7,
    lotNumber: 5,
    startingBid: 300,
    status: "preview",
    // standalone — no event
    baseCloseAt: new Date(Date.now() + 6 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "auction-preview-6",
    title: "Teenage Mutant Ninja Turtles",
    issue: "#1",
    publisher: "Mirage",
    year: "1984",
    grade: "8.5",
    certification: "CGC",
    imageUrl: "/placeholder.svg",
    currentBid: 5100,
    nextMinBid: 5300,
    endsAt: new Date(Date.now() + 12 * 60 * 60 * 1000),
    bidCount: 31,
    lotNumber: 6,
    startingBid: 2500,
    status: "preview",
    baseCloseAt: new Date(Date.now() + 12 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "auction-preview-7",
    title: "New Mutants",
    issue: "#98",
    publisher: "Marvel",
    year: "1991",
    grade: "9.6",
    certification: "CGC",
    imageUrl: "/placeholder.svg",
    currentBid: 920,
    nextMinBid: 960,
    endsAt: new Date(Date.now() + 3 * 60 * 60 * 1000),
    bidCount: 11,
    lotNumber: 7,
    startingBid: 400,
    status: "preview",
    auctionEvent: FRIDAY_NIGHT_EVENT,
    eventLotIndex: 4,
  },
  {
    id: "auction-preview-8",
    title: "Spawn",
    issue: "#1",
    publisher: "Image",
    year: "1992",
    grade: "9.8",
    certification: "CGC",
    imageUrl: "/placeholder.svg",
    currentBid: 420,
    nextMinBid: 450,
    endsAt: new Date(Date.now() + 48 * 60 * 60 * 1000),
    bidCount: 5,
    lotNumber: 8,
    startingBid: 200,
    status: "preview",
    baseCloseAt: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(),
  },
];

/* ------------------------------------------------------------------ */
/*  Close-time Helpers                                                 */
/* ------------------------------------------------------------------ */

/**
 * Compute the effective close timestamp for a lot.
 *
 * Priority:
 * 1. Event hardCloseAt + (eventLotIndex × lotCloseGapSeconds)
 * 2. lot.baseCloseAt
 * 3. lot.endsAt (legacy fallback)
 * 4. now + 24h
 */
export function computeCloseAt(lot: AuctionPreviewItem): Date {
  if (lot.auctionEvent?.hardCloseAt != null && lot.eventLotIndex != null) {
    const anchor = new Date(lot.auctionEvent.hardCloseAt).getTime();
    const offset = lot.eventLotIndex * (lot.auctionEvent.lotCloseGapSeconds ?? 20) * 1000;
    return new Date(anchor + offset);
  }
  if (lot.baseCloseAt) {
    return new Date(lot.baseCloseAt);
  }
  if (lot.endsAt) {
    return lot.endsAt;
  }
  return new Date(Date.now() + 24 * 60 * 60 * 1000);
}

/**
 * Human-readable countdown / time label.
 *
 * > 24h  → "1 day 3 hours"
 * > 1h   → "3 hours 12 min"
 * ≤ 1h   → "12:34" (mm:ss style)
 * ≤ 0    → "Ended"
 */
export function getAuctionTimeLabel(endsAtOrDate: Date): string {
  const now = Date.now();
  const diff = endsAtOrDate.getTime() - now;

  if (diff <= 0) return "Ended";

  const totalSeconds = Math.floor(diff / 1000);
  const totalMinutes = Math.floor(totalSeconds / 60);
  const totalHours = Math.floor(totalMinutes / 60);
  const days = Math.floor(totalHours / 24);

  if (days >= 1) {
    const remainingHours = totalHours - days * 24;
    return remainingHours > 0
      ? `${days}d ${remainingHours}h`
      : `${days} day${days !== 1 ? "s" : ""}`;
  }

  if (totalHours >= 1) {
    const remainingMinutes = totalMinutes - totalHours * 60;
    return `${totalHours}h ${remainingMinutes}m`;
  }

  // Under 1 hour — mm:ss
  const mins = totalMinutes;
  const secs = totalSeconds - mins * 60;
  return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}

/**
 * Format a date as a short human-friendly time string (e.g. "9:00 PM").
 */
export function formatCloseTime(date: Date): string {
  return date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
}
