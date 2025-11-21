import { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { MapPin, Heart, Clock, Shield, Star } from "lucide-react";
import { FavoriteButton } from "@/components/FavoriteButton";
import { Link } from "react-router-dom";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useWatchAuction } from "@/hooks/useWatchAuction";

interface ItemCardProps {
  id: string;
  title: string;
  price?: number | null;
  condition: string;
  image: string;
  isLocal?: boolean;
  location?: string;
  sellerName?: string;
  sellerCity?: string;
  sellerBadge?: string | null;
  isVerifiedSeller?: boolean;
  completedSalesCount?: number;
  category: "comic" | "card" | "art";
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
  subcategory?: string;
  hasCoa?: boolean;
  isVerifiedArtist?: boolean;
  variantType?: string;
  variantDetails?: string;
  showTradeBadge?: boolean;
  localPickupAvailable?: boolean;
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
  isVerifiedSeller = false,
  completedSalesCount = 0,
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
  showEndingSoonBadge = false,
  subcategory,
  hasCoa = false,
  isVerifiedArtist = false,
  variantType,
  variantDetails,
  showTradeBadge = false,
  localPickupAvailable = false,
}: ItemCardProps) => {
  const [countdown, setCountdown] = useState(timeRemaining);
  const { isWatching, toggleWatch } = useWatchAuction(isAuction ? id : undefined);
  
  const isUrgent = countdown > 0 && countdown <= 600; // Last 10 minutes

  useEffect(() => {
    if (!isAuction || countdown <= 0) return;
    
    const timer = setInterval(() => {
      setCountdown(prev => Math.max(0, prev - 1));
    }, 1000);

    return () => clearInterval(timer);
  }, [isAuction, countdown]);

  const formatTime = (seconds: number) => {
    if (seconds <= 0) return "Ended";
    
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    
    if (days > 0) return `${days}d ${hours}h`;
    if (hours > 0) return `${hours}h ${mins}m`;
    return `${mins}m`;
  };

  // Parse grade from condition string
  const parseGrade = (condition: string): { grade: string | null; isSlab: boolean } => {
    const gradeMatch = condition.match(/(\d+\.?\d*)/);
    const grade = gradeMatch ? gradeMatch[1] : null;
    const isSlab = condition.toLowerCase().includes('cgc') || 
                   condition.toLowerCase().includes('cbcs') || 
                   condition.toLowerCase().includes('slab');
    return { grade, isSlab };
  };

  const { grade, isSlab } = parseGrade(condition);
  const isRaw = !isSlab;

  return (
    <Link to={`/item/${id}`}>
      <Card className="group overflow-hidden transition-all duration-300 hover:shadow-xl hover:-translate-y-1 active:scale-[0.98] cursor-pointer bg-card border rounded-xl h-full flex flex-col shadow-md">
        {/* Image container with 3:4 aspect ratio */}
        <div className="relative aspect-[3/4] overflow-hidden bg-muted flex-shrink-0">
          <img
            src={image}
            alt={title}
            className="h-full w-full object-cover object-center transition-transform duration-500 group-hover:scale-110"
            loading="lazy"
          />
          
          {/* Top-left badges: Grade + Format */}
          <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5">
            {/* Grade Badge */}
            <Badge className="bg-black/85 hover:bg-black/90 text-white font-bold text-xs px-2.5 py-1 backdrop-blur-sm shadow-lg">
              {grade ? (isSlab ? `CGC ${grade}` : grade) : (isSlab ? 'Slab' : 'Raw')}
            </Badge>
            
            {/* Slab/Raw Pill */}
            <Badge 
              variant="secondary" 
              className={`text-[10px] px-2 py-0.5 font-semibold backdrop-blur-sm shadow-md ${
                isSlab 
                  ? 'bg-blue-500/90 hover:bg-blue-600 text-white' 
                  : 'bg-amber-500/90 hover:bg-amber-600 text-white'
              }`}
            >
              {isSlab ? 'Slab' : 'Raw'}
            </Badge>
          </div>
          
          {/* Top-right: Favorite button */}
          <div className="absolute top-2.5 right-2.5">
            <FavoriteButton listingId={id} showCount />
          </div>

          {/* Auction countdown badge at bottom */}
          {isAuction && countdown > 0 && (
            <div className={`absolute bottom-0 left-0 right-0 px-3 py-2 flex items-center justify-center gap-1.5 text-xs font-bold backdrop-blur-md ${
              isUrgent 
                ? 'bg-destructive/95 text-destructive-foreground' 
                : 'bg-black/80 text-white'
            }`}>
              <Clock className="h-3.5 w-3.5" />
              Ends in {formatTime(countdown)}
            </div>
          )}
        </div>
        
        {/* Card content */}
        <div className="p-3 flex-1 flex flex-col min-h-0">
          {/* Title - fixed height with ellipsis */}
          <h3 className="font-bold text-sm leading-snug line-clamp-2 mb-2 min-h-[2.5rem] group-hover:text-primary transition-colors">
            {title}
          </h3>
          
          {/* Seller info with trust badges */}
          {sellerName && (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-2.5 flex-wrap">
              {isVerifiedSeller && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger>
                      <Shield className="h-3.5 w-3.5 text-primary" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="text-xs">Verified Seller</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
              {completedSalesCount >= 10 && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger>
                      <Star className="h-3.5 w-3.5 text-amber-500 fill-amber-500" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="text-xs">Pro Seller ({completedSalesCount}+ sales)</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
              <span className="font-medium truncate">{sellerName}</span>
            </div>
          )}

          {/* Spacer to push price to bottom */}
          <div className="flex-1" />

          {/* Price and listing type */}
          <div className="space-y-2 mt-auto">
            {/* Price */}
            {price !== null && price !== undefined && price > 0 ? (
              <div>
                <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-0.5">
                  {isAuction ? "Current bid" : "Price"}
                </div>
                <div className="text-2xl font-extrabold text-foreground">
                  ${price.toLocaleString()}
                </div>
              </div>
            ) : (
              <div className="text-sm font-medium text-muted-foreground">
                {showMakeOffer ? "Accepting Offers" : "Contact seller"}
              </div>
            )}

            {/* Listing type badge */}
            <div className="flex items-center justify-between gap-2">
              <Badge 
                variant="outline" 
                className={`text-[10px] font-semibold px-2 py-0.5 ${
                  isAuction 
                    ? 'border-primary/40 text-primary' 
                    : 'border-border text-muted-foreground'
                }`}
              >
                {isAuction ? 'Auction' : 'Buy Now'}
              </Badge>

              {/* Local pickup pill */}
              {localPickupAvailable && (
                <Badge 
                  variant="secondary" 
                  className="text-[10px] px-2 py-0.5 bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20 flex items-center gap-1"
                >
                  <MapPin className="h-2.5 w-2.5" />
                  Local
                </Badge>
              )}
            </div>
          </div>
        </div>
      </Card>
    </Link>
  );
};

export default ItemCard;
