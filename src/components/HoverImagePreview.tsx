import { useState, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { getRotationTransform } from "@/lib/imageRotation";

interface HoverImagePreviewProps {
  imageSrc: string;
  imageAlt: string;
  rotation?: number | null;
  children: React.ReactNode;
  delay?: number; // delay in ms before showing preview
  disabled?: boolean; // disable on mobile/touch
}

export function HoverImagePreview({
  imageSrc,
  imageAlt,
  rotation = null,
  children,
  delay = 800,
  disabled = false,
}: HoverImagePreviewProps) {
  const [showPreview, setShowPreview] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleMouseEnter = useCallback(() => {
    if (disabled) return;
    
    // Start timer to show preview
    timeoutRef.current = setTimeout(() => {
      setShowPreview(true);
    }, delay);
  }, [delay, disabled]);

  const handleMouseLeave = useCallback(() => {
    // Clear timer and hide preview
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    setShowPreview(false);
    setIsLoaded(false);
  }, []);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  // Preload image when preview should show
  useEffect(() => {
    if (showPreview && imageSrc) {
      const img = new Image();
      img.onload = () => setIsLoaded(true);
      img.src = imageSrc;
    }
  }, [showPreview, imageSrc]);

  // Get viewport-relative position for the preview panel
  const getPreviewPosition = () => {
    if (!containerRef.current) return { side: 'right' as const, top: 100 };
    
    const rect = containerRef.current.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const previewWidth = Math.min(600, viewportWidth * 0.4);
    
    // Determine which side has more space
    const spaceOnRight = viewportWidth - rect.right;
    const spaceOnLeft = rect.left;
    
    const side = spaceOnRight >= previewWidth + 20 ? 'right' : 'left';
    
    // Calculate vertical position (centered on the card, but clamped to viewport)
    const cardCenterY = rect.top + rect.height / 2;
    const previewHeight = Math.min(window.innerHeight * 0.8, 800);
    let top = cardCenterY - previewHeight / 2;
    
    // Clamp to viewport
    top = Math.max(20, Math.min(top, window.innerHeight - previewHeight - 20));
    
    return { side, top, previewWidth, previewHeight };
  };

  const position = showPreview ? getPreviewPosition() : null;

  return (
    <div
      ref={containerRef}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className="relative"
    >
      {children}
      
      {/* Preview Portal - renders outside normal DOM hierarchy */}
      {showPreview && position && createPortal(
        <div
          className="fixed z-[9999] pointer-events-none animate-in fade-in-0 zoom-in-95 duration-200"
          style={{
            top: position.top,
            [position.side]: 20,
            width: position.previewWidth,
            maxHeight: position.previewHeight,
          }}
        >
          <div className="bg-background/95 backdrop-blur-sm border border-border rounded-lg shadow-2xl overflow-hidden">
            {/* Loading state */}
            {!isLoaded && (
              <div className="flex items-center justify-center p-8 min-h-[300px]">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
              </div>
            )}
            
            {/* Image */}
            <img
              src={imageSrc}
              alt={imageAlt}
              className={`w-full h-auto object-contain max-h-[70vh] transition-opacity duration-200 ${
                isLoaded ? 'opacity-100' : 'opacity-0 absolute'
              }`}
              style={{
                transform: getRotationTransform(rotation),
              }}
            />
            
            {/* Hint text */}
            <div className="px-3 py-2 text-xs text-muted-foreground text-center bg-muted/50">
              Move mouse away to close
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}

// Hook to detect if device supports hover (desktop)
export function useSupportsHover() {
  const [supportsHover, setSupportsHover] = useState(false);
  
  useEffect(() => {
    // Check if device has hover capability
    const mediaQuery = window.matchMedia('(hover: hover) and (pointer: fine)');
    setSupportsHover(mediaQuery.matches);
    
    const handler = (e: MediaQueryListEvent) => setSupportsHover(e.matches);
    mediaQuery.addEventListener('change', handler);
    
    return () => mediaQuery.removeEventListener('change', handler);
  }, []);
  
  return supportsHover;
}