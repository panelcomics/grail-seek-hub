import { useState } from "react";
import Navbar from "@/components/Navbar";
import Hero from "@/components/Hero";
import ItemCard from "@/components/ItemCard";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Filter, Package, MapPin, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import comicSample1 from "@/assets/comic-sample-1.jpg";
import comicSample2 from "@/assets/comic-sample-2.jpg";
import cardSample1 from "@/assets/card-sample-1.jpg";
import cardSample2 from "@/assets/card-sample-2.jpg";

const mockItems = [
  {
    id: "1",
    title: "Amazing Spider-Man #300 - First Venom",
    price: 450,
    condition: "NM+",
    image: comicSample1,
    isLocal: true,
    location: "Chicago, IL",
    category: "comic" as const,
  },
  {
    id: "2",
    title: "2003 LeBron James Rookie Card PSA 10",
    price: 2800,
    condition: "GEM MT",
    image: cardSample1,
    isLocal: false,
    category: "card" as const,
  },
  {
    id: "3",
    title: "X-Men #1 Jim Lee Variant",
    price: 125,
    condition: "VF/NM",
    image: comicSample2,
    isLocal: true,
    location: "Boston, MA",
    category: "comic" as const,
  },
  {
    id: "4",
    title: "1989 Ken Griffey Jr. Upper Deck Rookie",
    price: 340,
    condition: "PSA 9",
    image: cardSample2,
    isLocal: false,
    category: "card" as const,
  },
  {
    id: "5",
    title: "Batman: The Killing Joke First Print",
    price: 280,
    condition: "FN+",
    image: comicSample1,
    isLocal: true,
    location: "Seattle, WA",
    category: "comic" as const,
  },
  {
    id: "6",
    title: "2021 Patrick Mahomes Prizm Silver",
    price: 195,
    condition: "MINT",
    image: cardSample2,
    isLocal: false,
    category: "card" as const,
  },
];

const Index = () => {
  const [filter, setFilter] = useState<"all" | "comic" | "card">("all");

  const filteredItems = filter === "all" 
    ? mockItems 
    : mockItems.filter(item => item.category === filter);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <Hero />
      
      <section className="container py-16">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
          <div>
            <h2 className="text-3xl font-bold mb-2">Trending Grails</h2>
            <p className="text-muted-foreground">Discover the hottest collectibles available now</p>
          </div>
          
          <div className="flex items-center gap-3">
            <Tabs value={filter} onValueChange={(v) => setFilter(v as any)} className="w-auto">
              <TabsList>
                <TabsTrigger value="all">All</TabsTrigger>
                <TabsTrigger value="comic">Comics</TabsTrigger>
                <TabsTrigger value="card">Cards</TabsTrigger>
              </TabsList>
            </Tabs>
            <Button variant="outline" size="icon">
              <Filter className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredItems.map((item) => (
            <ItemCard key={item.id} {...item} />
          ))}
        </div>
      </section>

      <section className="border-t bg-muted/30 py-12">
        <div className="container">
          <div className="grid md:grid-cols-3 gap-8 text-center">
            <div className="space-y-2">
              <div className="inline-flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary mx-auto mb-3">
                <Package className="h-6 w-6" />
              </div>
              <h3 className="font-semibold text-lg">Safe Shipping</h3>
              <p className="text-sm text-muted-foreground">USPS integrated with insurance options</p>
            </div>
            <div className="space-y-2">
              <div className="inline-flex h-12 w-12 items-center justify-center rounded-lg bg-secondary/10 text-secondary mx-auto mb-3">
                <MapPin className="h-6 w-6" />
              </div>
              <h3 className="font-semibold text-lg">Local Meetups</h3>
              <p className="text-sm text-muted-foreground">Find sellers within 500 miles</p>
            </div>
            <div className="space-y-2">
              <div className="inline-flex h-12 w-12 items-center justify-center rounded-lg bg-accent/10 text-accent mx-auto mb-3">
                <Clock className="h-6 w-6" />
              </div>
              <h3 className="font-semibold text-lg">Live Auctions</h3>
              <p className="text-sm text-muted-foreground">Claim deals in real-time $2 bins</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Index;
