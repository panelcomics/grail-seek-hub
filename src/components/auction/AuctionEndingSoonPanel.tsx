import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, CalendarClock } from "lucide-react";
import { Link } from "react-router-dom";
import {
  AuctionPreviewItem,
  computeCloseAt,
  getAuctionTimeLabel,
  SAMPLE_AUCTIONS,
} from "@/config/auctionConfig";

interface AuctionEndingSoonPanelProps {
  excludeId?: string;
  maxItems?: number;
}

function EndingSoonItem({ auction }: { auction: AuctionPreviewItem }) {
  const closeAt = computeCloseAt(auction);
  const timeLabel = getAuctionTimeLabel(closeAt);
  const isUrgent = timeLabel !== "Ended" && closeAt.getTime() - Date.now() < 60 * 60 * 1000;
  const hasEvent = !!auction.auctionEvent;

  const bidDisplay = auction.currentBid > 0 ? auction.currentBid : auction.startingBid ?? 0;

  return (
    <Link
      to={`/auction/${auction.id}`}
      className="flex gap-3 p-2 rounded-lg hover:bg-muted/60 transition-colors group"
    >
      <div className="w-12 h-16 flex-shrink-0 rounded overflow-hidden bg-muted">
        <img
          src={auction.imageUrl}
          alt={`${auction.title} ${auction.issue}`}
          className="w-full h-full object-cover"
          loading="lazy"
        />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1">
          <h4 className="text-xs font-bold text-foreground line-clamp-1 group-hover:text-primary transition-colors">
            {auction.title} {auction.issue}
          </h4>
          {hasEvent && (
            <Badge variant="outline" className="text-[8px] px-1 py-0 h-3.5 flex-shrink-0">
              <CalendarClock className="h-2 w-2 mr-0.5" />
              Event
            </Badge>
          )}
        </div>
        <p className="text-[10px] text-muted-foreground">
          {auction.certification} {auction.grade}
        </p>
        <div className="flex items-center justify-between mt-1">
          <span className="text-xs font-bold text-primary">
            ${bidDisplay.toLocaleString()}
          </span>
          <span
            className={`text-[10px] font-medium ${
              isUrgent ? "text-destructive" : "text-muted-foreground"
            }`}
          >
            {timeLabel}
          </span>
        </div>
      </div>
    </Link>
  );
}

export function AuctionEndingSoonPanel({ excludeId, maxItems = 8 }: AuctionEndingSoonPanelProps) {
  const auctions = SAMPLE_AUCTIONS
    .filter((a) => a.id !== excludeId)
    .sort((a, b) => computeCloseAt(a).getTime() - computeCloseAt(b).getTime())
    .slice(0, maxItems);

  if (auctions.length === 0) return null;

  return (
    <Card className="border-border/50">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-bold flex items-center gap-2 text-foreground">
          <Clock className="h-4 w-4 text-destructive" />
          Next Auctions Ending
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-1 p-3 pt-0">
        {auctions.map((auction) => (
          <EndingSoonItem key={auction.id} auction={auction} />
        ))}
      </CardContent>
    </Card>
  );
}

/**
 * Mobile-optimized horizontal scroll version for bottom of detail page.
 */
export function AuctionEndingSoonStrip({ excludeId }: { excludeId?: string }) {
  const auctions = SAMPLE_AUCTIONS
    .filter((a) => a.id !== excludeId)
    .sort((a, b) => computeCloseAt(a).getTime() - computeCloseAt(b).getTime())
    .slice(0, 10);

  if (auctions.length === 0) return null;

  return (
    <div className="py-4">
      <h3 className="text-sm font-bold text-foreground mb-3 flex items-center gap-2 px-4">
        <Clock className="h-4 w-4 text-destructive" />
        More Auctions Ending Soon
      </h3>
      <div className="overflow-x-auto scrollbar-hide px-4">
        <div className="flex gap-3 min-w-min pb-2">
          {auctions.map((auction) => {
            const closeAt = computeCloseAt(auction);
            const timeLabel = getAuctionTimeLabel(closeAt);
            const bidDisplay = auction.currentBid > 0 ? auction.currentBid : auction.startingBid ?? 0;
            const hasEvent = !!auction.auctionEvent;

            return (
              <Link
                key={auction.id}
                to={`/auction/${auction.id}`}
                className="flex-shrink-0 w-32 group"
              >
                <div className="rounded-lg overflow-hidden bg-muted aspect-[3/4] mb-1.5 relative">
                  <img
                    src={auction.imageUrl}
                    alt={`${auction.title} ${auction.issue}`}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    loading="lazy"
                  />
                  {hasEvent && (
                    <Badge
                      variant="outline"
                      className="absolute top-1 right-1 text-[7px] px-1 py-0 h-3 bg-background/80 backdrop-blur-sm"
                    >
                      Event
                    </Badge>
                  )}
                </div>
                <h4 className="text-[11px] font-bold text-foreground line-clamp-1 group-hover:text-primary transition-colors">
                  {auction.title} {auction.issue}
                </h4>
                <div className="flex items-center justify-between mt-0.5">
                  <span className="text-xs font-bold text-primary">
                    ${bidDisplay.toLocaleString()}
                  </span>
                  <span className="text-[9px] text-muted-foreground">
                    {timeLabel}
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
