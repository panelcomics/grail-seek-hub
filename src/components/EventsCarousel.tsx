import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, MapPin, ExternalLink } from "lucide-react";
import { format } from "date-fns";

interface Event {
  id: string;
  name: string;
  description: string;
  event_type: string;
  city: string;
  state: string;
  venue: string;
  start_date: string;
  end_date: string;
  image_url?: string;
  is_featured: boolean;
}

interface EventsCarouselProps {
  events: Event[];
}

const EventsCarousel = ({ events }: EventsCarouselProps) => {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Upcoming Shows</h2>
        <Badge variant="secondary">
          <Calendar className="h-3 w-3 mr-1" />
          {events.length} Events
        </Badge>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {events.map((event) => (
          <Card key={event.id} className="overflow-hidden hover:shadow-lg transition-shadow group cursor-pointer">
            <div className="relative h-48 overflow-hidden bg-gradient-to-br from-primary/20 to-accent/20">
              {event.image_url ? (
                <img
                  src={event.image_url}
                  alt={event.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-6xl">
                  🎪
                </div>
              )}
              {event.is_featured && (
                <Badge className="absolute top-2 right-2 bg-destructive">
                  Featured
                </Badge>
              )}
            </div>
            
            <div className="p-4 space-y-3">
              <div>
                <h3 className="font-bold text-lg line-clamp-1 group-hover:text-primary transition-colors">
                  {event.name}
                </h3>
                <p className="text-sm text-muted-foreground line-clamp-2">
                  {event.description}
                </p>
              </div>
              
              <div className="flex items-start gap-2 text-xs text-muted-foreground">
                <MapPin className="h-3 w-3 mt-0.5 flex-shrink-0" />
                <div>
                  <div className="font-medium">{event.venue}</div>
                  <div>{event.city}, {event.state}</div>
                </div>
              </div>
              
              <div className="flex items-center gap-2 text-xs">
                <Calendar className="h-3 w-3" />
                <span>
                  {format(new Date(event.start_date), "MMM d")} - {format(new Date(event.end_date), "MMM d, yyyy")}
                </span>
              </div>
              
              <div className="flex items-center gap-2 pt-2 border-t">
                <Badge variant="outline" className="text-xs">
                  {event.event_type === "convention" ? "Convention" : "Card Show"}
                </Badge>
                <ExternalLink className="h-3 w-3 ml-auto text-muted-foreground" />
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default EventsCarousel;
