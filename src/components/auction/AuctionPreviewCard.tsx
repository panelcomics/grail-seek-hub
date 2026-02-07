import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Gavel } from "lucide-react";
import { Link } from "react-router-dom";
import { AuctionPreviewItem, getAuctionTimeLabel } from "@/config/auctionConfig";

interface AuctionPreviewCardProps {
  auction: AuctionPreviewItem;
}

export function AuctionPreviewCard({ auction }: AuctionPreviewCardProps) {
  const timeLabel = getAuctionTimeLabel(auction.endsAt);
  const isEndingSoon = timeLabel === "Ends Today" || timeLabel === "Ending Soon";

  return (
    <Link to={`/auction/${auction.id}`} className="block group">
      <Card className="overflow-hidden border-border/50 hover:shadow-lg transition-all duration-300 hover:-translate-y-1 h-full">
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
            Auction Preview
          </Badge>
          {/* Time label */}
          <div
            className={`absolute top-2 right-2 backdrop-blur-sm px-2 py-1 rounded-md text-[11px] font-semibold ${
              isEndingSoon
                ? "bg-destructive/90 text-destructive-foreground"
                : "bg-background/90 text-foreground"
            }`}
          >
            {timeLabel}
          </div>
        </div>
        <CardContent className="p-3 space-y-2">
          <div>
            <h3 className="font-bold text-sm text-foreground line-clamp-1">
              {auction.title}
            </h3>
            <p className="text-xs text-muted-foreground">
              {auction.issue} • {auction.certification} {auction.grade}
            </p>
          </div>
          <div className="flex items-baseline justify-between pt-1 border-t border-border/40">
            <div>
              <div className="text-[10px] text-muted-foreground">Current Bid</div>
              <div className="text-base font-black text-primary">
                ${auction.currentBid.toLocaleString()}
              </div>
            </div>
            <div className="text-right">
              <div className="text-[10px] text-muted-foreground">
                {auction.bidCount} bids
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
