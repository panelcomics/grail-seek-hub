import { Button } from "@/components/ui/button";
import { Sparkles, MapPin, Clock } from "lucide-react";
import heroImage from "@/assets/hero-marketplace.jpg";

const Hero = () => {
  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-primary/5 via-background to-secondary/5">
      <div className="container py-20 md:py-28">
        <div className="grid gap-12 lg:grid-cols-2 lg:gap-16 items-center">
          <div className="space-y-8">
            <div className="inline-flex items-center gap-2 rounded-full border bg-background/50 px-4 py-2 text-sm font-medium backdrop-blur">
              <Sparkles className="h-4 w-4 text-secondary" />
              <span>Your Grail Is Waiting</span>
            </div>
            
            <div className="space-y-4">
              <h1 className="text-4xl font-bold tracking-tighter sm:text-5xl md:text-6xl lg:text-7xl">
                Find Your
                <span className="bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent"> Holy Grail </span>
                Collectibles
              </h1>
              <p className="text-lg text-muted-foreground sm:text-xl max-w-2xl">
                The ultimate marketplace for comic books and sports cards. Buy local, ship nationwide, or score instant deals in timed auctions.
              </p>
            </div>

            <div className="flex flex-wrap gap-4">
              <Button size="lg" className="gap-2 shadow-lg hover:shadow-xl transition-shadow">
                <Sparkles className="h-5 w-5" />
                Start Hunting
              </Button>
              <Button size="lg" variant="outline" className="gap-2">
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
                <div className="text-3xl font-bold text-secondary">24/7</div>
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
