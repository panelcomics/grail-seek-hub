import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Gavel, Clock, ChevronRight } from "lucide-react";
import {
  SAMPLE_AUCTIONS,
  AuctionPreviewItem,
  computeCloseAt,
} from "@/config/auctionConfig";

const MAX_LOTS = 10;
const ONE_HOUR_MS = 60 * 60 * 1000;

function formatCountdown(ms: number): string {
  if (ms <= 0) return "Ended";
  const totalSec = Math.floor(ms / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function getEndingSoonLots(): AuctionPreviewItem[] {
  const now = Date.now();
  const cutoff = now + ONE_HOUR_MS;

  const withClose = SAMPLE_AUCTIONS.map((lot) => ({
    lot,
    closeAt: computeCloseAt(lot),
  }));

  // Primary: lots ending within the next hour
  const withinHour = withClose
    .filter((l) => l.closeAt.getTime() > now && l.closeAt.getTime() <= cutoff)
    .sort((a, b) => a.closeAt.getTime() - b.closeAt.getTime());

  if (withinHour.length >= 3) {
    return withinHour.slice(0, MAX_LOTS).map((l) => l.lot);
  }

  // Fallback: next 10 ending lots overall
  return withClose
    .filter((l) => l.closeAt.getTime() > now)
    .sort((a, b) => a.closeAt.getTime() - b.closeAt.getTime())
    .slice(0, MAX_LOTS)
    .map((l) => l.lot);
}

function EndingCard({ auction }: { auction: AuctionPreviewItem }) {
  const closeAt = computeCloseAt(auction);
  const [remaining, setRemaining] = useState(closeAt.getTime() - Date.now());

  useEffect(() => {
    const id = setInterval(() => {
      setRemaining(closeAt.getTime() - Date.now());
    }, 1000);
    return () => clearInterval(id);
  }, [closeAt]);

  const isEnded = remaining <= 0;
  const isUrgent = !isEnded && remaining < 5 * 60 * 1000;
  const bidDisplay =
    auction.currentBid > 0 ? auction.currentBid : (auction.startingBid ?? 0);
  const bidLabel = auction.currentBid > 0 ? "Current Bid" : "Starting Bid";

  return (
    <Link
      to={`/auction/${auction.id}`}
      className="flex-shrink-0 w-[200px] sm:w-[220px] snap-start group"
    >
      <div className="rounded-lg border border-border/50 bg-card overflow-hidden hover:shadow-lg transition-all duration-300 hover:-translate-y-1 h-full flex flex-col">
        {/* Countdown ribbon */}
        <div
          className={`flex items-center justify-center gap-1 px-2 py-1 text-[10px] font-bold tracking-wide ${
            isEnded
              ? "bg-muted text-muted-foreground"
              : isUrgent
              ? "bg-destructive text-destructive-foreground"
              : "bg-primary/10 text-primary"
          }`}
        >
          <Clock className="h-3 w-3" />
          {isEnded ? "Ended" : `Sample auction sequence · ${formatCountdown(remaining)}`}
        </div>

        {/* Cover */}
        <div className="relative aspect-square bg-muted overflow-hidden">
          <img
            src={auction.imageUrl}
            alt={`${auction.title} ${auction.issue}`}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            loading="lazy"
          />
          <Badge
            variant="secondary"
            className="absolute top-1.5 left-1.5 text-[9px] gap-1 bg-secondary/90 backdrop-blur-sm"
          >
            <Gavel className="h-2.5 w-2.5" />
            Preview
          </Badge>
          <Badge
            variant="outline"
            className="absolute bottom-1.5 left-1.5 text-[8px] bg-background/80 backdrop-blur-sm text-muted-foreground"
          >
            Auction Preview
          </Badge>
          {auction.grade && (
            <Badge
              variant="outline"
              className="absolute top-1.5 right-1.5 text-[9px] bg-background/80 backdrop-blur-sm"
            >
              {auction.certification} {auction.grade}
            </Badge>
          )}
        </div>

        {/* Body */}
        <div className="p-2.5 flex flex-col flex-1 gap-1.5">
          <h4 className="font-bold text-xs text-foreground line-clamp-1">
            {auction.title} {auction.issue}
          </h4>

          <div className="flex items-baseline justify-between">
            <div>
              <span className="text-[9px] text-muted-foreground block">
                {bidLabel}
              </span>
              <span className="text-sm font-black text-primary">
                ${bidDisplay.toLocaleString()}
              </span>
            </div>
            <span className="text-[9px] text-muted-foreground">
              {auction.bidCount} bid{auction.bidCount !== 1 ? "s" : ""}
            </span>
          </div>

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="sm"
                  variant="outline"
                  className="w-full text-[10px] font-bold gap-1 mt-auto h-7"
                >
                  <Gavel className="h-3 w-3" />
                  View Preview
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top">
                <p className="text-xs">
                  Auction preview — bidding opens after beta.
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>
    </Link>
  );
}

export function AuctionEndingNextHourStrip() {
  const lots = getEndingSoonLots();
  const scrollRef = useRef<HTMLDivElement>(null);

  if (lots.length === 0) {
    return (
      <section className="py-6 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <h2 className="text-lg font-bold text-foreground">
          Auction Preview — Coming Soon
        </h2>
        <p className="text-xs text-muted-foreground mt-1 mb-4">
          See how curated auction events will work on GrailSeeker. Bidding opens after beta.
        </p>
        <div className="rounded-lg border border-dashed border-border p-8 text-center">
          <p className="text-sm text-muted-foreground font-medium">
            No auctions ending soon yet.
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Check back soon — we'll feature lots as events go live.
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className="py-6 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-1">
        <h2 className="text-lg font-bold text-foreground">
          Auction Preview — Coming Soon
        </h2>
        <Link
          to="/auctions?sort=ending_soon"
          className="text-xs text-primary hover:underline flex items-center gap-0.5"
        >
          See all auction previews
          <ChevronRight className="h-3 w-3" />
        </Link>
      </div>
      <p className="text-xs text-muted-foreground mb-4">
        See how curated auction events will work on GrailSeeker. Bidding opens after beta.
      </p>

      {/* Scrollable strip */}
      <div className="relative">
        {/* Left fade */}
        <div className="absolute left-0 top-0 bottom-0 w-6 bg-gradient-to-r from-background to-transparent z-10 pointer-events-none" />
        {/* Right fade */}
        <div className="absolute right-0 top-0 bottom-0 w-6 bg-gradient-to-l from-background to-transparent z-10 pointer-events-none" />

        <div
          ref={scrollRef}
          className="flex gap-3 overflow-x-auto snap-x snap-mandatory scrollbar-hide pb-2 px-1"
          style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
        >
          {lots.map((lot) => (
            <EndingCard key={lot.id} auction={lot} />
          ))}
        </div>
      </div>

      {/* Seller CTA */}
      <div className="mt-6 rounded-lg border border-border/50 bg-muted/30 p-4 text-center space-y-2">
        <p className="text-sm text-foreground font-medium">
          Want to run an auction event on GrailSeeker?
        </p>
        <p className="text-xs text-muted-foreground">
          Curated seller shows and auction houses are opening soon.
        </p>
        <Link to="/seller/onboarding">
          <Button variant="outline" size="sm" className="mt-1 text-xs font-bold gap-1.5">
            <Gavel className="h-3.5 w-3.5" />
            Apply to Run an Auction Show
          </Button>
        </Link>
      </div>
    </section>
  );
}
