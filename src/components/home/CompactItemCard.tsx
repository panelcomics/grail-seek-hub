/**
 * Compact Item Card for Homepage Grid
 * 
 * Purpose: Smaller, denser card for homepage grid view.
 * Shows essential info (image, title, price, grade) without excess padding.
 * Maintains premium feel with clean typography and hover effects.
 * 
 * Use this for grid layouts where density matters.
 * Use regular ItemCard for carousels and detail views.
 */

import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Link } from "react-router-dom";
import { getRotationTransform } from "@/lib/imageRotation";
import { HeatScoreBadge } from "@/components/HeatScoreBadge";

interface CompactItemCardProps {
  id: string;
  title: string;
  price?: number | null;
  image: string;
  isSlab?: boolean;
  grade?: string | null;
  gradingCompany?: string | null;
  keyInfo?: string | null;
  isSigned?: boolean;
  signatureType?: string | null;
  isAuction?: boolean;
  imageRotation?: number | null;
  priority?: boolean;
  sellerId?: string; // For fairness tracking
  heatScore?: number | null; // Optional heat score (0-100)
}

export function CompactItemCard({
  id,
  title,
  price,
  image,
  isSlab = false,
  grade = null,
  gradingCompany = null,
  keyInfo = null,
  isSigned = false,
  signatureType = null,
  isAuction = false,
  imageRotation = null,
  priority = false,
  heatScore = null,
}: CompactItemCardProps) {
  
  // Get grade display text
  const getGradeText = () => {
    if (isSlab && grade) {
      const company = gradingCompany || 'CGC';
      return `${company} ${grade}`;
    }
    return null;
  };
  
  // Get signature badge
  const getSignatureBadge = () => {
    if (!isSigned) return null;
    if (signatureType === 'CGC Signature Series') return 'SS';
    if (signatureType === 'CBCS Signature Verified') return 'CBCS';
    return 'Signed';
  };

  const isKeyIssue = !!keyInfo;
  const gradeText = getGradeText();
  const signatureBadge = getSignatureBadge();

  return (
    <Link to={`/listing/${id}`}>
      <Card className="group overflow-hidden transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5 cursor-pointer bg-card border rounded-lg h-full flex flex-col">
        {/* 
          Image container - compact aspect ratio
          Mobile: shorter height for 2-col grid
          Desktop: taller for 4-5 col grid
        */}
        <div className="relative overflow-hidden bg-muted flex-shrink-0 aspect-[3/4] flex items-center justify-center">
          <img
            src={image}
            alt={title}
            width={300}
            height={400}
            sizes="(max-width: 640px) 45vw, (max-width: 1024px) 30vw, 20vw"
            className="w-full h-full object-contain p-1.5 sm:p-2 transition-transform duration-300 group-hover:scale-105"
            loading={priority ? "eager" : "lazy"}
            decoding="async"
            fetchPriority={priority ? "high" : "auto"}
            style={{
              transform: getRotationTransform(imageRotation)
            }}
          />
          
          {/* Badges overlay - top right */}
          <div className="absolute top-1.5 right-1.5 flex flex-col gap-0.5 items-end">
            {gradeText && (
              <Badge variant="secondary" className="text-[9px] font-bold px-1 py-0 leading-tight">
                {gradeText}
              </Badge>
            )}
            {signatureBadge && (
              <Badge className="text-[9px] font-bold px-1 py-0 leading-tight bg-amber-500 text-white border-0">
                {signatureBadge}
              </Badge>
            )}
            {isKeyIssue && (
              <Badge className="text-[9px] font-bold px-1 py-0 leading-tight bg-destructive text-destructive-foreground border-0">
                Key
              </Badge>
            )}
          </div>
        </div>
        
        {/* Card content - compact padding */}
        <div className="p-2 sm:p-2.5 flex-1 flex flex-col min-h-0">
          {/* Title - 2 lines max */}
          <h3 className="font-semibold text-xs sm:text-sm leading-tight line-clamp-2 text-foreground mb-auto">
            {title}
          </h3>
          
          {/* Heat Score - if provided */}
          {heatScore !== null && heatScore !== undefined && (
            <div className="mt-1">
              <HeatScoreBadge score={heatScore} size="sm" showLabel={false} />
            </div>
          )}
          
          {/* Price row */}
          <div className="flex items-baseline justify-between mt-1.5">
            {price !== null && price !== undefined && price > 0 ? (
              <span className="text-base sm:text-lg font-bold text-primary">
                ${price.toLocaleString()}
              </span>
            ) : (
              <span className="text-xs text-muted-foreground">
                Contact
              </span>
            )}
            {isAuction && (
              <span className="text-[8px] font-medium text-muted-foreground uppercase">
                bid
              </span>
            )}
          </div>
        </div>
      </Card>
    </Link>
  );
}

export default CompactItemCard;
