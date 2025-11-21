import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Shield, TrendingUp, Package, Clock, BadgeCheck } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { WaitlistModal } from "./WaitlistModal";
import { EnhancedSearchInput } from "./EnhancedSearchInput";
import heroComics from "@/assets/hero-comics.png";

export function HeroSection() {
  const [showWaitlistModal, setShowWaitlistModal] = useState(false);
  const navigate = useNavigate();

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
      <section className="relative py-0 sm:py-6 md:py-8 px-0 sm:px-4 overflow-hidden bg-gradient-to-b from-[hsl(30,15%,97%)] to-[hsl(30,10%,94%)]">
        <div className="container mx-auto max-w-7xl relative z-10">
          <div className="flex flex-col lg:flex-row gap-6 md:gap-10 items-center">
            {/* Left side - Text content */}
            <div className="w-full lg:w-1/2 space-y-3 sm:space-y-4 md:space-y-5 flex flex-col px-0 sm:px-0">
              {/* Headline - order 1 on mobile */}
              <div className="order-1 px-4 pt-4 sm:pt-0 sm:px-0">
                <h1 className="text-[28px] leading-tight sm:text-4xl md:text-5xl lg:text-6xl font-black sm:leading-[1.15] mb-3 sm:mb-3 md:mb-4 text-center sm:text-left">
                  Trusted Marketplace for{" "}
                  <span className="text-primary drop-shadow-lg block sm:inline mt-1 sm:mt-0">Comic Grails & Keys</span>
                </h1>
                
                <p className="text-sm sm:text-lg md:text-xl text-foreground/80 leading-relaxed text-center sm:text-left px-2 sm:px-0">
                  Buy, sell, and trade slabs, keys, and grails from verified collectors.
                </p>

                <div className="flex flex-wrap gap-2 sm:gap-3 md:gap-4 py-3 sm:py-3 text-muted-foreground justify-center sm:justify-start">
                  <div className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm">
                    <Shield className="h-3 w-3 sm:h-4 sm:w-4 text-primary flex-shrink-0" />
                    <span className="whitespace-nowrap">Built for collectors</span>
                  </div>
                  <div className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm">
                    <TrendingUp className="h-3 w-3 sm:h-4 sm:w-4 text-primary flex-shrink-0" />
                    <span className="whitespace-nowrap">Lifetime 2% fee</span>
                  </div>
                </div>
              </div>

              {/* Hero image - order 2 on mobile, prominent and large */}
              <div className="order-2 lg:hidden w-screen -ml-0 sm:ml-0 sm:w-full">
                <div className="relative rounded-none sm:rounded-2xl overflow-hidden shadow-2xl">
                  <img
                    src={heroComics}
                    alt="Vintage comic book collection featuring Marvel and DC classics"
                    className="w-full h-[360px] sm:h-96 object-cover object-[30%_center] sm:object-center"
                  />
                  {/* Visual indicator overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-background/60 via-transparent to-transparent pointer-events-none" />
                </div>
              </div>

              {/* Buttons - order 3 on mobile (moved up for better flow) */}
              <div className="order-3 flex flex-col gap-2.5 sm:gap-3 px-4 sm:px-0 mt-2 sm:mt-0">
                <Button 
                  size="lg" 
                  onClick={scrollToListings}
                  className="w-full text-base sm:text-lg px-6 py-6 sm:py-6 shadow-[0_4px_14px_rgba(230,0,0,0.25)] hover:shadow-[0_6px_20px_rgba(230,0,0,0.35)] transition-all hover:scale-[1.02] active:scale-[0.98] bg-[#E60000] hover:bg-[#FF1A1A] font-bold min-h-[52px] sm:min-h-[56px]"
                >
                  Start Hunting Grails
                </Button>
                <Button 
                  size="lg" 
                  variant="outline"
                  onClick={() => navigate('/marketplace?filter=local')}
                  className="w-full text-base sm:text-lg px-6 py-6 sm:py-6 border-2 border-primary/60 text-primary hover:bg-primary hover:text-primary-foreground shadow-md hover:shadow-lg transition-all hover:scale-[1.02] active:scale-[0.98] font-semibold min-h-[52px] sm:min-h-[56px]"
                >
                  Browse Local Deals
                </Button>
              </div>

              {/* Stats - order 4 on mobile */}
              <div className="order-4 grid grid-cols-3 gap-4 sm:gap-4 md:gap-6 px-4 sm:px-0 pt-5 pb-4 sm:pt-6 sm:pb-0 border-t border-border/40">
                <div className="flex flex-col items-center sm:items-start text-center sm:text-left">
                  <div className="flex items-center gap-1.5 sm:gap-2 mb-1.5">
                    <Package className="h-4 w-4 sm:h-5 sm:w-5 text-primary flex-shrink-0" />
                  </div>
                  <div className="text-2xl sm:text-2xl md:text-3xl font-black text-primary leading-none">500+</div>
                  <div className="text-[11px] sm:text-xs md:text-sm text-muted-foreground font-medium mt-1">Live Slabs</div>
                </div>
                <div className="flex flex-col items-center sm:items-start text-center sm:text-left">
                  <div className="flex items-center gap-1.5 sm:gap-2 mb-1.5">
                    <Clock className="h-4 w-4 sm:h-5 sm:w-5 text-primary flex-shrink-0" />
                  </div>
                  <div className="text-2xl sm:text-2xl md:text-3xl font-black text-primary leading-none">New</div>
                  <div className="text-[11px] sm:text-xs md:text-sm text-muted-foreground font-medium mt-1 leading-tight">Listings<br className="sm:hidden" /> Every Hour</div>
                </div>
                <div className="flex flex-col items-center sm:items-start text-center sm:text-left">
                  <div className="flex items-center gap-1.5 sm:gap-2 mb-1.5">
                    <BadgeCheck className="h-4 w-4 sm:h-5 sm:w-5 text-primary flex-shrink-0" />
                  </div>
                  <div className="text-2xl sm:text-2xl md:text-3xl font-black text-primary leading-none">Verified</div>
                  <div className="text-[11px] sm:text-xs md:text-sm text-muted-foreground font-medium mt-1 leading-tight">Sellers &<br className="sm:hidden" /> Dealers</div>
                </div>
              </div>
            </div>

            {/* Right side - Static collage image (desktop only) */}
            <div className="w-full lg:w-1/2 hidden lg:block">
              <div className="relative rounded-2xl overflow-hidden shadow-2xl">
                <img
                  src={heroComics}
                  alt="Vintage comic book collection featuring Marvel and DC classics"
                  className="w-full h-80 sm:h-96 lg:h-[500px] object-cover object-center"
                />
              </div>
            </div>
          </div>

          {/* Search bar - order 5 on mobile (moved after stats) */}
          <div className="order-5 w-full lg:w-auto lg:mt-8 md:mt-12 px-4 sm:px-0 mb-4 sm:mb-8 relative z-20">
            <EnhancedSearchInput />
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
