import { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { MapPin, Package, Heart, Clock } from "lucide-react";
import { FavoriteButton } from "@/components/FavoriteButton";
import { SellerBadge } from "@/components/SellerBadge";
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
  sellerName?: string;
  sellerCity?: string;
  sellerBadge?: string | null;
  category: "comic" | "card";
  isAuction?: boolean;
  timeRemaining?: number; // in seconds
  distance?: number; // in miles
  isClaimSale?: boolean;
  claimSaleId?: string;
  itemsLeft?: number;
  onClaim?: () => void;
  showMakeOffer?: boolean;
  minOfferPercentage?: number;
  showEndingSoonBadge?: boolean;
}

const ItemCard = ({ 
  id, 
  title, 
  price, 
  condition, 
  image, 
  isLocal = false, 
  location,
  sellerName,
  sellerCity,
  sellerBadge,
  category,
  isAuction = false,
  timeRemaining = 0,
  distance,
  isClaimSale = false,
  claimSaleId,
  itemsLeft = 0,
  onClaim,
  showMakeOffer = false,
  minOfferPercentage = 10,
  showEndingSoonBadge = false
}: ItemCardProps) => {
  const [countdown, setCountdown] = useState(timeRemaining);
  const [localPickup, setLocalPickup] = useState(true);
  const [shipNationwide, setShipNationwide] = useState(false);
  
  const isUrgent = countdown > 0 && countdown <= 180; // Last 3 minutes

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
      <Card className={`group overflow-hidden transition-all duration-300 hover:shadow-lg hover:-translate-y-1 cursor-pointer bg-card border ${
        isUrgent ? 'animate-urgent-glow' : ''
      }`}>
        <div className="relative aspect-[3/4] overflow-hidden bg-muted">
          <img
            src={image}
            alt={title}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
          <div className="absolute top-3 right-3 z-10 flex items-center gap-1">
            <FavoriteButton listingId={id} showCount />
          </div>
          <div className="absolute top-3 left-3 flex flex-col gap-2">
            {showEndingSoonBadge && (
              <Badge className="font-semibold bg-destructive hover:bg-destructive text-destructive-foreground">
                <Clock className="h-3 w-3 mr-1" />
                Ending Soon
              </Badge>
            )}
            <Badge variant="secondary" className="font-semibold">
              {condition}
            </Badge>
            {isClaimSale && (
              <Badge className="font-semibold bg-orange-500 hover:bg-orange-600 text-white animate-claim-fade">
                Claim Mode: ${price} - {itemsLeft} Left
              </Badge>
            )}
            {isAuction && !isClaimSale && !showEndingSoonBadge && (
              <Badge variant="destructive" className="font-semibold animate-pulse">
                $2 BIN
              </Badge>
            )}
          </div>
          {isAuction && countdown > 0 && (
            <div className={`absolute bottom-3 left-3 right-3 backdrop-blur px-3 py-2 rounded-md flex items-center justify-center gap-2 font-bold ${
              isUrgent ? 'bg-destructive text-destructive-foreground' : 'bg-destructive/90 text-destructive-foreground'
            }`}>
              <Clock className="h-4 w-4" />
              {formatTime(countdown)}
            </div>
          )}
        </div>
        
        <div className="p-4 space-y-3">
          <div>
            <h3 className="font-semibold line-clamp-2 text-base mb-2 group-hover:text-primary transition-colors">
              {title}
            </h3>
            
            {/* Seller Info */}
            {sellerName && sellerCity && (
              <div className="flex items-center justify-between gap-2 mb-3">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground min-w-0">
                  <span className="font-medium truncate">{sellerName}</span>
                  <span>•</span>
                  <span className="truncate">{sellerCity}</span>
                  {sellerBadge && (
                    <>
                      <span>•</span>
                      <SellerBadge tier={sellerBadge} className="shrink-0" />
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
          
          <div className="flex items-center justify-between pt-2 border-t">
            <div className="text-2xl font-bold text-primary">
              ${price}
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-2">
            {showMakeOffer ? (
              <>
                <Button 
                  size="sm" 
                  variant="outline"
                  className="border-primary text-primary hover:bg-primary/5 transition-all hover:shadow-sm hover:-translate-y-0.5"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                  }}
                >
                  Make Offer
                </Button>
                <Button 
                  size="sm" 
                  className="bg-primary text-primary-foreground hover:bg-primary/90 transition-all hover:shadow-md hover:-translate-y-0.5"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                  }}
                >
                  View Listing
                </Button>
              </>
            ) : isClaimSale ? (
              <Button 
                size="sm" 
                className="col-span-2 bg-orange-500 hover:bg-orange-600 text-white transition-all hover:shadow-md hover:-translate-y-0.5"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onClaim?.();
                }}
              >
                Claim Now
              </Button>
            ) : showEndingSoonBadge && isAuction ? (
              <Button 
                size="sm" 
                className="col-span-2 bg-primary text-primary-foreground hover:bg-primary/90 transition-all hover:shadow-md hover:-translate-y-0.5"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                }}
              >
                Bid Now
              </Button>
            ) : (
              <Button size="sm" className="col-span-2 bg-primary text-primary-foreground hover:bg-primary/90 transition-all hover:shadow-md hover:-translate-y-0.5">
                View Listing
              </Button>
            )}
          </div>
        </div>
      </Card>
    </Link>
  );
};

export default ItemCard;
