import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Clock, Flame } from "lucide-react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";

// Seed data for trending auctions with key issue comics
const trendingItemsBase = [
  {
    id: "demo-1",
    title: "Amazing Spider-Man",
    issue: "#300",
    series: "Amazing Spider-Man",
    issueNumber: "300",
    label: "First Venom",
    grade: "CGC 9.8",
    price: "$1,250",
  },
  {
    id: "demo-2",
    title: "Incredible Hulk",
    issue: "#181",
    series: "Incredible Hulk",
    issueNumber: "181",
    label: "First Wolverine",
    grade: "CGC 9.0",
    price: "$3,200",
  },
  {
    id: "demo-3",
    title: "Giant-Size X-Men",
    issue: "#1",
    series: "Giant-Size X-Men",
    issueNumber: "1",
    label: "New X-Men",
    grade: "CGC 9.4",
    price: "$2,850",
  },
  {
    id: "demo-4",
    title: "Batman Adventures",
    issue: "#12",
    series: "Batman Adventures",
    issueNumber: "12",
    label: "First Harley Quinn",
    grade: "CGC 9.6",
    price: "$1,800",
  },
  {
    id: "demo-5",
    title: "Ultimate Fallout",
    issue: "#4",
    series: "Ultimate Fallout",
    issueNumber: "4",
    label: "First Miles Morales",
    grade: "CGC 9.8",
    price: "$680",
  },
  {
    id: "demo-6",
    title: "Teenage Mutant Ninja Turtles",
    issue: "#1",
    series: "Teenage Mutant Ninja Turtles",
    issueNumber: "1",
    label: "First Appearance",
    grade: "CGC 8.5",
    price: "$5,100",
  },
];

export default function TrendingAuctions() {
  const [trendingItems, setTrendingItems] = useState(
    trendingItemsBase.map(item => ({ ...item, image: "/placeholder.svg" }))
  );
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchComicCovers();
  }, []);

  const fetchComicCovers = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('fetch-comic-covers', {
        body: {
          comics: trendingItemsBase.map(item => ({
            series: item.series,
            issue: item.issueNumber,
          })),
        },
      });

      if (error) {
        console.error('Error fetching comic covers:', error);
        setLoading(false);
        return;
      }

      if (data?.results) {
        const itemsWithCovers = trendingItemsBase.map((item, index) => ({
          ...item,
          image: data.results[index]?.coverUrl || "/placeholder.svg",
        }));
        setTrendingItems(itemsWithCovers);
      }
    } catch (error) {
      console.error('Failed to fetch comic covers:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="py-12 bg-muted/30">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-foreground mb-2 flex items-center gap-2">
              <Flame className="h-6 w-6 text-destructive" />
              Hot Grails
            </h2>
            <p className="text-muted-foreground">Key issues trending now</p>
          </div>
          <Link to="/marketplace">
            <Button variant="link" className="gap-1 text-primary hover:text-primary/80">
              View All →
            </Button>
          </Link>
        </div>

        {/* Desktop: Grid */}
        <div className="hidden md:grid md:grid-cols-4 gap-6">
          {trendingItems.slice(0, 4).map((item) => (
            <AuctionCard key={item.id} item={item} loading={loading} />
          ))}
        </div>

        {/* Mobile: Carousel */}
        <div className="md:hidden">
          <Carousel className="w-full">
            <CarouselContent>
              {trendingItems.map((item) => (
                <CarouselItem key={item.id} className="basis-[85%]">
                  <AuctionCard item={item} loading={loading} />
                </CarouselItem>
              ))}
            </CarouselContent>
            <CarouselPrevious />
            <CarouselNext />
          </Carousel>
        </div>
      </div>
    </section>
  );
}

function AuctionCard({ item, loading }: { item: typeof trendingItemsBase[0] & { image: string }; loading: boolean }) {
  const [imgError, setImgError] = useState(false);

  return (
    <Card className="overflow-hidden border-border/50 hover:shadow-lg transition-all duration-300 group">
      <div className="relative aspect-[3/4] bg-muted overflow-hidden">
        {loading ? (
          <div className="w-full h-full flex items-center justify-center bg-muted animate-pulse">
            <span className="text-muted-foreground text-sm">Loading...</span>
          </div>
        ) : (
          <img
            src={imgError ? "/placeholder.svg" : item.image}
            alt={`${item.title} ${item.issue}`}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            onError={() => setImgError(true)}
          />
        )}
        <div className="absolute top-2 left-2 bg-destructive/90 backdrop-blur text-destructive-foreground px-2 py-1 rounded-md text-xs font-semibold">
          {item.label}
        </div>
        <div className="absolute top-2 right-2 bg-background/90 backdrop-blur px-2 py-1 rounded-md text-xs font-semibold flex items-center gap-1">
          <Clock className="h-3 w-3 text-destructive" />
          <span className="text-foreground">2h 15m</span>
        </div>
      </div>
      <CardContent className="p-4 space-y-3">
        <div>
          <h3 className="font-bold text-foreground line-clamp-1">{item.title}</h3>
          <p className="text-sm text-muted-foreground">{item.issue} • {item.grade}</p>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-lg font-bold text-primary">{item.price}</span>
          <Button size="sm" variant="default" asChild>
            <Link to="/marketplace">View</Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
