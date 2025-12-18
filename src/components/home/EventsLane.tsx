/**
 * Event Lane Lite Component
 * 
 * Purpose: Display live and upcoming seller events on homepage.
 * Shows horizontal scrollable row of event cards.
 * Only renders when events array has items — hides completely otherwise.
 * 
 * This is UI-only with stub data. Backend integration can be added later
 * by replacing the mock data with a Supabase query.
 */

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Radio, Clock, ChevronRight } from "lucide-react";
import { Link } from "react-router-dom";

/**
 * Event data shape for event cards.
 * Flexible structure for future backend integration.
 */
export interface EventShow {
  id: string;
  sellerName: string;
  sellerAvatarUrl?: string;
  title: string;
  startTime?: string; // Formatted string like "Tonight 7:30 PM CST"
  status?: "live" | "upcoming";
  coverImageUrl?: string;
  ctaUrl?: string; // Where to send user (event page, seller page, etc.)
}

interface EventsLaneProps {
  events?: EventShow[];
}

/**
 * Mock events for testing the UI.
 * Replace with real data from Supabase later.
 */
const MOCK_EVENTS: EventShow[] = [
  // Uncomment to test the lane visually:
  // {
  //   id: "1",
  //   sellerName: "Panel Comics",
  //   sellerAvatarUrl: "",
  //   title: "Silver Age Key Night",
  //   startTime: "Tonight 8 PM EST",
  //   status: "live",
  //   coverImageUrl: "/covers/sample-batman.jpg",
  //   ctaUrl: "/sellers/panel-comics",
  // },
  // {
  //   id: "2",
  //   sellerName: "Kiss Komixx",
  //   sellerAvatarUrl: "",
  //   title: "Modern Variants Flash Sale",
  //   startTime: "Tomorrow 7 PM CST",
  //   status: "upcoming",
  //   coverImageUrl: "/covers/sample-spawn.jpg",
  //   ctaUrl: "/sellers/kiss-komixx",
  // },
];

export function EventsLane({ events = MOCK_EVENTS }: EventsLaneProps) {
  // Don't render anything if no events — keeps homepage clean
  if (!events || events.length === 0) {
    return null;
  }

  return (
    <section className="py-4 md:py-6 bg-muted/30">
      <div className="container mx-auto px-4">
        {/* Section header */}
        <div className="flex justify-between items-start mb-4">
          <div>
            <h2 className="text-lg sm:text-xl md:text-2xl font-bold flex items-center gap-2">
              <Radio className="h-5 w-5 text-destructive animate-pulse" />
              Live & Upcoming Events
            </h2>
            <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
              Catch special sales and shows from GrailSeeker sellers.
            </p>
          </div>
          <Button variant="ghost" size="sm" className="hidden md:flex text-xs font-medium">
            View All <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      </div>

      {/* Horizontal scrollable row */}
      <div className="overflow-x-auto overflow-y-visible pb-2 scrollbar-hide snap-x snap-mandatory">
        <div className="flex gap-3 md:gap-4 px-4 min-w-min">
          {events.map((event) => (
            <EventCard key={event.id} event={event} />
          ))}
        </div>
      </div>
    </section>
  );
}

/**
 * Individual event card component
 */
function EventCard({ event }: { event: EventShow }) {
  const isLive = event.status === "live";
  
  const cardContent = (
    <Card className="w-[260px] sm:w-[280px] flex-shrink-0 snap-center overflow-hidden hover:shadow-lg transition-shadow duration-200 cursor-pointer">
      {/* Cover image / banner */}
      <div className="relative h-24 sm:h-28 bg-gradient-to-br from-primary/20 to-primary/5 overflow-hidden">
        {event.coverImageUrl && (
          <img
            src={event.coverImageUrl}
            alt={event.title}
            className="w-full h-full object-cover opacity-80"
          />
        )}
        
        {/* Status badge overlay */}
        <div className="absolute top-2 left-2">
          {isLive ? (
            <Badge className="bg-destructive text-destructive-foreground font-bold text-[10px] px-2 py-0.5 animate-pulse">
              <Radio className="h-3 w-3 mr-1" />
              LIVE
            </Badge>
          ) : (
            <Badge variant="secondary" className="font-medium text-[10px] px-2 py-0.5">
              <Clock className="h-3 w-3 mr-1" />
              Upcoming
            </Badge>
          )}
        </div>
      </div>
      
      {/* Card content */}
      <div className="p-3">
        {/* Seller info */}
        <div className="flex items-center gap-2 mb-2">
          <Avatar className="h-6 w-6">
            <AvatarImage src={event.sellerAvatarUrl} />
            <AvatarFallback className="text-[10px] font-bold bg-primary/10">
              {event.sellerName.slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <span className="text-xs font-medium text-muted-foreground truncate">
            {event.sellerName}
          </span>
        </div>
        
        {/* Event title */}
        <h3 className="font-bold text-sm leading-tight line-clamp-2 mb-1">
          {event.title}
        </h3>
        
        {/* Time */}
        {event.startTime && (
          <p className="text-xs text-muted-foreground mb-2">
            {event.startTime}
          </p>
        )}
        
        {/* CTA */}
        <Button 
          size="sm" 
          variant={isLive ? "default" : "outline"} 
          className="w-full text-xs h-8"
        >
          {isLive ? "Join Now" : "View Event"}
        </Button>
      </div>
    </Card>
  );

  // Wrap in link if CTA URL provided
  if (event.ctaUrl) {
    return (
      <Link to={event.ctaUrl} className="block">
        {cardContent}
      </Link>
    );
  }

  return cardContent;
}

export default EventsLane;
