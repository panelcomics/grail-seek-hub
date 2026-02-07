/**
 * Enhanced Compact Item Card (Visual Parity Upgrade)
 * 
 * Upgraded version of CompactItemCard with:
 * - Larger cover image area (taller aspect ratio)
 * - Reduced whitespace / tighter padding
 * - Stronger border + shadow
 * - Bolder price emphasis
 * 
 * Only used when ENABLE_VISUAL_PARITY_UPGRADE is true.
 * Same props/behavior as CompactItemCard — purely visual changes.
 */

import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Link } from "react-router-dom";
import { getRotationTransform } from "@/lib/imageRotation";
import { HeatScoreBadge } from "@/components/HeatScoreBadge";
import { RestorationBadge, hasRestoration } from "@/components/RestorationBadge";
import { GridDensity } from "@/hooks/useVisualParity";
import { cn } from "@/lib/utils";

interface EnhancedCompactItemCardProps {
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
  signedBy?: string | null;
  isAuction?: boolean;
  imageRotation?: number | null;
  priority?: boolean;
  sellerId?: string;
  heatScore?: number | null;
  restorationMarkers?: string[] | null;
  density?: GridDensity;
}

export function EnhancedCompactItemCard({
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
  signedBy = null,
  isAuction = false,
  imageRotation = null,
  priority = false,
  heatScore = null,
  restorationMarkers = null,
  density = "comfortable",
}: EnhancedCompactItemCardProps) {
  const isCompact = density === "compact";

  const getGradeText = () => {
    if (isSlab && grade) {
      const company = gradingCompany || 'CGC';
      return `${company} ${grade}`;
    }
    return null;
  };

  const getSignatureBadge = () => {
    if (!isSigned) return null;
    if (signedBy) {
      const prefix = signatureType === 'CGC Signature Series' ? 'SS: ' :
                     signatureType === 'CGC JSA Authentic' ? 'JSA: ' :
                     signatureType === 'CBCS Signature Verified' ? 'CBCS: ' : '';
      return `${prefix}${signedBy}`;
    }
    if (signatureType === 'CGC Signature Series') return 'SS';
    if (signatureType === 'CGC JSA Authentic') return 'JSA';
    if (signatureType === 'CBCS Signature Verified') return 'CBCS';
    return 'Signed';
  };

  const isKeyIssue = !!keyInfo;
  const gradeText = getGradeText();
  const signatureBadge = getSignatureBadge();

  return (
    <Link to={`/listing/${id}`}>
      <Card
        className={cn(
          "group overflow-hidden cursor-pointer h-full flex flex-col",
          "transition-all duration-200 hover:-translate-y-1",
          // Enhanced visuals: stronger border, shadow, and hover
          "border-2 border-border/60 bg-card",
          "shadow-[var(--shadow-card)] hover:shadow-[var(--shadow-card-hover)]",
          isCompact ? "rounded-md" : "rounded-lg"
        )}
      >
        {/* Image container — taller aspect ratio for bigger covers */}
        <div
          className={cn(
            "relative overflow-hidden bg-secondary/5 flex-shrink-0 flex items-center justify-center",
            isCompact ? "aspect-[2/3]" : "aspect-[3/4.5]"
          )}
        >
          <img
            src={image}
            alt={title}
            width={300}
            height={450}
            sizes="(max-width: 640px) 45vw, (max-width: 1024px) 30vw, 20vw"
            className={cn(
              "w-full h-full object-contain transition-transform duration-300 group-hover:scale-105",
              isCompact ? "p-1" : "p-1.5"
            )}
            loading={priority ? "eager" : "lazy"}
            decoding="async"
            fetchPriority={priority ? "high" : "auto"}
            style={{ transform: getRotationTransform(imageRotation) }}
          />

          {/* Badges overlay */}
          <div className="absolute top-1 right-1 flex flex-col gap-0.5 items-end">
            {gradeText && (
              <Badge variant="secondary" className="text-[9px] font-bold px-1 py-0 leading-tight">
                {gradeText}
              </Badge>
            )}
            {signatureBadge && (
              <Badge className="text-[9px] font-bold px-1 py-0 leading-tight bg-warning text-warning-foreground border-0">
                {signatureBadge}
              </Badge>
            )}
            {isKeyIssue && (
              <Badge className="text-[9px] font-bold px-1 py-0 leading-tight bg-destructive text-destructive-foreground border-0">
                Key
              </Badge>
            )}
            {hasRestoration(restorationMarkers) && (
              <RestorationBadge markers={restorationMarkers} size="sm" showDetails={false} />
            )}
          </div>
        </div>

        {/* Content — reduced padding, bolder price */}
        <div className={cn(
          "flex-1 flex flex-col min-h-0",
          isCompact ? "p-1.5" : "p-2"
        )}>
          {/* Title — 2 lines max */}
          <h3 className={cn(
            "font-semibold leading-tight line-clamp-2 text-foreground mb-auto",
            isCompact ? "text-[11px]" : "text-xs sm:text-sm"
          )}>
            {title}
          </h3>

          {/* Heat Score */}
          {heatScore !== null && heatScore !== undefined && (
            <div className="mt-0.5">
              <HeatScoreBadge score={heatScore} size="sm" showLabel={false} />
            </div>
          )}

          {/* Price row — BIGGER and BOLDER */}
          <div className="flex items-baseline justify-between mt-1">
            {price !== null && price !== undefined && price > 0 ? (
              <span className={cn(
                "font-extrabold text-primary",
                isCompact ? "text-base" : "text-lg sm:text-xl"
              )}>
                ${price.toLocaleString()}
              </span>
            ) : (
              <span className="text-xs text-muted-foreground">Contact</span>
            )}
            {isAuction && (
              <span className="text-[8px] font-medium text-muted-foreground uppercase">bid</span>
            )}
          </div>
        </div>
      </Card>
    </Link>
  );
}
