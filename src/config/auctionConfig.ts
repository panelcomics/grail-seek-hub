/**
 * Auction system configuration
 * 
 * Single guard controls all auction interactivity.
 * When false: UI renders in preview mode, all actions disabled.
 * When true: (future) bidding, timers, and settlement become active.
 */

export const AUCTIONS_ENABLED = false;

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
  endsAt: Date;
  bidCount: number;
}

/**
 * Sample auction data for preview mode.
 * Replaced with real data when auctions go live.
 */
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
  },
];

/**
 * Get a static, human-readable time label for an auction end date.
 * No ticking — just a soft label.
 */
export function getAuctionTimeLabel(endsAt: Date): string {
  const now = new Date();
  const diff = endsAt.getTime() - now.getTime();

  if (diff <= 0) return "Ended";

  const hours = Math.floor(diff / (1000 * 60 * 60));
  const days = Math.floor(hours / 24);

  if (days >= 2) return `Ends in ${days} days`;
  if (days === 1) return "Ends Tomorrow";
  if (hours >= 1) return "Ends Today";
  return "Ending Soon";
}
