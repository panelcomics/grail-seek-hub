import { Badge } from "@/components/ui/badge";
import { CalendarClock, Lock, Clock } from "lucide-react";
import { AuctionEvent, formatCloseTime } from "@/config/auctionConfig";

interface AuctionEventHeaderProps {
  event: AuctionEvent;
  lotCount: number;
  variant?: "featured" | "weekly" | "event";
}

export function AuctionEventHeader({ event, lotCount, variant = "event" }: AuctionEventHeaderProps) {
  const badgeLabel = variant === "featured" ? "Featured" : variant === "weekly" ? "Weekly" : null;

  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-border/50">
      <div className="space-y-1">
        <div className="flex items-center gap-2 flex-wrap">
          <CalendarClock className="h-5 w-5 text-primary flex-shrink-0" />
          <h2 className="text-lg font-bold text-foreground">{event.eventTitle}</h2>
          {badgeLabel && (
            <Badge variant="secondary" className="text-[10px] font-semibold">
              {badgeLabel}
            </Badge>
          )}
        </div>
        <p className="text-xs text-muted-foreground flex items-center gap-1.5">
          <Clock className="h-3 w-3" />
          {lotCount} lot{lotCount !== 1 ? "s" : ""} &middot; Lots close every {event.lotCloseGapSeconds}s apart
        </p>
      </div>

      {event.hardCloseAt && (
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground bg-muted/60 px-3 py-1.5 rounded-md">
          <Lock className="h-3.5 w-3.5 flex-shrink-0" />
          <span>
            Hard Close: {formatCloseTime(new Date(event.hardCloseAt))} ({event.timezoneLabel})
          </span>
        </div>
      )}
    </div>
  );
}
