import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Gavel, Clock, Lock } from "lucide-react";
import { Link } from "react-router-dom";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  AuctionPreviewItem,
  computeCloseAt,
  getAuctionTimeLabel,
  formatCloseTime,
} from "@/config/auctionConfig";

interface AuctionPreviewCardProps {
  auction: AuctionPreviewItem;
}

export function AuctionPreviewCard({ auction }: AuctionPreviewCardProps) {
  const closeAt = computeCloseAt(auction);
  const timeLabel = getAuctionTimeLabel(closeAt);
  const isEnded = timeLabel === "Ended";
  const isUrgent = !isEnded && closeAt.getTime() - Date.now() < 60 * 60 * 1000; // < 1h

  const bidDisplay = auction.currentBid > 0 ? auction.currentBid : auction.startingBid ?? 0;
  const bidLabel = auction.currentBid > 0 ? "Current Bid" : "Starting Bid";

  const hasHardClose = !!auction.auctionEvent?.hardCloseAt;

  return (
    <Link to={`/auction/${auction.id}`} className="block group">
      <Card className="overflow-hidden border-border/50 hover:shadow-lg transition-all duration-300 hover:-translate-y-1 h-full flex flex-col">
        {/* Time Ribbon */}
        <div
          className={`flex items-center justify-center gap-1.5 px-2 py-1.5 text-[11px] font-semibold ${
            isEnded
              ? "bg-muted text-muted-foreground"
              : isUrgent
              ? "bg-destructive text-destructive-foreground"
              : "bg-primary/10 text-primary"
          }`}
        >
          <Clock className="h-3 w-3" />
          {isEnded ? "Ended" : `Preview closes: ${timeLabel}`}
        </div>

        {/* Cover Image */}
        <div className="relative aspect-[3/4] bg-muted overflow-hidden">
          <img
            src={auction.imageUrl}
            alt={`${auction.title} ${auction.issue}`}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            loading="lazy"
          />
          {/* Preview badge */}
          <Badge
            variant="secondary"
            className="absolute top-2 left-2 text-[10px] gap-1 bg-secondary/90 backdrop-blur-sm"
          >
            <Gavel className="h-3 w-3" />
            Preview
          </Badge>
          <Badge
            variant="outline"
            className="absolute bottom-2 right-2 text-[9px] bg-background/80 backdrop-blur-sm text-muted-foreground"
          >
            Bidding Disabled
          </Badge>

          {/* Lot number */}
          {auction.lotNumber != null && (
            <div className="absolute bottom-2 left-2 bg-background/90 backdrop-blur-sm text-foreground text-[10px] font-bold px-1.5 py-0.5 rounded">
              Lot #{auction.lotNumber}
            </div>
          )}
        </div>

        {/* Card Body */}
        <CardContent className="p-3 space-y-2 flex-1 flex flex-col">
          {/* Title + meta */}
          <div>
            <h3 className="font-bold text-sm text-foreground line-clamp-1">
              {auction.title}
            </h3>
            <p className="text-xs text-muted-foreground">
              {auction.issue} • {auction.certification} {auction.grade}
            </p>
          </div>

          {/* Bid info */}
          <div className="flex items-baseline justify-between pt-1 border-t border-border/40">
            <div>
              <div className="text-[10px] text-muted-foreground">{bidLabel}</div>
              <div className="text-base font-black text-primary">
                ${bidDisplay.toLocaleString()}
              </div>
            </div>
            <div className="text-right">
              <div className="text-[10px] text-muted-foreground">
                {auction.bidCount} bid{auction.bidCount !== 1 ? "s" : ""}
              </div>
            </div>
          </div>

          {/* Hard-close indicator */}
          {hasHardClose && (
            <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
              <Lock className="h-3 w-3 flex-shrink-0" />
              <span>
                Hard close: {formatCloseTime(new Date(auction.auctionEvent!.hardCloseAt!))} ({auction.auctionEvent!.timezoneLabel})
              </span>
            </div>
          )}

          {/* CTA - always last */}
          <div className="mt-auto pt-2">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full text-xs font-bold gap-1.5"
                  >
                    <Gavel className="h-3.5 w-3.5" />
                    View Preview
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="top">
                  <p className="text-xs">Auction preview — bidding is not live yet</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
