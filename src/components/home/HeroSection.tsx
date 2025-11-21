import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Search, Smartphone, Shield, TrendingUp } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { WaitlistModal } from "./WaitlistModal";
import heroComics from "@/assets/hero-comics.png";

export function HeroSection() {
  const [searchQuery, setSearchQuery] = useState("");
  const [showWaitlistModal, setShowWaitlistModal] = useState(false);
  const navigate = useNavigate();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery)}`);
    }
  };

  const scrollToListings = () => {
    const listingsSection = document.querySelector('[data-listings-section]');
    if (listingsSection) {
      listingsSection.scrollIntoView({ behavior: 'smooth' });
    } else {
      navigate('/marketplace');
    }
  };

  return (
    <>
      <section className="relative py-4 sm:py-6 md:py-8 px-4 overflow-hidden bg-gradient-to-b from-[hsl(30,15%,97%)] to-[hsl(30,10%,94%)]">
        <div className="container mx-auto max-w-7xl relative z-10">
          <div className="flex flex-col lg:flex-row gap-6 md:gap-10 items-center">
            {/* Left side - Text content */}
            <div className="w-full lg:w-1/2 space-y-4 md:space-y-5">
              <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-black leading-[1.2] sm:leading-[1.15]">
                The Trusted Marketplace for{" "}
                <span className="text-primary drop-shadow-lg">Comic Grails & Keys</span>
              </h1>
              
              <p className="text-base sm:text-lg md:text-xl text-foreground/80 leading-relaxed">
                The easiest way to buy, sell, and trade slabs, keys, and grails from verified collectors.
              </p>

              <div className="flex flex-wrap gap-3 md:gap-4 py-2 text-muted-foreground">
                <div className="flex items-center gap-2 text-xs sm:text-sm">
                  <Shield className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-primary flex-shrink-0" />
                  <span>Built for collectors in public beta</span>
                </div>
                <div className="flex items-center gap-2 text-xs sm:text-sm">
                  <TrendingUp className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-primary flex-shrink-0" />
                  <span>First 100 sellers: Lifetime 2% fee</span>
                </div>
              </div>

              <div className="flex flex-col gap-3">
                <Button 
                  size="lg" 
                  onClick={scrollToListings}
                  className="w-full text-base sm:text-lg px-6 py-6 sm:py-7 shadow-[0_4px_14px_rgba(230,0,0,0.25)] hover:shadow-[0_6px_20px_rgba(230,0,0,0.35)] transition-all hover:scale-[1.02] active:scale-[0.98] bg-[#E60000] hover:bg-[#FF1A1A] font-bold min-h-[56px]"
                >
                  Start Hunting Grails
                </Button>
                <Button 
                  size="lg" 
                  variant="outline"
                  onClick={() => navigate('/marketplace?filter=local')}
                  className="w-full text-base sm:text-lg px-6 py-6 sm:py-7 border-2 border-primary/60 text-primary hover:bg-primary hover:text-primary-foreground shadow-md hover:shadow-lg transition-all hover:scale-[1.02] active:scale-[0.98] font-semibold min-h-[56px]"
                >
                  Browse Local Deals
                </Button>
              </div>
            </div>

            {/* Right side - Static collage image */}
            <div className="w-full lg:w-1/2">
              <div className="relative rounded-2xl overflow-hidden shadow-2xl">
                <img
                  src={heroComics}
                  alt="Vintage comic book collection featuring Marvel and DC classics"
                  className="w-full h-80 sm:h-96 lg:h-[500px] object-cover object-center"
                />
              </div>
            </div>
          </div>

          <div className="mt-8 md:mt-12">
            <form onSubmit={handleSearch} className="max-w-2xl mx-auto">
              <div className="relative">
                <Search className="absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search comics, cards, or original art..."
                  className="w-full pl-10 sm:pl-12 pr-4 py-3 sm:py-4 rounded-xl border-2 border-border bg-card text-base sm:text-lg focus:border-primary focus:outline-none min-h-[48px]"
                />
              </div>
            </form>
          </div>
        </div>
      </section>

      <WaitlistModal 
        open={showWaitlistModal} 
        onClose={() => setShowWaitlistModal(false)} 
      />
    </>
  );
}
