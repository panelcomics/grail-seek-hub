import { ReactNode } from 'react';
import { useIntersectionObserver } from '@/hooks/useIntersectionObserver';
import { ListingCardSkeleton } from '@/components/ui/listing-card-skeleton';

interface LazyCarouselProps {
  children: ReactNode;
  fallback?: ReactNode;
}

export function LazyCarousel({ children, fallback }: LazyCarouselProps) {
  const { ref, isVisible } = useIntersectionObserver({
    rootMargin: '200px',
    triggerOnce: true,
  });

  return (
    <div ref={ref}>
      {isVisible ? (
        children
      ) : (
        fallback || (
          <div className="container mx-auto px-4">
            <div className="overflow-x-auto pb-4">
              <div className="flex gap-4 min-w-min">
                {[...Array(5)].map((_, i) => (
                  <ListingCardSkeleton key={i} />
                ))}
              </div>
            </div>
          </div>
        )
      )}
    </div>
  );
}
