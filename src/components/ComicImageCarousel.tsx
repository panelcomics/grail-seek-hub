import { useEffect, useState } from "react";
import { getComicImagesOrdered, getComicImageUrl, type ComicImage } from "@/lib/comicImages";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import { Skeleton } from "@/components/ui/skeleton";

interface ComicImageCarouselProps {
  comicId: string;
  fallbackUrl?: string | null;
  className?: string;
}

export function ComicImageCarousel({ 
  comicId, 
  fallbackUrl, 
  className = "" 
}: ComicImageCarouselProps) {
  const [images, setImages] = useState<ComicImage[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadImages() {
      try {
        const data = await getComicImagesOrdered(comicId);
        setImages(data);
      } catch (error) {
        console.error("Failed to load comic images:", error);
      } finally {
        setLoading(false);
      }
    }

    loadImages();
  }, [comicId]);

  if (loading) {
    return <Skeleton className={`w-full aspect-[2/3] rounded-lg ${className}`} />;
  }

  // If no images in gallery but we have a fallback, show that
  if (images.length === 0 && fallbackUrl) {
    return (
      <div className={`w-full aspect-[2/3] rounded-lg overflow-hidden bg-muted ${className}`}>
        <img 
          src={fallbackUrl} 
          alt="Comic cover" 
          className="w-full h-full object-cover"
        />
      </div>
    );
  }

  // If no images at all
  if (images.length === 0) {
    return (
      <div className={`w-full aspect-[2/3] rounded-lg bg-muted flex items-center justify-center ${className}`}>
        <p className="text-muted-foreground text-sm">No images</p>
      </div>
    );
  }

  // Single image - no carousel needed
  if (images.length === 1) {
    return (
      <div className={`w-full aspect-[2/3] rounded-lg overflow-hidden bg-muted ${className}`}>
        <img 
          src={getComicImageUrl(images[0].storage_path)} 
          alt="Comic cover" 
          className="w-full h-full object-cover"
        />
      </div>
    );
  }

  // Multiple images - show carousel
  return (
    <Carousel className={className}>
      <CarouselContent>
        {images.map((img, index) => (
          <CarouselItem key={img.id}>
            <div className="relative w-full aspect-[2/3] rounded-lg overflow-hidden bg-muted">
              <img 
                src={getComicImageUrl(img.storage_path)} 
                alt={`Comic image ${index + 1}`}
                className="w-full h-full object-cover"
              />
              {img.is_cover && (
                <div className="absolute top-2 right-2 bg-primary text-primary-foreground text-xs px-2 py-1 rounded">
                  Cover
                </div>
              )}
            </div>
          </CarouselItem>
        ))}
      </CarouselContent>
      <CarouselPrevious className="left-2" />
      <CarouselNext className="right-2" />
    </Carousel>
  );
}
