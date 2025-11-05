import { Button } from "@/components/ui/button";
import { MapPin, Clock, Zap } from "lucide-react";
import heroImage from "@/assets/hero-marketplace.jpg";

const Hero = () => {
  const scrollToLocal = () => {
    const localSection = document.getElementById("local-discovery");
    localSection?.scrollIntoView({ behavior: "smooth" });
  };

  const scrollToListings = () => {
    const listingsSection = document.getElementById("trending-listings");
    listingsSection?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-primary/5 via-background to-secondary/5">
      <div className="container py-20 md:py-28">
        <div className="grid gap-12 lg:grid-cols-2 lg:gap-16 items-center">
          <div className="space-y-8">
            <div className="space-y-4">
              <h1 className="text-4xl font-bold tracking-tighter sm:text-5xl md:text-6xl lg:text-7xl text-center lg:text-left flex items-center justify-center lg:justify-start gap-3">
                <Zap className="h-8 w-8 sm:h-10 sm:w-10 md:h-12 md:w-12 text-yellow-500 fill-yellow-500/20" />
                Your Grail Is Waiting
              </h1>
              <p className="text-lg text-muted-foreground sm:text-xl max-w-2xl">
                The ultimate marketplace for comics, collectibles, and cards. Buy, sell, or trade — local or nationwide.
              </p>
            </div>

            <div className="flex flex-wrap gap-4 justify-center lg:justify-start">
              <Button 
                size="lg" 
                variant="premium"
                onClick={scrollToListings}
              >
                Start Hunting
              </Button>
              <Button 
                size="lg" 
                variant="premium-outline"
                onClick={scrollToLocal}
              >
                <MapPin className="h-5 w-5" />
                Browse Local
              </Button>
            </div>

            <div className="grid grid-cols-3 gap-6 pt-8 border-t">
              <div>
                <div className="text-3xl font-bold text-primary">50K+</div>
                <div className="text-sm text-muted-foreground">Active Listings</div>
              </div>
              <div>
                <div className="text-3xl font-bold text-primary">24/7</div>
                <div className="text-sm text-muted-foreground">Live Auctions</div>
              </div>
              <div>
                <div className="text-3xl font-bold text-accent">500mi</div>
                <div className="text-sm text-muted-foreground">Max Radius</div>
              </div>
            </div>
          </div>

          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-tr from-primary/20 via-transparent to-secondary/20 rounded-3xl blur-3xl" />
            <div className="relative rounded-3xl overflow-hidden border shadow-2xl">
              <img
                src={heroImage}
                alt="Comic books and sports cards collection"
                className="w-full h-auto object-cover"
              />
              <div className="absolute bottom-4 left-4 right-4 bg-background/90 backdrop-blur rounded-xl p-4 border">
                <div className="flex items-center gap-3">
                  <Clock className="h-5 w-5 text-accent animate-pulse" />
                  <div className="flex-1">
                    <div className="text-sm font-semibold">Live Auction Ending Soon</div>
                    <div className="text-xs text-muted-foreground">$2 Bin - 45 items left</div>
                  </div>
                  <Button size="sm" className="bg-accent hover:bg-accent/90">
                    Claim Now
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;
