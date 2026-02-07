/**
 * Homepage Confidence Sections (Visual Parity Upgrade)
 * 
 * Visually strong but logic-simple sections:
 * - "New Arrivals" → most recent listings
 * - "Featured Comics" → curated/first N listings (featured-grails filter)
 * 
 * Uses existing ListingsCarousel with different titles.
 * Only rendered when ENABLE_VISUAL_PARITY_UPGRADE is true.
 */

import { ListingsCarousel } from "@/components/home/ListingsCarousel";
import { LazyCarousel } from "@/components/LazyCarousel";

export function HomepageConfidenceSections() {
  return (
    <>
      {/* New Arrivals — freshest listings */}
      <section className="bg-secondary/5 py-2">
        <LazyCarousel>
          <ListingsCarousel
            title="🆕 New Arrivals"
            filterType="newly-listed"
            useCache
            cacheKey="newly-listed"
          />
        </LazyCarousel>
      </section>

      {/* Featured Comics — curated picks */}
      <section className="py-2">
        <LazyCarousel>
          <ListingsCarousel
            title="⭐ Featured Comics"
            filterType="featured-grails"
            useCache
            cacheKey="featured-grails"
          />
        </LazyCarousel>
      </section>
    </>
  );
}
