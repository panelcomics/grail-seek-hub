import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Gavel, Info, ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";
import { AuctionPreviewItem, getAuctionTimeLabel, AUCTIONS_ENABLED } from "@/config/auctionConfig";
import { AuctionRulesPanel } from "./AuctionRulesPanel";
import { AuctionEndingSoonPanel, AuctionEndingSoonStrip } from "./AuctionEndingSoonPanel";

interface AuctionDetailContentProps {
  auction: AuctionPreviewItem;
}

export function AuctionDetailContent({ auction }: AuctionDetailContentProps) {
  const timeLabel = getAuctionTimeLabel(auction.endsAt);
  const endDateFormatted = auction.endsAt.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
  const endTimeFormatted = auction.endsAt.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  });

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-6 max-w-6xl">
        {/* Back nav */}
        <Link
          to="/"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Home
        </Link>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: Cover image */}
          <div className="lg:col-span-1">
            <Card className="overflow-hidden border-border/50">
              <div className="relative aspect-[3/4] bg-muted">
                <img
                  src={auction.imageUrl}
                  alt={`${auction.title} ${auction.issue}`}
                  className="w-full h-full object-cover"
                />
                <Badge
                  variant="secondary"
                  className="absolute top-3 left-3 gap-1 bg-secondary/90 backdrop-blur-sm"
                >
                  <Gavel className="h-3 w-3" />
                  Auction Preview
                </Badge>
              </div>
            </Card>
          </div>

          {/* Center: Details + Bid area */}
          <div className="lg:col-span-1 space-y-4">
            {/* Title & Meta */}
            <div>
              <h1 className="text-2xl md:text-3xl font-black text-foreground">
                {auction.title}
              </h1>
              <p className="text-lg text-muted-foreground font-medium mt-1">
                {auction.issue}
              </p>
            </div>

            {/* Metadata grid */}
            <Card className="border-border/50">
              <CardContent className="p-4 grid grid-cols-2 gap-3 text-sm">
                <MetaRow label="Publisher" value={auction.publisher} />
                <MetaRow label="Year" value={auction.year} />
                <MetaRow label="Grade" value={`${auction.certification} ${auction.grade}`} />
                <MetaRow label="Bids" value={`${auction.bidCount}`} />
              </CardContent>
            </Card>

            {/* Auction timing */}
            <Card className="border-border/50">
              <CardContent className="p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground uppercase tracking-wide font-semibold">
                    End Date & Time
                  </span>
                  <Badge
                    variant={timeLabel === "Ends Today" || timeLabel === "Ending Soon" ? "destructive" : "outline"}
                    className="text-[10px]"
                  >
                    {timeLabel}
                  </Badge>
                </div>
                <p className="text-sm font-medium text-foreground">
                  {endDateFormatted}
                </p>
                <p className="text-sm text-muted-foreground">
                  {endTimeFormatted}
                </p>
              </CardContent>
            </Card>

            {/* Current bid + Next min bid */}
            <Card className="border-border/50 bg-muted/30">
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-xs text-muted-foreground mb-0.5">Current Bid</div>
                    <div className="text-3xl font-black text-primary">
                      ${auction.currentBid.toLocaleString()}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-muted-foreground mb-0.5">Next Minimum</div>
                    <div className="text-lg font-bold text-foreground">
                      ${auction.nextMinBid.toLocaleString()}
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Disabled bid button */}
                <Button
                  size="lg"
                  className="w-full font-bold text-base gap-2"
                  disabled={!AUCTIONS_ENABLED}
                >
                  <Gavel className="h-5 w-5" />
                  {AUCTIONS_ENABLED ? "Place Bid" : "Bidding Opens Soon"}
                </Button>

                {!AUCTIONS_ENABLED && (
                  <div className="flex items-start gap-2 text-xs text-muted-foreground bg-muted/50 rounded-lg p-3">
                    <Info className="h-4 w-4 mt-0.5 flex-shrink-0 text-muted-foreground/70" />
                    <span>
                      This auction is in preview mode. Bidding is not yet enabled.
                    </span>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Rules panel (mobile) */}
            <div className="lg:hidden">
              <AuctionRulesPanel />
            </div>
          </div>

          {/* Right sidebar: Rules + Ending Soon */}
          <div className="hidden lg:flex lg:flex-col gap-4">
            <AuctionRulesPanel />
            <AuctionEndingSoonPanel excludeId={auction.id} />
          </div>
        </div>

        {/* Mobile: Ending soon strip */}
        <div className="lg:hidden mt-6">
          <AuctionEndingSoonStrip excludeId={auction.id} />
        </div>
      </div>
    </div>
  );
}

function MetaRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[10px] text-muted-foreground uppercase tracking-wide">{label}</div>
      <div className="text-sm font-semibold text-foreground">{value}</div>
    </div>
  );
}
