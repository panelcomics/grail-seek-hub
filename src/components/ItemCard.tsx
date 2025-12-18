import { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { MapPin, Heart, Clock, Shield, Star, CheckCircle } from "lucide-react";
import { FavoriteButton } from "@/components/FavoriteButton";
import { Link } from "react-router-dom";
import { getListingImageUrl } from "@/lib/sellerUtils";
import { Listing } from "@/types/listing";
import { SellerBadge } from "@/components/SellerBadge";
import { FeaturedSellerBadge } from "@/components/FeaturedSellerBadge";
import { VerifiedSellerBadge } from "@/components/VerifiedSellerBadge";
import { useWatchAuction } from "@/hooks/useWatchAuction";
import { SoldOffPlatformBadge } from "@/components/SoldOffPlatformBadge";
import { getRotationTransform } from "@/lib/imageRotation";
import { HeatScoreBadge } from "@/components/HeatScoreBadge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

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
  imageRotation?: number | null; // Rotation in degrees (0, 90, 180, 270)
  priority?: boolean; // Load image with high priority (for above-the-fold content)
  // Signature props
  isSigned?: boolean;
  signatureType?: string | null;
  signedBy?: string | null;
  // Creator badge props
  isApprovedCreator?: boolean;
  // Heat score (optional, 0-100)
  heatScore?: number | null;
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
  imageRotation = null,
  priority = false,
  isSigned = false,
  signatureType = null,
  signedBy = null,
  isApprovedCreator = false,
  heatScore = null,
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

  // Format the main title line (series + issue number only)
  const getMainTitle = () => {
    if (issueNumber) {
      const issuePattern = `#${issueNumber}`;
      if (title && title.includes(issuePattern)) {
        return title;
      }
      if (title) {
        return `${title} #${issueNumber}`;
      }
      if (series) {
        return `${series} #${issueNumber}`;
      }
    }
    return title || series || "Untitled";
  };

  // Build informative subtitle line: grade + signature + key info
  const getSubtitleParts = () => {
    const parts: string[] = [];
    
    // Grade info (e.g., "CGC 7.0")
    if (isSlab && grade) {
      const company = gradingCompany || 'CGC';
      parts.push(`${company} ${grade}`);
    }
    
    // Signature summary
    if (isSigned) {
      if (signatureType === 'CGC Signature Series') {
        parts.push('SS Signed');
      } else if (signatureType === 'CBCS Signature Verified') {
        parts.push('CBCS Verified');
      } else {
        parts.push('Signed');
      }
      if (signedBy) {
        parts.push(signedBy.length > 20 ? signedBy.substring(0, 20) + '...' : signedBy);
      }
    }
    
    // Key info (short)
    if (keyInfo) {
      const shortKey = keyInfo.length > 40 ? keyInfo.substring(0, 40) + '...' : keyInfo;
      parts.push(shortKey);
    }
    
    return parts;
  };

  const subtitleParts = getSubtitleParts();
  const subtitleText = subtitleParts.join(' • ');

  // Get signature badge text for pill
  const getSignatureBadgeText = () => {
    if (!isSigned) return null;
    if (signatureType === 'CGC Signature Series') return 'CGC SS';
    if (signatureType === 'CBCS Signature Verified') return 'CBCS Verified';
    return 'Signed';
  };

  // Check if key issue
  const isKeyIssue = !!keyInfo;

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
      <Card className="group overflow-hidden transition-all duration-300 hover:shadow-xl hover:-translate-y-1 cursor-pointer bg-card border rounded-lg h-full flex flex-col">
        {/* Image container with responsive sizing */}
        <div className="relative overflow-hidden bg-muted flex-shrink-0 w-full h-[240px] sm:h-[280px] md:h-[320px] lg:aspect-[3/4] lg:h-auto flex items-center justify-center">
          <img
            src={image}
            alt={title}
            width="400"
            height="533"
            className="w-full h-full object-contain p-2 sm:p-3 md:p-4 transition-transform duration-500 group-hover:scale-105"
            loading={priority ? "eager" : "lazy"}
            decoding="async"
            fetchPriority={priority ? "high" : "auto"}
            style={{
              transform: `${getRotationTransform(imageRotation)} scale(1)`
            }}
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

          {/* No badges over image - all dealer badges moved to bottom metadata row */}

          {/* Sold off-platform badge - top center */}
          {soldOffPlatform && (
            <div className="absolute top-2 left-1/2 -translate-x-1/2">
              <SoldOffPlatformBadge />
            </div>
          )}
        </div>
        
        {/* Card content */}
        <div className="p-3 flex-1 flex flex-col min-h-0">
          {/* Main title: Series + Issue Number (bold, larger) */}
          <h3 className="font-bold text-lg leading-tight line-clamp-2 text-foreground mb-1">
            {getMainTitle()}
          </h3>
          
          {/* Subtitle line with grade, signature, key info */}
          {subtitleText && (
            <p className="text-xs font-semibold text-foreground/80 tracking-wide line-clamp-2 mb-2">
              {subtitleText}
            </p>
          )}
          
          {/* Spacer to push price row to bottom */}
          <div className="flex-1 min-h-1" />

          {/* Bottom row: Price (left), Premium Dealer badge (center), Grade (right) */}
          <div className="flex items-center justify-between gap-2">
            {/* Left: Price (focal point) */}
            <div className="flex items-baseline gap-1 flex-shrink-0">
              {price !== null && price !== undefined && price > 0 ? (
                <>
                  <span className="text-2xl font-extrabold text-primary">
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

            {/* Center: Single dealer badge (Premium Dealer or Top Dealer) */}
            {isFeaturedSeller ? (
              <Badge className="text-xs font-extrabold px-2.5 py-1 bg-yellow-500 hover:bg-yellow-600 text-foreground border-0">
                Premium Dealer
              </Badge>
            ) : (isVerifiedSeller && completedSalesCount >= 10) ? (
              <Badge className="text-xs font-extrabold px-2.5 py-1 bg-yellow-500 hover:bg-yellow-600 text-foreground border-0">
                Top Dealer
              </Badge>
            ) : null}

            {/* Right side badges group */}
            <div className="flex items-center gap-1 flex-shrink-0">
              {/* Approved Creator badge */}
              {isApprovedCreator && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Badge 
                        variant="secondary" 
                        className="text-[10px] font-bold px-1.5 py-0.5 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30"
                      >
                        <CheckCircle className="h-2.5 w-2.5 mr-0.5" />
                        Creator
                      </Badge>
                    </TooltipTrigger>
                    <TooltipContent side="top">
                      <p className="text-xs">Verified creator on GrailSeeker</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
              
              {/* Grade pill */}
              {getGradeText() && (
                <Badge variant="secondary" className="text-[10px] font-bold px-1.5 py-0.5">
                  {getGradeText()}
                </Badge>
              )}
              
              {/* Signature badge */}
              {getSignatureBadgeText() && (
                <Badge className="text-[10px] font-bold px-1.5 py-0.5 bg-amber-500 hover:bg-amber-600 text-white border-0">
                  {getSignatureBadgeText()}
                </Badge>
              )}
              
              {/* Key Issue badge */}
              {isKeyIssue && (
                <Badge className="text-[10px] font-bold px-1.5 py-0.5 bg-destructive hover:bg-destructive/90 text-destructive-foreground border-0">
                  Key
                </Badge>
              )}
              
              {/* Heat Score badge (if provided) */}
              {heatScore !== null && heatScore !== undefined && (
                <HeatScoreBadge score={heatScore} size="sm" showLabel={false} />
              )}
            </div>
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
