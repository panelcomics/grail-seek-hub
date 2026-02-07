import { Helmet } from "react-helmet-async";
import { useNavigate } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Gavel, Plus, Eye, Lock, Clock, CalendarClock } from "lucide-react";
import { SAMPLE_SELLER_EVENTS, AuctionEventDraft } from "@/config/auctionEventTypes";
import { formatCloseTime } from "@/config/auctionConfig";

function typeBadgeLabel(type: string) {
  if (type === "weekly") return "Weekly";
  if (type === "featured") return "Featured";
  return "Event";
}

function EventRow({ event }: { event: AuctionEventDraft }) {
  const navigate = useNavigate();
  const closeDate = new Date(event.closeSchedule.scheduledAt);

  return (
    <Card className="border-border/50 hover:shadow-md transition-shadow">
      <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center gap-4">
        <div className="flex-1 min-w-0 space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-sm font-bold text-foreground">{event.name}</h3>
            <Badge variant="secondary" className="text-[10px]">
              {typeBadgeLabel(event.type)}
            </Badge>
            <Badge variant="outline" className="text-[10px] gap-1">
              Draft (Preview)
            </Badge>
          </div>

          <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
            {event.closeSchedule.mode === "hard_close" && (
              <span className="flex items-center gap-1">
                <Lock className="h-3 w-3" />
                Hard close: {formatCloseTime(closeDate)}
              </span>
            )}
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {event.closeSchedule.staggerSecondsPerLot}s stagger
            </span>
            <span>{event.lots.length} lots</span>
          </div>
        </div>

        <Button
          variant="outline"
          size="sm"
          className="shrink-0 gap-1.5"
          onClick={() => navigate(`/seller/auctions/${event.id}`)}
        >
          <Eye className="h-3.5 w-3.5" />
          Preview
        </Button>
      </CardContent>
    </Card>
  );
}

export default function SellerAuctions() {
  const navigate = useNavigate();
  const events = SAMPLE_SELLER_EVENTS;

  return (
    <>
      <Helmet>
        <title>Auction Events | Seller Dashboard | GrailSeeker</title>
      </Helmet>

      <div className="container mx-auto px-4 py-6 max-w-4xl space-y-6">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <CalendarClock className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-bold text-foreground">Auction Events</h1>
          </div>
          <Button
            onClick={() => navigate("/seller/auctions/new")}
            className="gap-1.5"
          >
            <Plus className="h-4 w-4" />
            Create Auction Event
          </Button>
        </div>

        {events.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-16 text-center">
              <Gavel className="h-10 w-10 text-muted-foreground/50 mb-3" />
              <h3 className="text-sm font-semibold text-foreground mb-1">
                No auction events yet
              </h3>
              <p className="text-xs text-muted-foreground max-w-xs mb-4">
                Create an event to group lots that close in sequence.
              </p>
              <Button onClick={() => navigate("/seller/auctions/new")} size="sm">
                <Plus className="h-4 w-4 mr-1" />
                Create Event
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {events.map((event) => (
              <EventRow key={event.id} event={event} />
            ))}
          </div>
        )}
      </div>
    </>
  );
}
