import { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { MapPin, Package, Heart, Clock, Shield, Palette, Eye } from "lucide-react";
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
      <Card className={`group overflow-hidden transition-all duration-300 hover:shadow-xl hover:-translate-y-1 active:scale-[0.98] cursor-pointer bg-card border-2 shadow-md h-full flex flex-col ${
        isUrgent ? 'animate-urgent-glow' : ''
      }`}>
        <div className="relative aspect-[3/4] sm:aspect-[2/3] overflow-hidden bg-muted flex-shrink-0">
          <img
            src={image}
            alt={title}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-110 filter saturate-110"
            loading="lazy"
          />
          <div className="absolute top-3 right-3 z-10 flex items-center gap-1">
            <FavoriteButton listingId={id} showCount />
            {isAuction && (
              <Button
                size="icon"
                variant={isWatching ? "default" : "secondary"}
                className="h-8 w-8 rounded-full shadow-md"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  toggleWatch();
                }}
              >
                <Eye className={`h-4 w-4 ${isWatching ? 'fill-current' : ''}`} />
              </Button>
            )}
          </div>
          <div className="absolute top-3 left-3 flex flex-col gap-2">
            {showTradeBadge && (
              <Badge className="font-semibold bg-green-600 hover:bg-green-700 text-white flex items-center gap-1">
                <Package className="h-3 w-3" />
                TRADE
              </Badge>
            )}
            {category === "art" && (
              <Badge className={`font-semibold ${isVerifiedArtist ? "bg-purple-600 hover:bg-purple-700" : "bg-purple-500 hover:bg-purple-600"} text-white flex items-center gap-1`}>
                <Palette className="h-3 w-3" />
                {isVerifiedArtist ? "Original Art by Verified Artist" : "Original Art"}
              </Badge>
            )}
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
        
        <div className="p-3 sm:p-4 space-y-2.5 sm:space-y-3 flex-1 flex flex-col">
          <div className="flex-1">
            <h3 className="line-clamp-2 text-sm sm:text-base mb-2 group-hover:text-primary transition-colors leading-snug">
              <span className="font-bold">{title}</span>
            </h3>
            
            {/* Variant info */}
            {variantType && (
              <Badge variant="outline" className="text-xs mb-2">
                {variantType}
              </Badge>
            )}
            
            {variantDetails && (
              <p className="text-xs text-muted-foreground mb-2">
                {variantDetails}
              </p>
            )}
            
            {/* Art subcategory and COA */}
            {category === "art" && subcategory && (
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs text-muted-foreground capitalize">
                  {subcategory.replace(/_/g, " ")}
                </span>
                {hasCoa ? (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="cursor-help">
                          <Shield className="h-3.5 w-3.5 text-blue-500" />
                        </div>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Verified with Certificate of Authenticity.</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                ) : (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="cursor-help">
                          <Shield className="h-3.5 w-3.5 text-gray-400" />
                        </div>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>COA not provided — verify authenticity before purchase.</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}
              </div>
            )}
            
            {/* Seller Info */}
             {sellerName && sellerCity && (
               <div className="flex items-center justify-between gap-2 mb-3">
                 <div className="flex items-center gap-1.5 text-xs text-muted-foreground min-w-0 flex-wrap">
                   {isVerifiedSeller && (
                     <Badge variant="secondary" className="text-[10px] px-1.5 py-0.5 bg-primary/10 text-primary border-primary/20 flex items-center gap-0.5">
                       <Shield className="h-3 w-3" />
                     </Badge>
                   )}
                   {completedSalesCount >= 10 && (
                     <Badge variant="secondary" className="text-[10px] px-1.5 py-0.5 bg-amber-500/10 text-amber-600 border-amber-500/20 flex items-center gap-0.5">
                       <Shield className="h-3 w-3 fill-current" />
                     </Badge>
                   )}
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
          
          <div className="flex items-center justify-between pt-2 mt-auto border-t">
            {price !== null && price !== undefined && price > 0 ? (
              <div className="text-xl sm:text-2xl font-bold text-[#E60000] drop-shadow-sm">
                ${price}
              </div>
            ) : (
              <div className="text-xs sm:text-sm font-medium text-muted-foreground">
                {showMakeOffer ? "Accepting Offers" : "Price TBD"}
              </div>
            )}
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
