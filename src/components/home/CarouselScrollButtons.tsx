/**
 * Carousel Scroll Buttons
 * 
 * Desktop-only left/right arrow buttons for horizontal carousels.
 * Shows/hides based on scroll position.
 */

import { useState, useEffect, useCallback, RefObject } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface CarouselScrollButtonsProps {
  scrollRef: RefObject<HTMLDivElement>;
  scrollAmount?: number;
}

export function CarouselScrollButtons({ scrollRef, scrollAmount = 300 }: CarouselScrollButtonsProps) {
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const updateScrollState = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 0);
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
  }, [scrollRef]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    updateScrollState();
    el.addEventListener("scroll", updateScrollState, { passive: true });
    window.addEventListener("resize", updateScrollState);
    
    // Check after images might load
    const timer = setTimeout(updateScrollState, 500);

    return () => {
      el.removeEventListener("scroll", updateScrollState);
      window.removeEventListener("resize", updateScrollState);
      clearTimeout(timer);
    };
  }, [updateScrollState]);

  const scroll = (direction: "left" | "right") => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollBy({ 
      left: direction === "left" ? -scrollAmount : scrollAmount, 
      behavior: "smooth" 
    });
  };

  return (
    <>
      {canScrollLeft && (
        <Button
          variant="outline"
          size="icon"
          onClick={() => scroll("left")}
          className={cn(
            "hidden md:flex absolute left-1 top-1/2 -translate-y-1/2 z-10",
            "h-9 w-9 rounded-full bg-background/90 backdrop-blur-sm shadow-lg",
            "border-border/50 hover:bg-background hover:scale-105 transition-all"
          )}
          aria-label="Scroll left"
        >
          <ChevronLeft className="h-5 w-5" />
        </Button>
      )}
      {canScrollRight && (
        <Button
          variant="outline"
          size="icon"
          onClick={() => scroll("right")}
          className={cn(
            "hidden md:flex absolute right-1 top-1/2 -translate-y-1/2 z-10",
            "h-9 w-9 rounded-full bg-background/90 backdrop-blur-sm shadow-lg",
            "border-border/50 hover:bg-background hover:scale-105 transition-all"
          )}
          aria-label="Scroll right"
        >
          <ChevronRight className="h-5 w-5" />
        </Button>
      )}
    </>
  );
}
