import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { WaitlistModal } from "./WaitlistModal";
import { EnhancedSearchInput } from "./EnhancedSearchInput";
import heroComics from "@/assets/hero-comics-compressed.webp";

export function HeroSection() {
  const [showWaitlistModal, setShowWaitlistModal] = useState(false);
  const navigate = useNavigate();

  return (
    <>
      <section className="relative py-0 sm:py-6 md:py-8 px-0 sm:px-4 overflow-hidden bg-gradient-to-b from-[hsl(30,15%,97%)] to-[hsl(30,10%,94%)]">
        <div className="container mx-auto max-w-7xl relative z-10">
          <div className="flex flex-col lg:flex-row gap-6 md:gap-10 items-center">
            {/* Left side - Text content */}
            <div className="w-full lg:w-1/2 space-y-1.5 sm:space-y-4 md:space-y-5 lg:space-y-4 flex flex-col px-0 sm:px-0 lg:pt-0">
              {/* Headline - order 1 on mobile */}
              <div className="order-1 px-4 pt-1.5 sm:pt-0 sm:px-0">
                <h1 className="text-[24px] leading-[1.2] sm:text-4xl md:text-5xl lg:text-6xl font-black sm:leading-[1.15] mb-1.5 sm:mb-3 md:mb-4 text-center sm:text-left">
                  Find the Comics{" "}
                  <span className="text-primary drop-shadow-lg block sm:inline mt-0.5 sm:mt-0">Collectors Are Chasing</span>
                </h1>
                
                <p className="text-xs sm:text-lg md:text-xl text-foreground/80 leading-snug sm:leading-relaxed text-center sm:text-left px-2 sm:px-0">
                  Search, scan, and track comics using real collector activity — not seller hype.
                </p>
              </div>

              {/* Hero image - order 2 on mobile, prominent and large */}
              <div className="order-2 lg:hidden w-screen -ml-0 sm:ml-0 sm:w-full">
                <div className="relative rounded-none sm:rounded-2xl overflow-hidden shadow-2xl">
                  <img
                    src={heroComics}
                    alt="Vintage comic book collection featuring Marvel and DC classics"
                    className="w-full h-[180px] sm:h-96 object-cover object-[30%_center] sm:object-center"
                    width={667}
                    height={384}
                    loading="eager"
                    fetchPriority="high"
                    decoding="async"
                  />
                  {/* Visual indicator overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-background/60 via-transparent to-transparent pointer-events-none" />
                </div>
              </div>

              {/* Primary CTA - order 3 on mobile */}
              <div className="order-3 flex flex-col gap-2 sm:gap-3 px-4 sm:px-0 mt-1 sm:mt-0">
                <Button 
                  size="lg" 
                  onClick={() => navigate('/scanner')}
                  className="w-full text-base sm:text-lg px-6 py-6 sm:py-6 shadow-[0_4px_14px_rgba(230,0,0,0.25)] hover:shadow-[0_6px_20px_rgba(230,0,0,0.35)] transition-all hover:scale-[1.02] active:scale-[0.98] bg-[#E60000] hover:bg-[#FF1A1A] font-bold min-h-[52px] sm:min-h-[56px]"
                >
                  Scan or Search a Comic
                </Button>
                <Button 
                  size="lg" 
                  variant="ghost"
                  onClick={() => navigate('/signals')}
                  className="w-full text-sm sm:text-base px-6 py-3 sm:py-4 text-muted-foreground hover:text-foreground font-medium"
                >
                  Browse the Heat Index
                </Button>
              </div>

              {/* Search bar - order 4 on mobile */}
              <div className="order-4 lg:order-[3.5] w-full px-4 sm:px-0 lg:mt-2">
                <EnhancedSearchInput />
              </div>
            </div>

            {/* Right side - Static collage image (desktop only) */}
            <div className="w-full lg:w-1/2 hidden lg:block space-y-4">
              <div className="relative rounded-2xl overflow-hidden shadow-2xl">
                <img
                  src={heroComics}
                  alt="Vintage comic book collection featuring Marvel and DC classics"
                  className="w-full h-80 sm:h-96 lg:h-[500px] object-cover object-center"
                  width={667}
                  height={500}
                  loading="eager"
                  fetchPriority="high"
                  decoding="async"
                />
              </div>
            </div>
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
