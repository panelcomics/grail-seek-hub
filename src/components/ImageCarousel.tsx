import { useState, useRef, MouseEvent, TouchEvent } from "react";
import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut } from "lucide-react";
import { Button } from "./ui/button";
import { cn } from "@/lib/utils";
import { getRotationTransform } from "@/lib/imageRotation";

interface ImageCarouselProps {
  images: Array<{ url: string; thumbnail_url?: string }>;
  className?: string;
  rotation?: number | null;
}

export function ImageCarousel({ images, className, rotation }: ImageCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showMagnifier, setShowMagnifier] = useState(false);
  const [isZoomEnabled, setIsZoomEnabled] = useState(false);
  const [magnifierPosition, setMagnifierPosition] = useState({ x: 0, y: 0 });
  const [cursorPosition, setCursorPosition] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  const magnifierSize = 150;
  const zoomLevel = 2.5;

  if (!images || images.length === 0) {
    return (
      <div className="w-full aspect-square bg-muted flex items-center justify-center rounded-lg">
        <p className="text-muted-foreground">No image available</p>
      </div>
    );
  }

  const handlePrevious = () => {
    setCurrentIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1));
  };

  const handleNext = () => {
    setCurrentIndex((prev) => (prev === images.length - 1 ? 0 : prev + 1));
  };

  const handleMouseMove = (e: MouseEvent<HTMLDivElement>) => {
    if (!isZoomEnabled || !containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const xPercent = (x / rect.width) * 100;
    const yPercent = (y / rect.height) * 100;

    setCursorPosition({ x, y });
    setMagnifierPosition({ x: xPercent, y: yPercent });
  };

  const handleTouchMove = (e: TouchEvent<HTMLDivElement>) => {
    if (!isZoomEnabled || !containerRef.current) return;
    
    const touch = e.touches[0];
    const rect = containerRef.current.getBoundingClientRect();
    const x = touch.clientX - rect.left;
    const y = touch.clientY - rect.top;

    const boundedX = Math.max(0, Math.min(x, rect.width));
    const boundedY = Math.max(0, Math.min(y, rect.height));

    const xPercent = (boundedX / rect.width) * 100;
    const yPercent = (boundedY / rect.height) * 100;

    setCursorPosition({ x: boundedX, y: boundedY });
    setMagnifierPosition({ x: xPercent, y: yPercent });
    setShowMagnifier(true);
  };

  const handleMouseEnter = () => {
    if (isZoomEnabled) setShowMagnifier(true);
  };

  const handleMouseLeave = () => {
    setShowMagnifier(false);
  };

  const toggleZoom = () => {
    setIsZoomEnabled(!isZoomEnabled);
    if (isZoomEnabled) setShowMagnifier(false);
  };

  const currentImageUrl = images[currentIndex].url;

  // Detect touch device - hide magnifier lens on mobile
  const isTouchDevice = typeof window !== 'undefined' && ('ontouchstart' in window || navigator.maxTouchPoints > 0);

  return (
    <div className={cn("relative group", className)}>
      {/* Zoom Toggle Button - only on desktop (non-touch) */}
      {!isTouchDevice && (
        <button
          onClick={toggleZoom}
          className={cn(
            "absolute top-3 right-3 z-20 p-2 rounded-full transition-all duration-200",
            "bg-background/80 backdrop-blur-sm border border-border shadow-md",
            "hover:bg-background hover:scale-105",
            isZoomEnabled && "bg-primary text-primary-foreground hover:bg-primary/90"
          )}
          aria-label={isZoomEnabled ? "Disable zoom" : "Enable zoom"}
        >
          {isZoomEnabled ? (
            <ZoomOut className="h-5 w-5" />
          ) : (
            <ZoomIn className="h-5 w-5" />
          )}
        </button>
      )}

      {/* Zoom hint - desktop only */}
      {!isTouchDevice && isZoomEnabled && !showMagnifier && (
        <div className="absolute bottom-14 left-1/2 -translate-x-1/2 z-20 px-3 py-1.5 rounded-full bg-background/80 backdrop-blur-sm border border-border text-xs text-muted-foreground">
          Hover to magnify
        </div>
      )}

      <div
        ref={containerRef}
        className={cn(
          "relative w-full aspect-square overflow-hidden rounded-lg bg-muted",
          isZoomEnabled && "cursor-zoom-in"
        )}
        onMouseMove={handleMouseMove}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onTouchMove={!isTouchDevice ? handleTouchMove : undefined}
        onTouchStart={!isTouchDevice ? () => isZoomEnabled && setShowMagnifier(true) : undefined}
        onTouchEnd={!isTouchDevice ? () => setShowMagnifier(false) : undefined}
      >
        <img
          src={currentImageUrl}
          alt={`Image ${currentIndex + 1}`}
          className="w-full h-full object-contain transition-transform duration-200"
          style={{
            transform: getRotationTransform(rotation)
          }}
          draggable={false}
        />

        {/* Magnifier Glass */}
        {showMagnifier && isZoomEnabled && (
          <div
            className="absolute pointer-events-none rounded-full border-2 border-primary shadow-lg overflow-hidden"
            style={{
              width: `${magnifierSize}px`,
              height: `${magnifierSize}px`,
              left: `${cursorPosition.x - magnifierSize / 2}px`,
              top: `${cursorPosition.y - magnifierSize / 2}px`,
              backgroundImage: `url(${currentImageUrl})`,
              backgroundRepeat: "no-repeat",
              backgroundSize: `${zoomLevel * 100}% ${zoomLevel * 100}%`,
              backgroundPosition: `${magnifierPosition.x}% ${magnifierPosition.y}%`,
            }}
          />
        )}
        
        {images.length > 1 && (
          <>
            <Button
              variant="ghost"
              size="icon"
              className="absolute left-2 top-1/2 -translate-y-1/2 bg-background/80 hover:bg-background opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={handlePrevious}
            >
              <ChevronLeft className="h-6 w-6" />
            </Button>
            
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-2 top-1/2 -translate-y-1/2 bg-background/80 hover:bg-background opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={handleNext}
            >
              <ChevronRight className="h-6 w-6" />
            </Button>

            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1">
              {images.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentIndex(index)}
                  className={cn(
                    "w-1 h-1 rounded-full transition-all",
                    index === currentIndex
                      ? "bg-primary w-3"
                      : "bg-white/50 hover:bg-white/75"
                  )}
                  aria-label={`Go to image ${index + 1}`}
                />
              ))}
            </div>
          </>
        )}
      </div>

      {images.length > 1 && (
        <p className="text-center text-sm text-muted-foreground mt-2">
          {currentIndex + 1} / {images.length}
        </p>
      )}
    </div>
  );
}
