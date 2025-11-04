import { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { MapPin, Package, Heart, Clock } from "lucide-react";
import { Link } from "react-router-dom";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

interface ItemCardProps {
  id: string;
  title: string;
  price: number;
  condition: string;
  image: string;
  isLocal?: boolean;
  location?: string;
  category: "comic" | "card";
  isAuction?: boolean;
  timeRemaining?: number; // in seconds
  distance?: number; // in miles
  isClaimSale?: boolean;
  claimSaleId?: string;
  itemsLeft?: number;
  onClaim?: () => void;
}

const ItemCard = ({ 
  id, 
  title, 
  price, 
  condition, 
  image, 
  isLocal = false, 
  location,
  category,
  isAuction = false,
  timeRemaining = 0,
  distance,
  isClaimSale = false,
  claimSaleId,
  itemsLeft = 0,
  onClaim
}: ItemCardProps) => {
  const [countdown, setCountdown] = useState(timeRemaining);
  const [localPickup, setLocalPickup] = useState(true);
  const [shipNationwide, setShipNationwide] = useState(false);

  useEffect(() => {
    if (!isAuction || countdown <= 0) return;
    
    const timer = setInterval(() => {
      setCountdown(prev => Math.max(0, prev - 1));
    }, 1000);

    return () => clearInterval(timer);
  }, [isAuction, countdown]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };
  return (
    <Link to={`/item/${id}`}>
      <Card className="group overflow-hidden transition-all hover:shadow-lg hover:-translate-y-1 cursor-pointer">
        <div className="relative aspect-[3/4] overflow-hidden bg-muted">
          <img
            src={image}
            alt={title}
            className="h-full w-full object-cover transition-transform group-hover:scale-105"
          />
          <button 
            className="absolute top-3 right-3 p-2 rounded-full bg-background/80 backdrop-blur hover:bg-background transition-colors"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
          >
            <Heart className="h-4 w-4" />
          </button>
          <div className="absolute top-3 left-3 flex flex-col gap-2">
            <Badge variant="secondary" className="font-semibold">
              {condition}
            </Badge>
            {isClaimSale && (
              <Badge className="font-semibold bg-orange-500 hover:bg-orange-600 text-white animate-pulse">
                🔥 Claim Mode: ${price} - {itemsLeft} Left
              </Badge>
            )}
            {isAuction && !isClaimSale && (
              <Badge variant="destructive" className="font-semibold animate-pulse">
                🔥 $2 BIN
              </Badge>
            )}
          </div>
          {isAuction && countdown > 0 && (
            <div className="absolute bottom-3 left-3 right-3 bg-destructive/90 backdrop-blur text-destructive-foreground px-3 py-2 rounded-md flex items-center justify-center gap-2 font-bold">
              <Clock className="h-4 w-4" />
              {formatTime(countdown)}
            </div>
          )}
        </div>
        
        <div className="p-4 space-y-3">
          <div>
            <h3 className="font-semibold line-clamp-2 group-hover:text-primary transition-colors">
              {title}
            </h3>
            
            {/* Shipping Options */}
            <div 
              className="mt-3 space-y-2 text-xs"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
              }}
            >
              <div className="flex items-center gap-2">
                <Checkbox 
                  id={`local-${id}`}
                  checked={localPickup}
                  onCheckedChange={(checked) => setLocalPickup(checked as boolean)}
                />
                <Label 
                  htmlFor={`local-${id}`}
                  className="text-xs font-normal cursor-pointer flex items-center gap-1"
                >
                  <MapPin className="h-3 w-3" />
                  Local Pickup (500mi)
                </Label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox 
                  id={`ship-${id}`}
                  checked={shipNationwide}
                  onCheckedChange={(checked) => setShipNationwide(checked as boolean)}
                />
                <Label 
                  htmlFor={`ship-${id}`}
                  className="text-xs font-normal cursor-pointer flex items-center gap-1"
                >
                  <Package className="h-3 w-3" />
                  Ship Nationwide ($12+)
                </Label>
              </div>
            </div>
          </div>
          
          <div className="flex items-center justify-between pt-2 border-t">
            <div className="text-2xl font-bold text-primary">
              ${price}
            </div>
            {isClaimSale ? (
              <Button 
                size="sm" 
                className="bg-orange-500 hover:bg-orange-600 text-white"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onClaim?.();
                }}
              >
                🔥 Claim Now
              </Button>
            ) : (
              <Button size="sm" variant="outline">
                View Details
              </Button>
            )}
          </div>
        </div>
      </Card>
    </Link>
  );
};

export default ItemCard;
