import { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { MapPin, Heart, Clock, Shield, Star } from "lucide-react";
import { FavoriteButton } from "@/components/FavoriteButton";
import { Link } from "react-router-dom";
import { getListingImageUrl } from "@/lib/sellerUtils";
import { Listing } from "@/types/listing";
import { SellerBadge } from "@/components/SellerBadge";
import { FeaturedSellerBadge } from "@/components/FeaturedSellerBadge";
import { VerifiedSellerBadge } from "@/components/VerifiedSellerBadge";
import { useWatchAuction } from "@/hooks/useWatchAuction";
import { SoldOffPlatformBadge } from "@/components/SoldOffPlatformBadge";

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
  sellerTier?: string | null;
  isFeaturedSeller?: boolean;
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
  isSlab?: boolean; // Source of truth from database
  grade?: string | null; // Grade from database
  gradingCompany?: string | null; // Grading company (CGC, CBCS, PGX)
  certificationNumber?: string | null; // Certification/barcode number
  series?: string | null; // Series name
  issueNumber?: string | null; // Issue number
  keyInfo?: string | null; // Key info from details/variant
  showFavorite?: boolean; // Show favorite button (default false to prevent extra queries on homepage)
  soldOffPlatform?: boolean; // If item was sold outside GrailSeeker
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
  sellerTier = null,
  isFeaturedSeller = false,
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
  isSlab = false,
  grade = null,
  gradingCompany = null,
  certificationNumber = null,
  series = null,
  issueNumber = null,
  keyInfo = null,
  showFavorite = false, // Default to false to prevent extra queries on homepage
  soldOffPlatform = false,
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

  // Format the main title line (title + issue number)
  const getMainTitle = () => {
    // If we have an issue number, construct the full title
    if (issueNumber) {
      // Check if title already contains this issue number (avoid duplication)
      const issuePattern = `#${issueNumber}`;
      if (title && title.includes(issuePattern)) {
        return title;
      }
      // Construct from title + issue number
      if (title) {
        return `${title} #${issueNumber}`;
      }
      // Fallback: use series + issue number
      if (series) {
        return `${series} #${issueNumber}`;
      }
    }
    // No issue number, just use title or series
    return title || series || "Untitled";
  };

  // Get grade display text
  const getGradeText = () => {
    if (isSlab && grade) {
      const company = gradingCompany || 'CGC';
      return `${company} ${grade}`;
    }
    if (!isSlab && condition) {
      return condition;
    }
    return null;
  };

  return (
    <Link to={`/listing/${id}`}>
      <Card className="group overflow-hidden transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5 cursor-pointer bg-card border rounded-lg h-full flex flex-col">
        {/* Image container with responsive sizing */}
        <div className="relative overflow-hidden bg-muted flex-shrink-0 w-full h-[240px] sm:h-[280px] md:h-[320px] lg:aspect-[3/4] lg:h-auto flex items-center justify-center">
          <img
            src={image}
            alt={title}
            className="w-full h-full object-contain p-2 sm:p-3 md:p-4 transition-transform duration-500 group-hover:scale-105"
            loading="lazy"
          />
          
          {/* Top-right: Favorite button (only if enabled) */}
          {showFavorite && (
            <div className="absolute top-2 right-2">
              <FavoriteButton listingId={id} showCount />
            </div>
          )}

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

          {/* Seller badges - top left */}
          {(isFeaturedSeller || sellerTier || (isVerifiedSeller && completedSalesCount >= 10)) && (
            <div className="absolute top-2 left-2 flex gap-1">
              {isFeaturedSeller && <FeaturedSellerBadge showLabel={false} />}
              {sellerTier && <SellerBadge tier={sellerTier} />}
              {isVerifiedSeller && completedSalesCount >= 10 && (
                <VerifiedSellerBadge size="sm" showText={false} salesCount={completedSalesCount} />
              )}
            </div>
          )}

          {/* Sold off-platform badge - top center */}
          {soldOffPlatform && (
            <div className="absolute top-2 left-1/2 -translate-x-1/2">
              <SoldOffPlatformBadge />
            </div>
          )}
        </div>
        
        {/* Card content */}
        <div className="p-3 flex-1 flex flex-col min-h-0">
          {/* Main title: Series + Issue Number (bold) */}
          <h3 className="font-bold text-sm leading-tight line-clamp-1 text-foreground mb-1">
            {getMainTitle()}
          </h3>
          
          {/* Key info line - only show if available (smaller, muted, truncated) */}
          {keyInfo && (
            <p className="text-xs text-muted-foreground line-clamp-1 mb-2">
              {keyInfo}
            </p>
          )}
          
          {/* Spacer to push price row to bottom */}
          <div className="flex-1 min-h-1" />

          {/* Bottom row: Price on left, Grade pill on right */}
          <div className="flex items-center justify-between gap-2">
            {/* Left: Price */}
            <div className="flex items-baseline gap-1">
              {price !== null && price !== undefined && price > 0 ? (
                <>
                  <span className="text-xl font-bold text-foreground">
                    ${price.toLocaleString()}
                  </span>
                  {isAuction && (
                    <span className="text-[9px] font-medium text-muted-foreground uppercase tracking-wide">
                      bid
                    </span>
                  )}
                </>
              ) : (
                <span className="text-sm font-medium text-muted-foreground">
                  {showMakeOffer ? "Offers" : "Contact"}
                </span>
              )}
            </div>

            {/* Right: Grade pill */}
            {getGradeText() && (
              <span className="inline-block text-xs font-semibold px-2 py-0.5 rounded-full bg-muted text-foreground whitespace-nowrap flex-shrink-0">
                {getGradeText()}
              </span>
            )}
          </div>

          {/* Optional: Local pickup indicator below if needed */}
          {localPickupAvailable && (
            <div className="flex items-center gap-0.5 text-[10px] text-muted-foreground mt-1">
              <MapPin className="h-3 w-3" />
              <span className="font-medium">Local pickup</span>
            </div>
          )}
        </div>
      </Card>
    </Link>
  );
};

export default ItemCard;
