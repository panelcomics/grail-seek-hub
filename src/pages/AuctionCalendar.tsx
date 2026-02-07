import { useState, useMemo } from "react";
import { Helmet } from "react-helmet-async";
import { useNavigate } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { CalendarClock, ChevronLeft, ChevronRight, List, Calendar, Eye, Lock, Clock } from "lucide-react";
import {
  SAMPLE_AUCTIONS,
  AuctionPreviewItem,
  AuctionEvent,
  computeCloseAt,
  formatCloseTime,
} from "@/config/auctionConfig";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface DayEvents {
  date: Date;
  events: { event: AuctionEvent; lotCount: number }[];
  standalone: AuctionPreviewItem[];
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function getDaysInMonth(year: number, month: number): Date[] {
  const days: Date[] = [];
  const d = new Date(year, month, 1);
  while (d.getMonth() === month) {
    days.push(new Date(d));
    d.setDate(d.getDate() + 1);
  }
  return days;
}

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function groupAuctionsByDay(auctions: AuctionPreviewItem[]): Map<string, DayEvents> {
  const map = new Map<string, DayEvents>();

  for (const lot of auctions) {
    const closeAt = computeCloseAt(lot);
    const key = closeAt.toDateString();

    if (!map.has(key)) {
      map.set(key, { date: new Date(closeAt.getFullYear(), closeAt.getMonth(), closeAt.getDate()), events: [], standalone: [] });
    }

    const entry = map.get(key)!;
    if (lot.auctionEvent) {
      const existing = entry.events.find((e) => e.event.eventId === lot.auctionEvent!.eventId);
      if (existing) {
        existing.lotCount += 1;
      } else {
        entry.events.push({ event: lot.auctionEvent, lotCount: 1 });
      }
    } else {
      entry.standalone.push(lot);
    }
  }

  return map;
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function AuctionCalendar() {
  const navigate = useNavigate();
  const [currentMonth, setCurrentMonth] = useState(() => new Date());
  const [selectedDay, setSelectedDay] = useState<DayEvents | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();
  const days = getDaysInMonth(year, month);
  const firstDayOfWeek = new Date(year, month, 1).getDay();

  const auctionsByDay = useMemo(() => groupAuctionsByDay(SAMPLE_AUCTIONS), []);

  const prevMonth = () => setCurrentMonth(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentMonth(new Date(year, month + 1, 1));

  const handleDayClick = (day: Date) => {
    const key = day.toDateString();
    const data = auctionsByDay.get(key);
    if (data && (data.events.length > 0 || data.standalone.length > 0)) {
      setSelectedDay(data);
      setDrawerOpen(true);
    }
  };

  const monthLabel = currentMonth.toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });

  return (
    <>
      <Helmet>
        <title>Auction Calendar | GrailSeeker</title>
        <meta
          name="description"
          content="View upcoming comic book auction events on the GrailSeeker calendar."
        />
      </Helmet>

      <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <CalendarClock className="h-6 w-6 text-primary" />
              <h1 className="text-2xl font-bold text-foreground">
                Auction Calendar
              </h1>
            </div>
            <p className="text-sm text-muted-foreground">
              Browse upcoming auction events by date.
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={() => navigate("/auctions")}
            >
              <List className="h-3.5 w-3.5" />
              List View
            </Button>
            <Button
              variant="secondary"
              size="sm"
              className="gap-1.5"
              disabled
            >
              <Calendar className="h-3.5 w-3.5" />
              Calendar View
            </Button>
          </div>
        </div>

        {/* Month navigation */}
        <div className="flex items-center justify-between">
          <Button variant="ghost" size="sm" onClick={prevMonth}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <h2 className="text-lg font-bold text-foreground">{monthLabel}</h2>
          <Button variant="ghost" size="sm" onClick={nextMonth}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        {/* Calendar grid */}
        <div className="border border-border rounded-lg overflow-hidden">
          {/* Day headers */}
          <div className="grid grid-cols-7 bg-muted/50">
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
              <div
                key={d}
                className="text-center text-[11px] font-semibold text-muted-foreground py-2 border-b border-border/50"
              >
                {d}
              </div>
            ))}
          </div>

          {/* Day cells */}
          <div className="grid grid-cols-7">
            {/* Empty cells for offset */}
            {Array.from({ length: firstDayOfWeek }).map((_, i) => (
              <div key={`empty-${i}`} className="min-h-[80px] sm:min-h-[100px] border-b border-r border-border/30 bg-muted/10" />
            ))}

            {days.map((day) => {
              const key = day.toDateString();
              const data = auctionsByDay.get(key);
              const hasData = data && (data.events.length > 0 || data.standalone.length > 0);
              const isToday = isSameDay(day, new Date());
              const totalEvents = (data?.events.length ?? 0) + (data?.standalone.length ?? 0);

              return (
                <button
                  key={key}
                  onClick={() => handleDayClick(day)}
                  disabled={!hasData}
                  className={`min-h-[80px] sm:min-h-[100px] border-b border-r border-border/30 p-1.5 text-left transition-colors ${
                    hasData
                      ? "hover:bg-primary/5 cursor-pointer"
                      : "cursor-default"
                  } ${isToday ? "bg-primary/5" : ""}`}
                >
                  <span
                    className={`text-xs font-medium ${
                      isToday
                        ? "text-primary font-bold"
                        : "text-foreground"
                    }`}
                  >
                    {day.getDate()}
                  </span>

                  {hasData && (
                    <div className="mt-1 space-y-0.5">
                      <Badge
                        variant="secondary"
                        className="text-[8px] px-1 py-0 h-4"
                      >
                        {totalEvents} event{totalEvents !== 1 ? "s" : ""}
                      </Badge>
                      {data!.events.slice(0, 2).map((eg) => (
                        <div
                          key={eg.event.eventId}
                          className="text-[8px] text-primary font-medium line-clamp-1 hidden sm:block"
                        >
                          {eg.event.eventTitle}
                        </div>
                      ))}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Day detail drawer/sheet */}
      <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
        <SheetContent side="right" className="w-[380px] sm:w-[420px]">
          <SheetHeader>
            <SheetTitle className="text-left">
              {selectedDay?.date.toLocaleDateString("en-US", {
                weekday: "long",
                month: "long",
                day: "numeric",
              })}
            </SheetTitle>
          </SheetHeader>

          <div className="space-y-4 mt-4">
            {selectedDay?.events.map((eg) => (
              <Card key={eg.event.eventId} className="border-border/50">
                <CardContent className="p-3 space-y-2">
                  <div className="flex items-center gap-2">
                    <CalendarClock className="h-4 w-4 text-primary flex-shrink-0" />
                    <h3 className="text-sm font-bold text-foreground">
                      {eg.event.eventTitle}
                    </h3>
                  </div>
                  <div className="text-xs text-muted-foreground space-y-1">
                    {eg.event.hardCloseAt && (
                      <p className="flex items-center gap-1">
                        <Lock className="h-3 w-3" />
                        Hard close: {formatCloseTime(new Date(eg.event.hardCloseAt))} ({eg.event.timezoneLabel})
                      </p>
                    )}
                    <p className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {eg.lotCount} lot{eg.lotCount !== 1 ? "s" : ""} • {eg.event.lotCloseGapSeconds}s stagger
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full gap-1 mt-1"
                    onClick={() => {
                      setDrawerOpen(false);
                      navigate("/auctions");
                    }}
                  >
                    <Eye className="h-3 w-3" />
                    View Event Preview
                  </Button>
                </CardContent>
              </Card>
            ))}

            {selectedDay?.standalone.map((lot) => (
              <Card key={lot.id} className="border-border/50">
                <CardContent className="p-3">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-11 rounded bg-muted overflow-hidden flex-shrink-0">
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
                        {lot.certification} {lot.grade}
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="shrink-0 h-7 text-[10px]"
                      onClick={() => {
                        setDrawerOpen(false);
                        navigate(`/auction/${lot.id}`);
                      }}
                    >
                      View
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
