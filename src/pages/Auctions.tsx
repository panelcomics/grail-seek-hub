import { useState, useMemo } from "react";
import { Helmet } from "react-helmet-async";
import { Gavel } from "lucide-react";
import {
  SAMPLE_AUCTIONS,
  AuctionPreviewItem,
  AuctionEvent,
  computeCloseAt,
} from "@/config/auctionConfig";
import {
  AuctionFilterDropdown,
  AuctionViewFilter,
} from "@/components/auction/AuctionFilterDropdown";
import { AuctionEventPreviewSection } from "@/components/auction/AuctionEventPreviewSection";
import { AuctionPreviewCard } from "@/components/auction/AuctionPreviewCard";

/* ------------------------------------------------------------------ */
/*  Helpers — group lots by event or standalone                        */
/* ------------------------------------------------------------------ */

interface EventGroup {
  event: AuctionEvent;
  lots: AuctionPreviewItem[];
}

function groupByEvent(auctions: AuctionPreviewItem[]): {
  eventGroups: EventGroup[];
  standalone: AuctionPreviewItem[];
} {
  const map = new Map<string, EventGroup>();
  const standalone: AuctionPreviewItem[] = [];

  for (const lot of auctions) {
    if (lot.auctionEvent) {
      const key = lot.auctionEvent.eventId;
      if (!map.has(key)) {
        map.set(key, { event: lot.auctionEvent, lots: [] });
      }
      map.get(key)!.lots.push(lot);
    } else {
      standalone.push(lot);
    }
  }

  return { eventGroups: Array.from(map.values()), standalone };
}

/* ------------------------------------------------------------------ */
/*  Page component                                                     */
/* ------------------------------------------------------------------ */

export default function Auctions() {
  const [filter, setFilter] = useState<AuctionViewFilter>("events");

  const { eventGroups, standalone } = useMemo(
    () => groupByEvent(SAMPLE_AUCTIONS),
    []
  );

  // Sort standalone by close time
  const sortedStandalone = useMemo(
    () =>
      [...standalone].sort(
        (a, b) => computeCloseAt(a).getTime() - computeCloseAt(b).getTime()
      ),
    [standalone]
  );

  return (
    <>
      <Helmet>
        <title>Upcoming Auctions | GrailSeeker</title>
        <meta
          name="description"
          content="Preview upcoming comic book auction events with staggered closing times. Browse weekly, featured, and event auctions."
        />
      </Helmet>

      <div className="max-w-7xl mx-auto px-4 py-6 space-y-8">
        {/* Page header */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Gavel className="h-6 w-6 text-primary" />
              <h1 className="text-2xl font-bold text-foreground">
                Upcoming Auctions
              </h1>
            </div>
            <p className="text-sm text-muted-foreground max-w-lg">
              Preview upcoming auction events and ending times. Bidding will
              open soon.
            </p>
          </div>
          <AuctionFilterDropdown value={filter} onChange={setFilter} />
        </div>

        {/* Content by filter */}
        {filter === "events" && (
          <div className="space-y-10">
            {eventGroups.map((group) => (
              <AuctionEventPreviewSection
                key={group.event.eventId}
                event={group.event}
                lots={group.lots}
                variant="event"
              />
            ))}

            {sortedStandalone.length > 0 && (
              <section className="space-y-4">
                <h2 className="text-lg font-bold text-foreground border-b border-border/50 pb-2">
                  Standalone Auctions
                </h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                  {sortedStandalone.map((lot) => (
                    <AuctionPreviewCard key={lot.id} auction={lot} />
                  ))}
                </div>
              </section>
            )}

            {eventGroups.length === 0 && sortedStandalone.length === 0 && (
              <EmptyState />
            )}
          </div>
        )}

        {filter === "weekly" && (
          <div className="space-y-10">
            {/* Weekly: show all lots as a flat grid sorted by close time */}
            <WeeklyGrid auctions={SAMPLE_AUCTIONS} />
          </div>
        )}

        {filter === "featured" && (
          <div className="space-y-10">
            {eventGroups.map((group) => (
              <AuctionEventPreviewSection
                key={group.event.eventId}
                event={group.event}
                lots={group.lots}
                variant="featured"
              />
            ))}
            {eventGroups.length === 0 && <EmptyState />}
          </div>
        )}
      </div>
    </>
  );
}

/* ------------------------------------------------------------------ */
/*  Sub-components                                                     */
/* ------------------------------------------------------------------ */

function WeeklyGrid({ auctions }: { auctions: AuctionPreviewItem[] }) {
  const sorted = useMemo(
    () =>
      [...auctions].sort(
        (a, b) => computeCloseAt(a).getTime() - computeCloseAt(b).getTime()
      ),
    [auctions]
  );

  if (sorted.length === 0) return <EmptyState />;

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
      {sorted.slice(0, 10).map((lot) => (
        <AuctionPreviewCard key={lot.id} auction={lot} />
      ))}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <Gavel className="h-10 w-10 text-muted-foreground/50 mb-3" />
      <h3 className="text-sm font-semibold text-foreground mb-1">
        Auctions are coming soon
      </h3>
      <p className="text-xs text-muted-foreground max-w-xs">
        Preview select items below once upcoming events are announced.
      </p>
    </div>
  );
}
