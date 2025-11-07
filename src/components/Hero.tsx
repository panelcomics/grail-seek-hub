import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MapPin, Clock, Palette, ArrowRight, Search, ScanLine } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useState } from "react";
import heroImage from "@/assets/hero-marketplace.jpg";

const Hero = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");

  const scrollToLocal = () => {
    const localSection = document.getElementById("local-discovery");
    localSection?.scrollIntoView({ behavior: "smooth" });
  };

  const scrollToListings = () => {
    const listingsSection = document.getElementById("trending-listings");
    listingsSection?.scrollIntoView({ behavior: "smooth" });
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-primary/5 via-background to-secondary/5">
      <div className="container py-20 md:py-28">
        {/* Artist Application Banner */}
        <div className="mb-8 mx-auto max-w-4xl">
          <div className="bg-gradient-to-r from-purple-500/10 via-blue-500/10 to-purple-500/10 border border-purple-500/20 rounded-xl p-4 backdrop-blur-sm">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3 text-center sm:text-left">
                <div className="flex-shrink-0 w-10 h-10 rounded-full bg-purple-500/20 flex items-center justify-center">
                  <Palette className="h-5 w-5 text-purple-400" />
                </div>
                <div>
                  <p className="text-sm font-semibold">Now Accepting Verified Artist Applications — Showcase and sell your original art!</p>
                </div>
              </div>
              <Link to="/settings/artist-verification">
                <Button size="sm" variant="outline" className="border-purple-500/30 hover:bg-purple-500/10 gap-2 flex-shrink-0">
                  Apply Now
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </div>
          </div>
        </div>

        <div className="grid gap-12 lg:grid-cols-2 lg:gap-16 items-center">
          <div className="space-y-8">
            <div className="space-y-4">
              <h1 className="text-center lg:text-left">
                Hunt Your Grail
              </h1>
              <p className="text-lg text-muted-foreground sm:text-xl max-w-2xl">
                Buy, sell, and trade comics, collectibles, and cards from trusted collectors.
              </p>
            </div>

            {/* Search Bar */}
            <form onSubmit={handleSearch} className="max-w-2xl">
              <div className="relative flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                  <Input
                    type="text"
                    placeholder="Search by title, series, issue number, or keyword..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 h-12 text-base"
                  />
                </div>
                <Button type="submit" size="lg" className="h-12 px-6">
                  Search
                </Button>
              </div>
            </form>

            <div className="flex flex-wrap gap-4 justify-center lg:justify-start">
              <Button 
                size="lg" 
                className="bg-primary text-primary-foreground hover:bg-primary/90 transition-all hover:shadow-lg hover:-translate-y-0.5"
                onClick={scrollToListings}
              >
                Start Hunting
              </Button>
              <Button 
                size="lg" 
                variant="outline"
                className="border-primary text-primary hover:bg-primary/5 transition-all hover:shadow-md hover:-translate-y-0.5"
                onClick={scrollToLocal}
              >
                <MapPin className="h-5 w-5" />
                Browse Local
              </Button>
              <Link to="/scanner">
                <Button 
                  size="lg" 
                  variant="outline"
                  className="border-accent text-accent hover:bg-accent/5 transition-all hover:shadow-md hover:-translate-y-0.5"
                >
                  <ScanLine className="h-5 w-5 mr-2" />
                  Scan Your Comic
                </Button>
              </Link>
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
                  <Button size="sm" className="bg-primary text-primary-foreground hover:bg-primary/90">
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
