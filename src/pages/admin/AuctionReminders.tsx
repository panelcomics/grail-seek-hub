import { useState, useMemo } from "react";
import { Helmet } from "react-helmet-async";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Bell, Users, Clock, Eye } from "lucide-react";
import { getAllReminders } from "@/components/auction/AuctionReminderModal";
import { SAMPLE_AUCTIONS, computeCloseAt, getAuctionTimeLabel } from "@/config/auctionConfig";

export default function AuctionReminders() {
  const [reminders] = useState(() => getAllReminders());

  const previewData = useMemo(() => {
    // Group by reminder timing
    const byTiming: Record<string, number> = { "1hour": 0, "15min": 0, "5min": 0 };
    const uniqueUsers = new Set<string>();
    const uniqueAuctions = new Set<string>();

    for (const r of reminders) {
      uniqueUsers.add(r.userId);
      uniqueAuctions.add(r.auctionId);
      for (const timing of r.reminders) {
        byTiming[timing] = (byTiming[timing] || 0) + 1;
      }
    }

    return {
      totalSignups: reminders.length,
      uniqueUsers: uniqueUsers.size,
      uniqueAuctions: uniqueAuctions.size,
      byTiming,
    };
  }, [reminders]);

  // Mock preview of what reminders would look like
  const mockPreview = useMemo(() => {
    return SAMPLE_AUCTIONS.slice(0, 3).map((auction) => {
      const closeAt = computeCloseAt(auction);
      return {
        title: `${auction.title} ${auction.issue}`,
        closeAt,
        timeLabel: getAuctionTimeLabel(closeAt),
        reminderCount: Math.floor(Math.random() * 5) + 1,
      };
    });
  }, []);

  return (
    <>
      <Helmet>
        <title>Auction Reminders (Admin) | GrailSeeker</title>
      </Helmet>

      <div className="container mx-auto px-4 py-6 max-w-4xl space-y-6">
        <div className="flex items-center gap-2">
          <Bell className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold text-foreground">
            Auction Reminders
          </h1>
          <Badge variant="secondary" className="text-[10px]">
            Admin Preview
          </Badge>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          <Card className="border-border/50">
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-black text-primary">
                {previewData.totalSignups}
              </div>
              <p className="text-xs text-muted-foreground">Total Signups</p>
            </CardContent>
          </Card>
          <Card className="border-border/50">
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-black text-foreground">
                {previewData.uniqueUsers}
              </div>
              <p className="text-xs text-muted-foreground">Unique Users</p>
            </CardContent>
          </Card>
          <Card className="border-border/50">
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-black text-foreground">
                {previewData.uniqueAuctions}
              </div>
              <p className="text-xs text-muted-foreground">Auctions Watched</p>
            </CardContent>
          </Card>
        </div>

        {/* Reminder breakdown */}
        <Card className="border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <Clock className="h-4 w-4 text-primary" />
              Reminder Timing Breakdown
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {Object.entries(previewData.byTiming).map(([key, count]) => (
              <div key={key} className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">
                  {key === "1hour"
                    ? "1 hour before"
                    : key === "15min"
                    ? "15 minutes before"
                    : "5 minutes before"}
                </span>
                <Badge variant="outline" className="text-xs">
                  {count} signup{count !== 1 ? "s" : ""}
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Stored reminders from localStorage */}
        <Card className="border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <Users className="h-4 w-4 text-primary" />
              Reminder Signups (localStorage)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {reminders.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                No reminders set yet. Users can set reminders from the auction detail page.
              </p>
            ) : (
              <div className="space-y-2">
                {reminders.map((r, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between p-2 rounded-md bg-muted/30 text-sm"
                  >
                    <div>
                      <p className="text-xs font-medium text-foreground">
                        Auction: {r.auctionId}
                      </p>
                      <p className="text-[10px] text-muted-foreground">
                        User: {r.userId.slice(0, 8)}…
                      </p>
                    </div>
                    <div className="flex gap-1">
                      {r.reminders.map((t) => (
                        <Badge key={t} variant="secondary" className="text-[9px]">
                          {t}
                        </Badge>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Generate reminder preview */}
        <Card className="border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <Eye className="h-4 w-4 text-primary" />
              Generate Reminder Preview
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-xs text-muted-foreground">
              Preview what reminder notifications would look like. No emails are sent.
            </p>

            {mockPreview.map((item) => (
              <div
                key={item.title}
                className="p-3 rounded-md bg-muted/20 border border-border/30 space-y-1"
              >
                <p className="text-xs font-bold text-foreground">{item.title}</p>
                <p className="text-[10px] text-muted-foreground">
                  Ends: {item.timeLabel} • {item.reminderCount} user{item.reminderCount !== 1 ? "s" : ""} would be notified
                </p>
                <p className="text-[10px] text-muted-foreground/70">
                  Subject: "Reminder: {item.title} ends in [time]"
                </p>
              </div>
            ))}

            <Button variant="outline" size="sm" disabled className="gap-1.5 w-full">
              <Bell className="h-3.5 w-3.5" />
              Generate Reminder Preview (Does NOT Send)
            </Button>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
