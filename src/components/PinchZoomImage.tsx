import { useState, useRef, useCallback, TouchEvent } from "react";
import { cn } from "@/lib/utils";

interface PinchZoomImageProps {
  src: string;
  alt: string;
  className?: string;
  style?: React.CSSProperties;
}

export function PinchZoomImage({ src, alt, className, style }: PinchZoomImageProps) {
  const [scale, setScale] = useState(1);
  const [origin, setOrigin] = useState({ x: 50, y: 50 });
  const [isZooming, setIsZooming] = useState(false);
  const initialDistance = useRef<number | null>(null);
  const initialScale = useRef(1);
  const containerRef = useRef<HTMLDivElement>(null);

  const getDistance = (touches: React.TouchList) => {
    if (touches.length < 2) return 0;
    const touch0 = touches.item(0);
    const touch1 = touches.item(1);
    if (!touch0 || !touch1) return 0;
    const dx = touch0.clientX - touch1.clientX;
    const dy = touch0.clientY - touch1.clientY;
    return Math.sqrt(dx * dx + dy * dy);
  };

  const getMidpoint = (touches: React.TouchList) => {
    if (touches.length < 2 || !containerRef.current) return { x: 50, y: 50 };
    const touch0 = touches.item(0);
    const touch1 = touches.item(1);
    if (!touch0 || !touch1) return { x: 50, y: 50 };
    const rect = containerRef.current.getBoundingClientRect();
    const midX = (touch0.clientX + touch1.clientX) / 2;
    const midY = (touch0.clientY + touch1.clientY) / 2;
    return {
      x: ((midX - rect.left) / rect.width) * 100,
      y: ((midY - rect.top) / rect.height) * 100,
    };
  };

  const handleTouchStart = useCallback((e: TouchEvent<HTMLDivElement>) => {
    if (e.touches.length === 2) {
      e.preventDefault();
      initialDistance.current = getDistance(e.touches);
      initialScale.current = scale;
      setOrigin(getMidpoint(e.touches));
      setIsZooming(true);
    }
  }, [scale]);

  const handleTouchMove = useCallback((e: TouchEvent<HTMLDivElement>) => {
    if (e.touches.length === 2 && initialDistance.current) {
      e.preventDefault();
      const currentDistance = getDistance(e.touches);
      const scaleFactor = currentDistance / initialDistance.current;
      const newScale = Math.min(Math.max(initialScale.current * scaleFactor, 1), 4);
      setScale(newScale);
      setOrigin(getMidpoint(e.touches));
    }
  }, []);

  const handleTouchEnd = useCallback(() => {
    initialDistance.current = null;
    setIsZooming(false);
    // Reset to normal after a delay if zoomed out
    if (scale <= 1.1) {
      setScale(1);
      setOrigin({ x: 50, y: 50 });
    }
  }, [scale]);

  // Double tap to zoom
  const lastTap = useRef<number>(0);
  const handleDoubleTap = useCallback((e: TouchEvent<HTMLDivElement>) => {
    if (e.touches.length !== 1) return;
    
    const now = Date.now();
    const timeDiff = now - lastTap.current;
    lastTap.current = now;
    
    if (timeDiff < 300 && timeDiff > 0) {
      e.preventDefault();
      if (scale > 1) {
        // Reset zoom
        setScale(1);
        setOrigin({ x: 50, y: 50 });
      } else {
        // Zoom in to 2x at tap location
        const rect = containerRef.current?.getBoundingClientRect();
        if (rect) {
          setOrigin({
            x: ((e.touches[0].clientX - rect.left) / rect.width) * 100,
            y: ((e.touches[0].clientY - rect.top) / rect.height) * 100,
          });
        }
        setScale(2);
      }
    }
  }, [scale]);

  return (
    <div
      ref={containerRef}
      className={cn("overflow-hidden touch-none", className)}
      onTouchStart={(e) => {
        handleTouchStart(e);
        handleDoubleTap(e);
      }}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      <img
        src={src}
        alt={alt}
        className={cn(
          "w-full h-full object-contain transition-transform",
          !isZooming && "duration-200"
        )}
        style={{
          ...style,
          transform: `scale(${scale})`,
          transformOrigin: `${origin.x}% ${origin.y}%`,
        }}
        draggable={false}
      />
      {scale > 1 && (
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 bg-black/60 text-white text-xs px-2 py-1 rounded-full">
          {Math.round(scale * 100)}% • Double-tap to reset
        </div>
      )}
    </div>
  );
}
