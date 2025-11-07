import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Clock } from "lucide-react";
import { Link } from "react-router-dom";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";

// Seed data for trending auctions (placeholder)
const trendingItems = [
  {
    id: "demo-1",
    title: "Amazing Spider-Man",
    issue: "#300",
    grade: "CGC 9.8",
    price: "$1,250",
    image: "/placeholder.svg",
  },
  {
    id: "demo-2",
    title: "X-Men",
    issue: "#101",
    grade: "CGC 9.6",
    price: "$850",
    image: "/placeholder.svg",
  },
  {
    id: "demo-3",
    title: "Batman",
    issue: "#423",
    grade: "CGC 9.4",
    price: "$420",
    image: "/placeholder.svg",
  },
  {
    id: "demo-4",
    title: "Incredible Hulk",
    issue: "#181",
    grade: "CGC 9.0",
    price: "$3,200",
    image: "/placeholder.svg",
  },
  {
    id: "demo-5",
    title: "Iron Man",
    issue: "#55",
    grade: "CGC 9.2",
    price: "$680",
    image: "/placeholder.svg",
  },
  {
    id: "demo-6",
    title: "Fantastic Four",
    issue: "#52",
    grade: "CGC 8.5",
    price: "$2,100",
    image: "/placeholder.svg",
  },
];

export default function TrendingAuctions() {
  return (
    <section className="py-12 bg-muted/30">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-foreground mb-2">Hot Grails</h2>
            <p className="text-muted-foreground">Trending auctions ending soon</p>
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
            <AuctionCard key={item.id} item={item} />
          ))}
        </div>

        {/* Mobile: Carousel */}
        <div className="md:hidden">
          <Carousel className="w-full">
            <CarouselContent>
              {trendingItems.map((item) => (
                <CarouselItem key={item.id} className="basis-[85%]">
                  <AuctionCard item={item} />
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

function AuctionCard({ item }: { item: typeof trendingItems[0] }) {
  return (
    <Card className="overflow-hidden border-border/50 hover:shadow-lg transition-all duration-300 group">
      <div className="relative aspect-[3/4] bg-muted overflow-hidden">
        <img
          src={item.image}
          alt={`${item.title} ${item.issue}`}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
        />
        <div className="absolute top-2 right-2 bg-destructive text-destructive-foreground px-2 py-1 rounded-md text-xs font-semibold flex items-center gap-1">
          <Clock className="h-3 w-3" />
          2h 15m
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
            <Link to="/marketplace">Bid Now</Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
