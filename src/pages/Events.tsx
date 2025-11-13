import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Calendar, MapPin, Users, DollarSign, ExternalLink } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/layout/AppLayout";
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';

interface Event {
  id: string;
  name: string;
  description: string;
  event_type: string;
  venue: string;
  city: string;
  state: string;
  latitude: number;
  longitude: number;
  start_date: string;
  end_date: string;
  website_url: string;
  image_url: string;
  listing_count?: number;
}

export default function Events() {
  const navigate = useNavigate();
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const [events, setEvents] = useState<Event[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchEvents();
  }, []);

  useEffect(() => {
    if (events.length > 0 && mapContainer.current && !map.current) {
      initializeMap();
    }
  }, [events]);

  const fetchEvents = async () => {
    try {
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .gte('end_date', new Date().toISOString())
        .order('start_date', { ascending: true });

      if (error) throw error;

      // Fetch listing counts for each event
      const eventsWithCounts = await Promise.all(
        (data || []).map(async (event) => {
          const { data: listings } = await supabase
            .from('event_listings')
            .select('id', { count: 'exact', head: true })
            .eq('event_id', event.id)
            .eq('is_available', true);

          return {
            ...event,
            listing_count: listings?.length || 0
          };
        })
      );

      setEvents(eventsWithCounts);
    } catch (error: any) {
      console.error('Error fetching events:', error);
      toast.error('Failed to load events');
    } finally {
      setLoading(false);
    }
  };

  const initializeMap = () => {
    if (!mapContainer.current) return;

    // TODO: Get Mapbox token from environment
    const MAPBOX_TOKEN = 'pk.eyJ1IjoibG92YWJsZSIsImEiOiJjbTRlZGh0a2owZGp5MnFzOHNkYXl1M3p4In0.vZWHMIoF5AxYGqI3pULXGQ';
    mapboxgl.accessToken = MAPBOX_TOKEN;

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/streets-v12',
      center: [-98.5795, 39.8283], // Center of USA
      zoom: 3.5
    });

    map.current.addControl(new mapboxgl.NavigationControl(), 'top-right');

    // Add markers for each event
    events.forEach((event) => {
      const el = document.createElement('div');
      el.className = 'event-marker';
      el.style.width = '40px';
      el.style.height = '40px';
      el.style.backgroundImage = 'url(https://docs.mapbox.com/mapbox-gl-js/assets/custom_marker.png)';
      el.style.backgroundSize = 'contain';
      el.style.cursor = 'pointer';

      const marker = new mapboxgl.Marker(el)
        .setLngLat([event.longitude, event.latitude])
        .setPopup(
          new mapboxgl.Popup({ offset: 25 })
            .setHTML(
              `<div class="p-2">
                <h3 class="font-bold">${event.name}</h3>
                <p class="text-sm">${event.city}, ${event.state}</p>
                <p class="text-sm text-muted-foreground">${event.listing_count || 0} listings</p>
              </div>`
            )
        )
        .addTo(map.current!);

      el.addEventListener('click', () => {
        setSelectedEvent(event);
        map.current?.flyTo({
          center: [event.longitude, event.latitude],
          zoom: 10
        });
      });
    });
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  return (
    <AppLayout>
      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">Collector Events</h1>
          <p className="text-muted-foreground">
            Find comic cons, card shows, and collector meetups near you
          </p>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Map */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle>Event Locations</CardTitle>
                <CardDescription>Click on pins to view event details</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <div ref={mapContainer} className="w-full h-[500px] rounded-b-lg" />
              </CardContent>
            </Card>

            {selectedEvent && (
              <Card className="mt-6">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle>{selectedEvent.name}</CardTitle>
                      <CardDescription className="flex items-center gap-2 mt-2">
                        <Calendar className="h-4 w-4" />
                        {formatDate(selectedEvent.start_date)} - {formatDate(selectedEvent.end_date)}
                      </CardDescription>
                    </div>
                    <Badge>{selectedEvent.event_type}</Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm mb-4">{selectedEvent.description}</p>
                  
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-sm">
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                      <span>{selectedEvent.venue}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Users className="h-4 w-4 text-muted-foreground" />
                      <span>{selectedEvent.listing_count || 0} nearby sellers</span>
                    </div>
                  </div>

                  <div className="flex gap-3 mt-6">
                    <Button onClick={() => navigate(`/event/${selectedEvent.id}`)}>
                      View Listings
                    </Button>
                    {selectedEvent.website_url && (
                      <Button 
                        variant="outline" 
                        onClick={() => window.open(selectedEvent.website_url, '_blank')}
                      >
                        <ExternalLink className="mr-2 h-4 w-4" />
                        Event Website
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Upcoming Events List */}
          <div>
            <Card>
              <CardHeader>
                <CardTitle>Upcoming Events</CardTitle>
                <CardDescription>Next collector gatherings</CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="text-center py-8 text-muted-foreground">Loading...</div>
                ) : events.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">
                    No upcoming events
                  </p>
                ) : (
                  <div className="space-y-4">
                    {events.map((event) => (
                      <div
                        key={event.id}
                        className={`p-4 rounded-lg border cursor-pointer transition-colors hover:border-primary ${
                          selectedEvent?.id === event.id ? 'border-primary bg-primary/5' : ''
                        }`}
                        onClick={() => {
                          setSelectedEvent(event);
                          map.current?.flyTo({
                            center: [event.longitude, event.latitude],
                            zoom: 10
                          });
                        }}
                      >
                        <h3 className="font-semibold mb-1">{event.name}</h3>
                        <p className="text-xs text-muted-foreground mb-2">
                          {event.city}, {event.state}
                        </p>
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-muted-foreground">
                            {formatDate(event.start_date)}
                          </span>
                          <Badge variant="secondary" className="text-xs">
                            {event.listing_count || 0} listings
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </AppLayout>
  );
}
