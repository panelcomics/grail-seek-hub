import { Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useWatchlist } from "@/hooks/useWatchlist";
import { cn } from "@/lib/utils";

interface WatchlistButtonProps {
  listingId: string;
  variant?: "default" | "icon";
  className?: string;
}

export const WatchlistButton = ({ 
  listingId, 
  variant = "icon",
  className 
}: WatchlistButtonProps) => {
  const { isInWatchlist, loading, toggleWatchlist } = useWatchlist(listingId);

  const handleClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    await toggleWatchlist();
  };

  if (variant === "icon") {
    return (
      <Button
        variant="ghost"
        size="icon"
        className={cn("h-10 w-10", className)}
        onClick={handleClick}
        disabled={loading}
        aria-label={isInWatchlist ? "Remove from watchlist" : "Add to watchlist"}
      >
        <Heart
          className={cn(
            "h-5 w-5 transition-all",
            isInWatchlist && "fill-primary text-primary"
          )}
        />
      </Button>
    );
  }

  return (
    <Button
      variant={isInWatchlist ? "default" : "outline"}
      className={cn("gap-2", className)}
      onClick={handleClick}
      disabled={loading}
    >
      <Heart
        className={cn(
          "h-4 w-4 transition-all",
          isInWatchlist && "fill-current"
        )}
      />
      {isInWatchlist ? "In Watchlist" : "Add to Watchlist"}
    </Button>
  );
};
