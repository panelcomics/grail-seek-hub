import { Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useFavorites } from "@/hooks/useFavorites";
import { cn } from "@/lib/utils";

interface FavoriteButtonProps {
  listingId: string;
  variant?: "default" | "icon";
  showCount?: boolean;
  className?: string;
}

export const FavoriteButton = ({ 
  listingId, 
  variant = "icon",
  showCount = false,
  className 
}: FavoriteButtonProps) => {
  const { isFavorite, favoritesCount, loading, toggleFavorite } = useFavorites(listingId);

  const handleClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    await toggleFavorite();
  };

  if (variant === "icon") {
    return (
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="icon"
          className={cn("h-8 w-8", className)}
          onClick={handleClick}
          disabled={loading}
          aria-label={isFavorite ? "Remove from watchlist" : "Add to watchlist"}
        >
          <Heart
            className={cn(
              "h-4 w-4 transition-all",
              isFavorite && "fill-primary text-primary"
            )}
          />
        </Button>
        {showCount && favoritesCount > 0 && (
          <span className="text-xs font-medium text-muted-foreground">
            {favoritesCount}
          </span>
        )}
      </div>
    );
  }

  return (
    <Button
      variant={isFavorite ? "default" : "outline"}
      className={cn("gap-2", className)}
      onClick={handleClick}
      disabled={loading}
    >
      <Heart
        className={cn(
          "h-4 w-4 transition-all",
          isFavorite && "fill-current"
        )}
      />
      {isFavorite ? "Favorited" : "Add to Watchlist"}
      {showCount && favoritesCount > 0 && (
        <span className="text-xs opacity-80">({favoritesCount})</span>
      )}
    </Button>
  );
};
