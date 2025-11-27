import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
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

  return (
    <div className={cn("relative group", className)}>
      <div className="relative w-full aspect-square overflow-hidden rounded-lg bg-muted">
        <img
          src={images[currentIndex].url}
          alt={`Image ${currentIndex + 1}`}
          className="w-full h-full object-contain transition-transform duration-200"
          style={{
            transform: getRotationTransform(rotation)
          }}
        />
        
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
