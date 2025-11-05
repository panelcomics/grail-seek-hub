import { Star, Heart } from "lucide-react";

interface SellerStatsProps {
  rating?: number;
  salesCount?: number;
  favoritesTotal?: number;
  showAllStats?: boolean;
  className?: string;
}

export const SellerStats = ({
  rating,
  salesCount,
  favoritesTotal,
  showAllStats = true,
  className = "",
}: SellerStatsProps) => {
  return (
    <div className={`flex flex-wrap items-center gap-3 text-sm text-muted-foreground ${className}`}>
      {rating !== undefined && showAllStats && (
        <div className="flex items-center gap-1">
          <Star className="h-3.5 w-3.5 fill-yellow-500 text-yellow-500" />
          <span className="font-medium">{rating.toFixed(1)}</span>
        </div>
      )}
      {salesCount !== undefined && (
        <span className="font-medium">
          {salesCount} {salesCount === 1 ? "sale" : "sales"}
        </span>
      )}
      {favoritesTotal !== undefined && showAllStats && (
        <div className="flex items-center gap-1">
          <Heart className="h-3.5 w-3.5 fill-primary text-primary" />
          <span className="font-medium">{favoritesTotal}</span>
        </div>
      )}
    </div>
  );
};
