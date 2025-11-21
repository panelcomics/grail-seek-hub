import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Shield, TrendingUp } from "lucide-react";
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
      <section className="relative py-2 sm:py-6 md:py-8 px-0 sm:px-4 overflow-hidden bg-gradient-to-b from-[hsl(30,15%,97%)] to-[hsl(30,10%,94%)]">
        <div className="container mx-auto max-w-7xl relative z-10">
          <div className="flex flex-col lg:flex-row gap-6 md:gap-10 items-center">
            {/* Left side - Text content */}
            <div className="w-full lg:w-1/2 space-y-2 sm:space-y-4 md:space-y-5 flex flex-col px-4 sm:px-0">
              {/* Headline and subheadline - order 1 on mobile */}
              <div className="order-1">
                <h1 className="text-2xl sm:text-4xl md:text-5xl lg:text-6xl font-black leading-[1.2] sm:leading-[1.15] mb-2 sm:mb-3 md:mb-4">
                  The Trusted Marketplace for{" "}
                  <span className="text-primary drop-shadow-lg">Comic Grails & Keys</span>
                </h1>
                
                <p className="text-sm sm:text-lg md:text-xl text-foreground/80 leading-relaxed">
                  The easiest way to buy, sell, and trade slabs, keys, and grails from verified collectors.
                </p>

                <div className="flex flex-wrap gap-2 sm:gap-3 md:gap-4 py-2 sm:py-3 text-muted-foreground">
                  <div className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm">
                    <Shield className="h-3 w-3 sm:h-4 sm:w-4 text-primary flex-shrink-0" />
                    <span>Built for collectors in public beta</span>
                  </div>
                  <div className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm">
                    <TrendingUp className="h-3 w-3 sm:h-4 sm:w-4 text-primary flex-shrink-0" />
                    <span>First 100 sellers: Lifetime 2% fee</span>
                  </div>
                </div>
              </div>

              {/* Hero image - order 2 on mobile (shown here), order 3 on desktop (shown on right) */}
              <div className="order-2 lg:hidden w-screen -ml-4 sm:ml-0 sm:w-full -mt-2 sm:mt-0">
                <div className="relative rounded-none sm:rounded-2xl overflow-hidden shadow-2xl">
                  <img
                    src={heroComics}
                    alt="Vintage comic book collection featuring Marvel and DC classics"
                    className="w-full h-[240px] sm:h-96 object-cover object-center"
                  />
                </div>
              </div>

              {/* Buttons - order 4 on mobile */}
              <div className="order-4 flex flex-col gap-2.5 sm:gap-3 px-4 sm:px-0">
                <Button 
                  size="lg" 
                  onClick={scrollToListings}
                  className="w-full text-sm sm:text-lg px-6 py-5 sm:py-6 shadow-[0_4px_14px_rgba(230,0,0,0.25)] hover:shadow-[0_6px_20px_rgba(230,0,0,0.35)] transition-all hover:scale-[1.02] active:scale-[0.98] bg-[#E60000] hover:bg-[#FF1A1A] font-bold min-h-[48px] sm:min-h-[56px]"
                >
                  Start Hunting Grails
                </Button>
                <Button 
                  size="lg" 
                  variant="outline"
                  onClick={() => navigate('/marketplace?filter=local')}
                  className="w-full text-sm sm:text-lg px-6 py-5 sm:py-6 border-2 border-primary/60 text-primary hover:bg-primary hover:text-primary-foreground shadow-md hover:shadow-lg transition-all hover:scale-[1.02] active:scale-[0.98] font-semibold min-h-[48px] sm:min-h-[56px]"
                >
                  Browse Local Deals
                </Button>
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

          {/* Search bar - order 3 on mobile */}
          <div className="order-3 w-full lg:w-auto lg:mt-8 md:mt-12 px-4 sm:px-0">
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
