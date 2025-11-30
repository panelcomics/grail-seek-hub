import { Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useWatchlist } from "@/hooks/useWatchlist";
import { cn } from "@/lib/utils";
import { useState } from "react";

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
  const [isAnimating, setIsAnimating] = useState(false);

  const handleClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Trigger scale animation
    setIsAnimating(true);
    setTimeout(() => setIsAnimating(false), 120);
    
    await toggleWatchlist();
  };

  if (variant === "icon") {
    return (
      <button
        onClick={handleClick}
        disabled={loading}
        aria-label={isInWatchlist ? "Remove from watchlist" : "Add to watchlist"}
        className={cn(
          "absolute top-3 right-3 z-10",
          "p-2 rounded-full bg-white/90 backdrop-blur-sm",
          "transition-all duration-200 ease-out",
          "hover:bg-white hover:scale-105",
          "active:scale-95",
          "shadow-lg",
          isAnimating && "scale-[1.15]",
          className
        )}
      >
        <Heart
          className={cn(
            "h-7 w-7 transition-all duration-200",
            isInWatchlist 
              ? "fill-[#E60C2C] stroke-[#E60C2C]" 
              : "fill-none stroke-[#3A3A3A] stroke-2"
          )}
        />
      </button>
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
