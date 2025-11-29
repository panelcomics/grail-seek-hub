import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MapPin, Loader2, AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useAuth } from "@/contexts/AuthContext";
import { checkUserLocation } from "@/lib/localDealsQuery";
import { useNavigate } from "react-router-dom";

interface LocalDiscoveryProps {
  onRadiusChange: (radius: number) => void;
  selectedRadius: number;
  isLoading?: boolean;
  hasResults?: boolean;
}

const RADIUS_OPTIONS = [25, 50, 100];

const LocalDiscovery = ({ 
  onRadiusChange, 
  selectedRadius,
  isLoading = false,
  hasResults = true
}: LocalDiscoveryProps) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [userLocation, setUserLocation] = useState<{
    hasLocation: boolean;
    city?: string;
    state?: string;
  }>({ hasLocation: false });
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    if (user?.id) {
      checkLocation();
    } else {
      setChecking(false);
    }
  }, [user?.id]);

  const checkLocation = async () => {
    if (!user?.id) return;
    
    try {
      const location = await checkUserLocation(user.id);
      setUserLocation(location);
    } catch (error) {
      console.error('[LOCAL-DISCOVERY] Error checking location:', error);
    } finally {
      setChecking(false);
    }
  };

  // Show nothing while checking
  if (checking) {
    return (
      <div className="flex items-center justify-center py-4">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // If user doesn't have location, show prompt to add it
  if (!userLocation.hasLocation) {
    return (
      <Alert className="mb-4">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription className="flex items-center justify-between">
          <span className="text-sm">
            Add your city & ZIP in your profile to see Local Deals near you
          </span>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => navigate('/profile')}
            className="ml-4"
          >
            Add Location
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  // User has location - show radius selector
  return (
    <Card className="p-4 mb-4 bg-gradient-to-br from-primary/5 to-accent/5">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <MapPin className="h-4 w-4 text-primary" />
          <div className="text-sm">
            <span className="font-medium">Showing deals within:</span>
            {userLocation.city && userLocation.state && (
              <span className="text-muted-foreground ml-1">
                from {userLocation.city}, {userLocation.state}
              </span>
            )}
          </div>
        </div>
        
        <div className="flex flex-wrap gap-2">
          {RADIUS_OPTIONS.map((radius) => (
            <Button
              key={radius}
              variant={selectedRadius === radius ? "default" : "outline"}
              size="sm"
              onClick={() => onRadiusChange(radius)}
              disabled={isLoading}
              className="min-w-[80px]"
            >
              {radius} miles
            </Button>
          ))}
        </div>
      </div>

      {!hasResults && !isLoading && (
        <div className="mt-3 pt-3 border-t">
          <p className="text-sm text-muted-foreground">
            No local deals within {selectedRadius} miles yet. Try increasing your radius or check Newly Listed.
          </p>
        </div>
      )}
    </Card>
  );
};

export default LocalDiscovery;
