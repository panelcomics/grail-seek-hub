import { Heart, MessageSquare, Share2, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface QuickActionsOverlayProps {
  onWatchlist?: () => void;
  onOffer?: () => void;
  onShare?: () => void;
  onQuickView?: () => void;
  isWatchlisted?: boolean;
  showOffer?: boolean;
  className?: string;
}

export function QuickActionsOverlay({
  onWatchlist,
  onOffer,
  onShare,
  onQuickView,
  isWatchlisted = false,
  showOffer = true,
  className,
}: QuickActionsOverlayProps) {
  return (
    <div
      className={cn(
        "absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center gap-2 pointer-events-none group-hover:pointer-events-auto z-10",
        className
      )}
    >
      {onQuickView && (
        <Button
          size="icon"
          variant="secondary"
          className="h-9 w-9 rounded-full bg-background/90 hover:bg-background shadow-lg"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onQuickView();
          }}
          title="Quick View"
        >
          <Eye className="h-4 w-4" />
        </Button>
      )}
      
      {onWatchlist && (
        <Button
          size="icon"
          variant="secondary"
          className={cn(
            "h-9 w-9 rounded-full bg-background/90 hover:bg-background shadow-lg",
            isWatchlisted && "text-red-500"
          )}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onWatchlist();
          }}
          title={isWatchlisted ? "Remove from Watchlist" : "Add to Watchlist"}
        >
          <Heart className={cn("h-4 w-4", isWatchlisted && "fill-current")} />
        </Button>
      )}
      
      {showOffer && onOffer && (
        <Button
          size="icon"
          variant="secondary"
          className="h-9 w-9 rounded-full bg-background/90 hover:bg-background shadow-lg"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onOffer();
          }}
          title="Make Offer"
        >
          <MessageSquare className="h-4 w-4" />
        </Button>
      )}
      
      {onShare && (
        <Button
          size="icon"
          variant="secondary"
          className="h-9 w-9 rounded-full bg-background/90 hover:bg-background shadow-lg"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onShare();
          }}
          title="Share"
        >
          <Share2 className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}
