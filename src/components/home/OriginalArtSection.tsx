/**
 * Original Art — Homepage Curated Gallery Section
 *
 * Fetches public, for-sale original artwork from the database.
 * Gallery-first design: larger images, artist-led cards, no comic metadata.
 * Placed below all comic/auction sections on the homepage.
 */

import { useEffect, useState, useRef } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Paintbrush } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { CarouselScrollButtons } from "@/components/home/CarouselScrollButtons";

interface OriginalArtItem {
  id: string;
  title: string;
  artist_name: string;
  price: number | null;
  image_url: string;
  medium: string | null;
  dimensions: string | null;
}

export function OriginalArtSection() {
  const [items, setItems] = useState<OriginalArtItem[]>([]);
  const [loading, setLoading] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchArt = async () => {
      try {
        const { data, error } = await supabase
          .from("original_art")
          .select("id, title, artist_name, price, image_url, medium, dimensions")
          .eq("visibility", "public")
          .eq("for_sale", true)
          .order("created_at", { ascending: false })
          .limit(8);

        if (error) throw error;
        setItems(data || []);
      } catch {
        // Silently fail — section just won't render
        setItems([]);
      } finally {
        setLoading(false);
      }
    };

    fetchArt();
  }, []);

  // Don't render the section at all while loading skeleton or if empty (clean empty state instead)
  if (!loading && items.length === 0) {
    return (
      <section className="py-6 md:py-10">
        <div className="container mx-auto px-4">
          <h2 className="text-xl sm:text-2xl md:text-3xl font-bold mb-1">
            Original Art
          </h2>
          <p className="text-sm text-muted-foreground mb-6">
            Original art coming soon. We'll be featuring select artwork here.
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className="py-6 md:py-10">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="flex justify-between items-end mb-5 md:mb-7">
          <div>
            <h2 className="text-xl sm:text-2xl md:text-3xl font-bold mb-1">
              Original Art
            </h2>
            <p className="text-sm text-muted-foreground">
              Curated original artwork from creators and collectors.
            </p>
          </div>
          <Link
            to="/search?category=original_art"
            className="hidden sm:flex items-center gap-1 text-sm font-medium text-primary hover:underline whitespace-nowrap"
          >
            View all original art
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>

      {/* Cards — horizontal scroll on mobile, grid hint on desktop */}
      {loading ? (
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <ArtCardSkeleton key={i} />
            ))}
          </div>
        </div>
      ) : (
        <div className="relative">
          <CarouselScrollButtons scrollRef={scrollRef} />

          {/* Desktop grid / Mobile horizontal scroll */}
          <div
            ref={scrollRef}
            className="
              flex gap-4 px-4 overflow-x-auto snap-x snap-mandatory scrollbar-hide pb-4
              lg:container lg:mx-auto lg:grid lg:grid-cols-4 lg:overflow-x-visible lg:snap-none lg:pb-0
            "
          >
            {items.map((item, idx) => (
              <OriginalArtCard key={item.id} item={item} priority={idx < 4} />
            ))}
          </div>

          {/* Mobile "view all" link */}
          <div className="container mx-auto px-4 mt-3 sm:hidden">
            <Link
              to="/search?category=original_art"
              className="flex items-center gap-1 text-sm font-medium text-primary hover:underline"
            >
              View all original art
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      )}
    </section>
  );
}

/* ── Art Card ─────────────────────────────────────────────────── */

function OriginalArtCard({
  item,
  priority = false,
}: {
  item: OriginalArtItem;
  priority?: boolean;
}) {
  return (
    <Link
      to={`/original-art/${item.id}`}
      className="w-[260px] sm:w-[280px] flex-shrink-0 snap-center lg:w-auto"
    >
      <Card className="group overflow-hidden transition-all duration-300 hover:shadow-xl hover:-translate-y-1 cursor-pointer bg-card border rounded-lg h-full flex flex-col">
        {/* Image — taller aspect for artwork */}
        <div className="relative overflow-hidden bg-muted aspect-[3/4] flex items-center justify-center">
          <img
            src={item.image_url}
            alt={`${item.title} by ${item.artist_name}`}
            className="w-full h-full object-contain p-2 transition-transform duration-500 group-hover:scale-105"
            loading={priority ? "eager" : "lazy"}
            decoding="async"
          />

          {/* Badge overlay */}
          <div className="absolute top-2 left-2">
            <Badge className="bg-purple-600 hover:bg-purple-700 text-white text-[10px] px-1.5 py-0.5 border-0">
              <Paintbrush className="h-3 w-3 mr-1" />
              Original Art
            </Badge>
          </div>
        </div>

        {/* Info — artist-led, calm typography */}
        <div className="p-3 sm:p-4 flex-1 flex flex-col gap-1">
          {/* Artist name — primary emphasis */}
          <p className="text-sm font-bold text-foreground truncate">
            {item.artist_name}
          </p>

          {/* Artwork title */}
          <p className="text-xs text-muted-foreground line-clamp-2 leading-snug">
            {item.title}
          </p>

          {/* Medium / Dimensions */}
          {(item.medium || item.dimensions) && (
            <p className="text-[11px] text-muted-foreground/70 truncate mt-0.5">
              {[item.medium, item.dimensions].filter(Boolean).join(" · ")}
            </p>
          )}

          {/* Price — anchored at bottom */}
          <div className="mt-auto pt-2">
            {item.price !== null && item.price > 0 ? (
              <span className="text-base sm:text-lg font-bold text-primary">
                ${item.price.toLocaleString()}
              </span>
            ) : (
              <span className="text-xs text-muted-foreground">Available</span>
            )}
          </div>
        </div>
      </Card>
    </Link>
  );
}

/* ── Skeleton ─────────────────────────────────────────────────── */

function ArtCardSkeleton() {
  return (
    <div className="rounded-lg border bg-card overflow-hidden">
      <Skeleton className="w-full aspect-[3/4]" />
      <div className="p-3 sm:p-4 space-y-2">
        <Skeleton className="h-4 w-2/3" />
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-5 w-1/3 mt-2" />
      </div>
    </div>
  );
}
