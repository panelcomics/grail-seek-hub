import { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { MapPin, Package, Heart, Clock, Shield, Palette, Eye, Star } from "lucide-react";
import { FavoriteButton } from "@/components/FavoriteButton";
import { SellerBadge } from "@/components/SellerBadge";
import { VerifiedSellerBadge } from "@/components/VerifiedSellerBadge";
import { Link } from "react-router-dom";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
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
}: ItemCardProps) => {
  const [countdown, setCountdown] = useState(timeRemaining);
  const [localPickup, setLocalPickup] = useState(true);
  const [shipNationwide, setShipNationwide] = useState(false);
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

  // Parse grade from condition string (e.g., "CGC 9.8", "Raw NM", "7.5")
  const parseGrade = (condition: string): { grade: string | null; isSlab: boolean } => {
    const gradeMatch = condition.match(/(\d+\.?\d*)/);
    const grade = gradeMatch ? gradeMatch[1] : null;
    const isSlab = condition.toLowerCase().includes('cgc') || 
                   condition.toLowerCase().includes('cbcs') || 
                   condition.toLowerCase().includes('slab');
    return { grade, isSlab };
  };

  const { grade, isSlab } = parseGrade(condition);
  const isRaw = condition.toLowerCase().includes('raw') || (!isSlab && !grade);

  return (
    <Link to={`/item/${id}`}>
      <Card className={`group overflow-hidden transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5 active:scale-[0.98] cursor-pointer bg-card border rounded-xl h-full flex flex-col ${
        isUrgent ? 'ring-2 ring-destructive' : ''
      }`}>
        {/* Full-bleed image */}
        <div className="relative aspect-[3/4] overflow-hidden bg-muted flex-shrink-0">
          <img
            src={image}
            alt={title}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
            loading="lazy"
          />
          
          {/* Top-left badges: Grade and Slab/Raw */}
          <div className="absolute top-2 left-2 flex flex-col gap-1.5">
            {grade && (
              <Badge className="bg-black/80 hover:bg-black/90 text-white font-bold text-xs px-2 py-1 backdrop-blur-sm">
                {isSlab ? `CGC ${grade}` : grade}
              </Badge>
            )}
            {isSlab ? (
              <Badge className="bg-blue-600/90 hover:bg-blue-600 text-white font-semibold text-[10px] px-2 py-0.5 backdrop-blur-sm">
                Slab
              </Badge>
            ) : isRaw ? (
              <Badge className="bg-gray-600/90 hover:bg-gray-600 text-white font-semibold text-[10px] px-2 py-0.5 backdrop-blur-sm">
                Raw
              </Badge>
            ) : null}
            {showTradeBadge && (
              <Badge className="bg-green-600/90 hover:bg-green-700 text-white font-semibold text-[10px] px-2 py-0.5 backdrop-blur-sm flex items-center gap-1">
                <Package className="h-2.5 w-2.5" />
                TRADE
              </Badge>
            )}
            {category === "art" && (
              <Badge className={`font-semibold text-[10px] px-2 py-0.5 backdrop-blur-sm ${
                isVerifiedArtist 
                  ? "bg-purple-600/90 hover:bg-purple-700" 
                  : "bg-purple-500/90 hover:bg-purple-600"
              } text-white flex items-center gap-1`}>
                <Palette className="h-2.5 w-2.5" />
                ART
              </Badge>
            )}
          </div>
          
          {/* Top-right: Favorite and Watch buttons */}
          <div className="absolute top-2 right-2 flex items-center gap-1">
            <FavoriteButton listingId={id} showCount />
            {isAuction && (
              <Button
                size="icon"
                variant={isWatching ? "default" : "secondary"}
                className="h-7 w-7 rounded-full shadow-md backdrop-blur-sm bg-background/80 hover:bg-background"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  toggleWatch();
                }}
              >
                <Eye className={`h-3.5 w-3.5 ${isWatching ? 'fill-current' : ''}`} />
              </Button>
            )}
          </div>

          {/* Time remaining badge at bottom */}
          {isAuction && countdown > 0 && (
            <div className={`absolute bottom-0 left-0 right-0 px-2 py-1.5 flex items-center justify-center gap-1.5 text-xs font-bold ${
              isUrgent 
                ? 'bg-destructive text-destructive-foreground' 
                : 'bg-black/70 text-white backdrop-blur-sm'
            }`}>
              <Clock className="h-3 w-3" />
              Ends in {formatTime(countdown)}
            </div>
          )}
        </div>
        
        {/* Card content */}
        <div className="p-3 flex-1 flex flex-col">
          {/* Title */}
          <h3 className="font-bold text-sm leading-tight line-clamp-2 mb-2 group-hover:text-primary transition-colors">
            {title}
          </h3>
          
          {/* Seller info with trust badges */}
          {sellerName && (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-2 flex-wrap">
              {isVerifiedSeller && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger>
                      <Shield className="h-3 w-3 text-primary" />
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
                      <Star className="h-3 w-3 text-amber-500 fill-amber-500" />
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

          {/* Spacer */}
          <div className="flex-1" />

          {/* Price section */}
          <div className="space-y-2 mt-2">
            {price !== null && price !== undefined && price > 0 ? (
              <div>
                <div className="text-xs text-muted-foreground mb-0.5">
                  {isAuction ? "Current bid" : "Price"}
                </div>
                <div className="text-2xl font-bold text-primary">
                  ${price.toLocaleString()}
                </div>
              </div>
            ) : (
              <div className="text-sm font-medium text-muted-foreground">
                {showMakeOffer ? "Accepting Offers" : "Contact seller"}
              </div>
            )}

            {/* Local pickup indicator */}
            {isLocal && (
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <MapPin className="h-3 w-3" />
                <span>Local pickup available</span>
              </div>
            )}

            {/* Listing type badge */}
            {isAuction && (
              <Badge variant="outline" className="text-[10px] w-fit">
                Auction
              </Badge>
            )}
            {!isAuction && !isClaimSale && (
              <Badge variant="outline" className="text-[10px] w-fit">
                Buy Now
              </Badge>
            )}
          </div>
        </div>
      </Card>
    </Link>
  );
};

export default ItemCard;
