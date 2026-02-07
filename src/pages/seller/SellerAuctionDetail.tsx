import { useParams, useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { ArrowLeft, Lock, Clock, CalendarClock, Eye } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SAMPLE_SELLER_EVENTS } from "@/config/auctionEventTypes";
import { formatCloseTime } from "@/config/auctionConfig";

export default function SellerAuctionDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const event = SAMPLE_SELLER_EVENTS.find((e) => e.id === id) ?? SAMPLE_SELLER_EVENTS[0];
  const closeDate = new Date(event.closeSchedule.scheduledAt);

  return (
    <>
      <Helmet>
        <title>{event.name} — Auction Preview | GrailSeeker</title>
      </Helmet>

      <div className="container mx-auto px-4 py-6 max-w-3xl space-y-6">
        <button
          onClick={() => navigate("/seller/auctions")}
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Auction Events
        </button>

        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl font-bold text-foreground">{event.name}</h1>
              <Badge variant="secondary" className="text-[10px]">
                {event.type === "weekly" ? "Weekly" : event.type === "featured" ? "Featured" : "Event"}
              </Badge>
              <Badge variant="outline" className="text-[10px]">
                Draft (Preview)
              </Badge>
            </div>
            {event.description && (
              <p className="text-sm text-muted-foreground">{event.description}</p>
            )}
          </div>
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={() => window.open("/auctions", "_blank")}
          >
            <Eye className="h-3.5 w-3.5" />
            Public Preview
          </Button>
        </div>

        {/* Close Schedule */}
        <Card className="border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <CalendarClock className="h-4 w-4 text-primary" />
              Closing Schedule
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex items-center gap-2">
              <Lock className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-foreground font-medium">
                {event.closeSchedule.mode === "hard_close" ? "Hard close" : "Rolling close"}:{" "}
                {closeDate.toLocaleDateString("en-US", {
                  weekday: "short",
                  month: "short",
                  day: "numeric",
                })}{" "}
                at {formatCloseTime(closeDate)}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-muted-foreground">
                Lots close every {event.closeSchedule.staggerSecondsPerLot} seconds
              </span>
            </div>
            {event.closeSchedule.snipingEnabled && (
              <div className="text-xs text-muted-foreground bg-muted/50 rounded-md p-2.5">
                Anti-sniping: {event.closeSchedule.extensionWindowSeconds}s extension window, max{" "}
                {event.closeSchedule.extensionMaxCount} extensions per lot
              </div>
            )}
          </CardContent>
        </Card>

        {/* Lots */}
        <Card className="border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-bold">
              Lots ({event.lots.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {event.lots.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                No lots added yet. Edit this event to add lots.
              </p>
            ) : (
              <div className="space-y-2">
                {event.lots.map((lot, i) => (
                  <div
                    key={lot.id}
                    className="flex items-center gap-3 p-2 rounded-md bg-muted/30"
                  >
                    <div className="w-10 h-14 rounded bg-muted overflow-hidden flex-shrink-0">
                      <img
                        src={lot.imageUrl}
                        alt={lot.title}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-foreground line-clamp-1">
                        {lot.title} {lot.issue}
                      </p>
                      <p className="text-[10px] text-muted-foreground">
                        {lot.grade} • Starting: ${lot.startingBid}
                      </p>
                    </div>
                    <span className="text-[10px] text-muted-foreground shrink-0">
                      Lot #{i + 1}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
