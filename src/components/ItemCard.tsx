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
      <Card className="group overflow-hidden transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5 cursor-pointer bg-card border rounded-lg h-full flex flex-col">
        {/* Image container with 3:4 aspect ratio for tall book covers */}
        <div className="relative aspect-[3/4] overflow-hidden bg-muted flex-shrink-0">
          <img
            src={image}
            alt={title}
            className="h-full w-full object-cover object-center transition-transform duration-500 group-hover:scale-105"
            loading="lazy"
          />
          
          {/* Top-left: Single condition badge (grade or slab/raw status) */}
          <div className="absolute top-2 left-2">
            <Badge className="bg-black/90 hover:bg-black text-white font-bold text-xs px-2.5 py-1 backdrop-blur-sm shadow-lg border-0">
              {grade ? `CGC ${grade}` : (isSlab ? 'Slab' : 'Raw')}
            </Badge>
          </div>
          
          {/* Top-right: Favorite button */}
          <div className="absolute top-2 right-2">
            <FavoriteButton listingId={id} showCount />
          </div>

          {/* Bottom: Auction countdown */}
          {isAuction && countdown > 0 && (
            <div className={`absolute bottom-0 left-0 right-0 px-3 py-2 flex items-center justify-center gap-1.5 text-xs font-bold backdrop-blur-md ${
              isUrgent 
                ? 'bg-destructive/95 text-destructive-foreground' 
                : 'bg-black/85 text-white'
            }`}>
              <Clock className="h-3.5 w-3.5" />
              Ends in {formatTime(countdown)}
            </div>
          )}
        </div>
        
        {/* Card content */}
        <div className="p-3.5 flex-1 flex flex-col min-h-0">
          {/* Title - fixed height with ellipsis */}
          <h3 className="font-semibold text-sm leading-tight line-clamp-2 mb-2 min-h-[2.5rem] text-foreground">
            {title}
          </h3>
          
          {/* Spacer to push price to bottom */}
          <div className="flex-1 min-h-2" />

          {/* Price row */}
          <div className="space-y-1.5 mt-auto">
            {price !== null && price !== undefined && price > 0 ? (
              <div className="flex items-baseline gap-1.5">
                <span className="text-2xl font-bold text-foreground">
                  ${price.toLocaleString()}
                </span>
                <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">
                  {isAuction ? "bid" : ""}
                </span>
              </div>
            ) : (
              <div className="text-sm font-medium text-muted-foreground">
                {showMakeOffer ? "Accepting Offers" : "Contact"}
              </div>
            )}

            {/* Bottom row: listing type + local pickup indicator */}
            <div className="flex items-center gap-1.5 flex-wrap">
              {localPickupAvailable && (
                <div className="flex items-center gap-0.5 text-[10px] text-muted-foreground">
                  <MapPin className="h-3 w-3" />
                  <span className="font-medium">Local pickup</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </Card>
    </Link>
  );
};

export default ItemCard;
