import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { MapPin, Users, Locate } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface LocalDiscoveryProps {
  onCitySelect: (city: string) => void;
  selectedCity: string | null;
}

const MAJOR_CITIES = [
  { name: "New York", state: "NY", lat: 40.7128, lng: -74.0060 },
  { name: "Los Angeles", state: "CA", lat: 34.0522, lng: -118.2437 },
  { name: "Chicago", state: "IL", lat: 41.8781, lng: -87.6298 },
  { name: "Dallas", state: "TX", lat: 32.7767, lng: -96.7970 },
  { name: "Seattle", state: "WA", lat: 47.6062, lng: -122.3321 },
  { name: "San Diego", state: "CA", lat: 32.7157, lng: -117.1611 },
  { name: "Portland", state: "OR", lat: 45.5152, lng: -122.6784 },
  { name: "Kansas City", state: "MO", lat: 39.0997, lng: -94.5786 },
];

const LocalDiscovery = ({ onCitySelect, selectedCity }: LocalDiscoveryProps) => {
  const [radius, setRadius] = useState([500]);
  const [nearbyCount, setNearbyCount] = useState(0);
  const [upcomingEvents, setUpcomingEvents] = useState(0);
  const [userLocation, setUserLocation] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchLocalStats();
  }, [selectedCity, radius]);

  const fetchLocalStats = async () => {
    const { count: itemCount } = await supabase
      .from("claim_sale_items")
      .select("*", { count: "exact", head: true })
      .not("city", "is", null);

    const { count: eventCount } = await supabase
      .from("events")
      .select("*", { count: "exact", head: true })
      .gte("start_date", new Date().toISOString());

    setNearbyCount(itemCount || 0);
    setUpcomingEvents(eventCount || 0);
  };

  const detectUserLocation = () => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          // In a real app, you'd reverse geocode this to get the city
          setUserLocation("Your Area");
          toast({
            title: "Location detected",
            description: "Showing listings near you",
          });
        },
        (error) => {
          toast({
            title: "Location access denied",
            description: "Please select a city manually",
            variant: "destructive",
          });
        }
      );
    }
  };

  return (
    <div className="space-y-6">
      <Card className="p-6 bg-gradient-to-br from-primary/5 to-accent/5">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 className="text-2xl font-bold mb-2">Browse Local</h2>
            <p className="text-muted-foreground">
              Discover grails in your area and at upcoming events
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={detectUserLocation}
            className="gap-2"
          >
            <Locate className="h-4 w-4" />
            Auto-Detect
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <Card className="p-4 bg-background/50">
            <div className="flex items-center gap-2 mb-1">
              <Users className="h-4 w-4 text-primary" />
              <span className="text-xs text-muted-foreground">Nearby Sellers</span>
            </div>
            <div className="text-2xl font-bold">{nearbyCount}</div>
          </Card>
          <Card className="p-4 bg-background/50">
            <div className="flex items-center gap-2 mb-1">
              <MapPin className="h-4 w-4 text-destructive" />
              <span className="text-xs text-muted-foreground">Events This Month</span>
            </div>
            <div className="text-2xl font-bold">{upcomingEvents}</div>
          </Card>
        </div>

        {/* Radius Slider */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-medium">Search Radius</label>
            <Badge variant="secondary">{radius[0]} miles</Badge>
          </div>
          <Slider
            value={radius}
            onValueChange={setRadius}
            min={10}
            max={500}
            step={10}
            className="w-full"
          />
        </div>

        {/* City Hubs */}
        <div>
          <h3 className="text-sm font-medium mb-3">Major City Hubs</h3>
          <div className="flex flex-wrap gap-2">
            {MAJOR_CITIES.map((city) => (
              <Button
                key={`${city.name}-${city.state}`}
                variant={selectedCity === city.name ? "default" : "outline"}
                size="sm"
                onClick={() => onCitySelect(city.name)}
                className="gap-2"
              >
                <MapPin className="h-3 w-3" />
                {city.name}
              </Button>
            ))}
          </div>
        </div>
      </Card>
    </div>
  );
};

export default LocalDiscovery;
