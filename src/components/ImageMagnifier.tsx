import { useState, useRef, MouseEvent, TouchEvent } from "react";
import { ZoomIn, ZoomOut } from "lucide-react";
import { cn } from "@/lib/utils";

interface ImageMagnifierProps {
  src: string;
  alt: string;
  className?: string;
  magnifierSize?: number;
  zoomLevel?: number;
}

export function ImageMagnifier({
  src,
  alt,
  className,
  magnifierSize = 150,
  zoomLevel = 2.5,
}: ImageMagnifierProps) {
  const [showMagnifier, setShowMagnifier] = useState(false);
  const [magnifierPosition, setMagnifierPosition] = useState({ x: 0, y: 0 });
  const [cursorPosition, setCursorPosition] = useState({ x: 0, y: 0 });
  const [isZoomEnabled, setIsZoomEnabled] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleMouseMove = (e: MouseEvent<HTMLDivElement>) => {
    if (!isZoomEnabled || !containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Calculate position as percentage
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

    // Keep within bounds
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

  const handleTouchStart = () => {
    if (isZoomEnabled) setShowMagnifier(true);
  };

  const handleTouchEnd = () => {
    setShowMagnifier(false);
  };

  const toggleZoom = () => {
    setIsZoomEnabled(!isZoomEnabled);
    if (isZoomEnabled) setShowMagnifier(false);
  };

  return (
    <div className="relative">
      {/* Zoom Toggle Button */}
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

      {/* Zoom hint */}
      {isZoomEnabled && !showMagnifier && (
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-20 px-3 py-1.5 rounded-full bg-background/80 backdrop-blur-sm border border-border text-xs text-muted-foreground">
          Hover or touch to magnify
        </div>
      )}

      {/* Image Container */}
      <div
        ref={containerRef}
        className={cn(
          "relative overflow-hidden",
          isZoomEnabled && "cursor-zoom-in",
          className
        )}
        onMouseMove={handleMouseMove}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onTouchMove={handleTouchMove}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        <img
          src={src}
          alt={alt}
          className="w-full h-full object-contain"
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
              backgroundImage: `url(${src})`,
              backgroundRepeat: "no-repeat",
              backgroundSize: `${zoomLevel * 100}% ${zoomLevel * 100}%`,
              backgroundPosition: `${magnifierPosition.x}% ${magnifierPosition.y}%`,
            }}
          />
        )}
      </div>
    </div>
  );
}
