import {
  AuctionPreviewItem,
  AuctionEvent,
  computeCloseAt,
} from "@/config/auctionConfig";
import { AuctionEventHeader } from "./AuctionEventHeader";
import { AuctionPreviewCard } from "./AuctionPreviewCard";

interface AuctionEventPreviewSectionProps {
  event: AuctionEvent;
  lots: AuctionPreviewItem[];
  maxLots?: number;
  variant?: "featured" | "weekly" | "event";
}

export function AuctionEventPreviewSection({
  event,
  lots,
  maxLots = 10,
  variant = "event",
}: AuctionEventPreviewSectionProps) {
  const sorted = [...lots].sort(
    (a, b) => computeCloseAt(a).getTime() - computeCloseAt(b).getTime()
  );
  const visible = sorted.slice(0, maxLots);

  if (visible.length === 0) return null;

  return (
    <section className="space-y-4">
      <AuctionEventHeader event={event} lotCount={lots.length} variant={variant} />

      {/* Desktop grid / Mobile horizontal scroll */}
      <div className="hidden sm:grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
        {visible.map((lot) => (
          <AuctionPreviewCard key={lot.id} auction={lot} />
        ))}
      </div>

      <div className="sm:hidden overflow-x-auto scrollbar-hide -mx-4 px-4">
        <div className="flex gap-3 min-w-min pb-2">
          {visible.map((lot) => (
            <div key={lot.id} className="flex-shrink-0 w-44">
              <AuctionPreviewCard auction={lot} />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
