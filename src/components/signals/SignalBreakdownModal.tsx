/**
 * Elite Heat Index Breakdown Modal
 * =================================
 * Explains why a comic is showing collector interest.
 * 
 * RULES:
 * - Elite users only
 * - No numbers, percentages, or rankings
 * - No prices
 * - No urgency language
 */

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Flame, Bell, Info, Shield } from "lucide-react";

interface SignalBreakdownModalProps {
  open: boolean;
  onClose: () => void;
  signal: {
    id: string;
    comic_title: string;
    issue_number: string | null;
    publisher: string | null;
    watchlist_count: number;
    scanner_count: number;
    active_listing_count: number;
    created_at: string;
    last_activity_at: string;
  } | null;
  onTrack?: (signalId: string) => void;
}

export function HeatIndexBreakdownModal({
  open,
  onClose,
  signal,
  onTrack,
}: SignalBreakdownModalProps) {
  if (!signal) return null;

  // Generate explanation bullets
  const getExplanationBullets = (): string[] => {
    const bullets: string[] = [];

    if (signal.watchlist_count > 0) {
      bullets.push("Multiple collectors added this to their wantlists recently");
    }
    if (signal.scanner_count > 0) {
      bullets.push("Elevated scanner activity relative to typical levels");
    }
    if (signal.active_listing_count === 0) {
      bullets.push("No corresponding increase in active listings");
    } else if (signal.active_listing_count < 3) {
      bullets.push("Limited supply currently available");
    }
    
    const totalInterest = signal.watchlist_count + signal.scanner_count;
    if (totalInterest > signal.active_listing_count * 2) {
      bullets.push("Collector interest outpaces current market supply");
    }

    return bullets;
  };

  // Generate timeline events
  const getTimelineEvents = (): string[] => {
    const events: string[] = [];
    const created = new Date(signal.created_at);
    const lastActivity = new Date(signal.last_activity_at);
    const now = new Date();
    
    const daysSinceCreated = Math.floor((now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24));
    const daysSinceActivity = Math.floor((now.getTime() - lastActivity.getTime()) / (1000 * 60 * 60 * 24));

    if (daysSinceCreated > 0) {
      events.push(`Day 1: Initial collector interest detected`);
    }
    if (signal.watchlist_count > 0) {
      events.push(`Day ${Math.min(daysSinceCreated, 2)}: Wantlist additions begin`);
    }
    if (signal.scanner_count > 0) {
      events.push(`Day ${Math.min(daysSinceCreated, 3)}: Scanner activity increases`);
    }
    if (signal.active_listing_count < 3) {
      events.push(`Day ${Math.min(daysSinceCreated, 4)}: Supply remains limited`);
    }
    
    if (daysSinceActivity <= 1) {
      events.push("Today: Still heating up");
    } else {
      events.push(`Recent: Last activity ${daysSinceActivity} days ago`);
    }

    return events;
  };

  const explanationBullets = getExplanationBullets();
  const timelineEvents = getTimelineEvents();

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          {/* Header */}
          <div className="flex items-start gap-3">
            <div className="flex-1">
              <DialogTitle className="text-xl">
                {signal.comic_title}
                {signal.issue_number && ` #${signal.issue_number}`}
              </DialogTitle>
              {signal.publisher && (
                <p className="text-sm text-muted-foreground mt-0.5">{signal.publisher}</p>
              )}
            </div>
            <Badge className="bg-orange-500/20 text-orange-600 border-orange-500/30">
              <Flame className="h-3 w-3 mr-1" />
              Heat Index
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-2">
            Collector activity detected
          </p>
        </DialogHeader>

        <div className="space-y-6 mt-4">
          {/* Explanation Section */}
          <div>
            <h3 className="font-semibold text-sm mb-3">Why this book is heating up</h3>
            <ul className="space-y-2">
              {explanationBullets.map((bullet, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                  <span className="text-primary mt-0.5">•</span>
                  {bullet}
                </li>
              ))}
            </ul>
          </div>

          <Separator />

          {/* Timeline Section */}
          <div>
            <h3 className="font-semibold text-sm mb-3">Activity Timeline</h3>
            <div className="space-y-2 border-l-2 border-border pl-4 ml-2">
              {timelineEvents.map((event, i) => (
                <div 
                  key={i} 
                  className={`text-sm relative before:absolute before:-left-[21px] before:top-2 before:w-2 before:h-2 before:rounded-full ${
                    i === timelineEvents.length - 1 
                      ? "before:bg-primary text-foreground" 
                      : "before:bg-muted-foreground/50 text-muted-foreground"
                  }`}
                >
                  {event}
                </div>
              ))}
            </div>
          </div>

          <Separator />

          {/* Trust Disclaimer */}
          <div className="bg-muted/50 rounded-lg p-3 flex items-start gap-2">
            <Shield className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
            <div className="text-xs text-muted-foreground">
              <p className="font-medium text-foreground mb-1">This is not:</p>
              <ul className="space-y-0.5">
                <li>• Price prediction or investment advice</li>
                <li>• Seller promotion or paid placement</li>
                <li>• Guarantee of future value or demand</li>
              </ul>
            </div>
          </div>

          {/* Footer tooltip */}
          <p className="text-xs text-muted-foreground text-center italic">
            Powered by the Grail Index™, GrailSeeker's internal collector activity scoring system.
          </p>

          {/* CTA */}
          {onTrack && (
            <div className="pt-2">
              <p className="text-sm text-muted-foreground mb-3 text-center">
                Want alerts when this changes?
              </p>
              <Button 
                className="w-full" 
                onClick={() => {
                  onTrack(signal.id);
                  onClose();
                }}
              >
                <Bell className="h-4 w-4 mr-2" />
                Track This Book
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Keep backward compatible export
export const SignalBreakdownModal = HeatIndexBreakdownModal;
