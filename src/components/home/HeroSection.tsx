import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Search, Smartphone, Shield, TrendingUp } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { WaitlistModal } from "./WaitlistModal";
import { supabase } from "@/integrations/supabase/client";
import { getListingImageUrl } from "@/lib/sellerUtils";

const SAMPLE_COVERS = [
  "/covers/sample-asm.jpg",
  "/covers/sample-batman.jpg",
  "/covers/sample-spawn.jpg",
  "/covers/sample-xmen.jpg",
  "/covers/sample-hulk.jpg",
  "/covers/sample-ff.jpg",
];

export function HeroSection() {
  const [searchQuery, setSearchQuery] = useState("");
  const [showWaitlistModal, setShowWaitlistModal] = useState(false);
  const [collageImages, setCollageImages] = useState<string[]>(SAMPLE_COVERS);
  const [showBanner, setShowBanner] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchPanelComicsListings();
  }, []);

  const fetchPanelComicsListings = async () => {
    try {
      const { data: sellerData } = await supabase
        .from("profiles")
        .select("user_id")
        .or("username.ilike.%Panel Comics%,display_name.ilike.%Panel Comics%")
        .maybeSingle();

      if (!sellerData) return;

      const { data: listingsData } = await supabase
        .from("inventory_items")
        .select("*")
        .eq("user_id", sellerData.user_id)
        .in("listing_status", ["active", "listed"])
        .or("for_sale.eq.true,for_auction.eq.true")
        .limit(6);

      if (listingsData && listingsData.length > 0) {
        const images = listingsData
          .map(listing => getListingImageUrl(listing))
          .filter(url => url && url !== "/placeholder.svg")
          .slice(0, 6);

        if (images.length >= 4) {
          setCollageImages(images);
        }
      }
    } catch (error) {
      console.error("Error fetching Panel Comics listings:", error);
    }
  };

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
      {showBanner && (
        <div className="bg-primary/10 border-b border-primary/20 py-1.5 md:py-2 px-3 md:px-4">
          <div className="container mx-auto flex items-center justify-between gap-2">
            <p className="text-xs md:text-sm font-medium truncate">
              <span className="font-bold">Founding Sellers:</span> 0% fees on first 3 sales • Lower fees than eBay
            </p>
            <button
              onClick={() => setShowBanner(false)}
              className="text-muted-foreground hover:text-foreground text-lg md:text-xl leading-none flex-shrink-0"
              aria-label="Dismiss banner"
            >
              ×
            </button>
          </div>
        </div>
      )}

      <section className="relative py-10 sm:py-14 md:py-24 px-4 overflow-hidden bg-gradient-to-b from-background via-background/95 to-background hero-with-halftone">
        {/* Vignette overlay */}
        <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_center,transparent_40%,rgba(0,0,0,0.3)_100%)]" />
        
        {/* Enhanced comic collage background */}
        <div className="absolute inset-0 opacity-25 sm:opacity-20 md:opacity-10 pointer-events-none">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(230,0,0,0.15),transparent_50%)]" />
          <div className="grid grid-cols-3 md:grid-cols-6 gap-3 md:gap-4 p-3 md:p-4 h-full scale-110 md:scale-100">
            {collageImages.map((img, i) => (
              <div
                key={i}
                className="relative aspect-[2/3] rounded-lg overflow-hidden border-2 border-primary/30 shadow-lg"
                style={{
                  transform: `rotate(${i % 2 === 0 ? '-' : ''}${2 + (i % 3)}deg)`,
                  opacity: 0.8 - (i * 0.08),
                  filter: 'saturate(1.4) contrast(1.15)'
                }}
              >
                <img
                  src={img}
                  alt=""
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              </div>
            ))}
          </div>
        </div>

        <div className="container mx-auto max-w-7xl relative z-10">
          <div className="grid lg:grid-cols-2 gap-8 md:gap-12 items-center">
            <div className="space-y-5 md:space-y-6">
              <h1 className="text-4xl sm:text-5xl md:text-6xl font-black leading-[1.15] sm:leading-tight">
                The Trusted Marketplace for{" "}
                <span className="text-primary drop-shadow-lg">Comic Grails & Keys</span>
              </h1>
              
              <p className="text-base sm:text-lg md:text-xl text-foreground/80 leading-relaxed">
                Buy, sell, and trade slabs, keys, and runs from verified collectors.
              </p>

              <div className="flex flex-wrap gap-3 md:gap-4 py-3 md:py-4">
                <div className="flex items-center gap-2 text-xs sm:text-sm">
                  <Shield className="h-4 w-4 text-primary flex-shrink-0" />
                  <span>Built for collectors in public beta</span>
                </div>
                <div className="flex items-center gap-2 text-xs sm:text-sm">
                  <TrendingUp className="h-4 w-4 text-primary flex-shrink-0" />
                  <span>0% fees on first 3 sales</span>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row flex-wrap gap-3">
                <Button 
                  size="lg" 
                  onClick={scrollToListings}
                  className="w-full sm:w-auto text-base sm:text-lg px-6 sm:px-8 py-6 sm:py-5 shadow-lg hover:shadow-xl transition-all hover:scale-[1.02] bg-[#E60000] hover:bg-[#FF1A1A]"
                >
                  Start Hunting Grails
                </Button>
                <Button 
                  size="lg" 
                  variant="outline"
                  onClick={() => navigate('/marketplace?filter=local')}
                  className="w-full sm:w-auto text-base sm:text-lg px-6 sm:px-8 py-6 sm:py-5 border-2 shadow-md hover:shadow-lg transition-all hover:scale-[1.02]"
                >
                  Browse Local Deals
                </Button>
                <Button 
                  size="lg" 
                  variant="secondary"
                  onClick={() => navigate('/scanner')}
                  className="w-full sm:w-auto text-base sm:text-lg px-6 sm:px-8 py-6 sm:py-5 flex items-center justify-center gap-2 shadow-md hover:shadow-lg transition-all hover:scale-[1.02]"
                >
                  <Smartphone className="h-5 w-5" />
                  Scan & List a Comic
                </Button>
              </div>
            </div>

            <div className="relative hidden lg:block">
              <div className="relative aspect-[3/4] max-w-md mx-auto">
                <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-primary/5 rounded-2xl transform rotate-3" />
                <div className="relative grid grid-cols-2 gap-3 p-4">
                  {collageImages.slice(0, 4).map((img, i) => (
                    <div
                      key={i}
                      className="aspect-[2/3] rounded-lg overflow-hidden border-4 border-background shadow-xl"
                    >
                      <img
                        src={img}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ))}
                </div>
                <div className="absolute -bottom-4 -right-4 bg-primary text-primary-foreground px-6 py-3 rounded-full font-bold shadow-lg">
                  CGC • CBCS • Raw
                </div>
              </div>
            </div>
          </div>

          <div className="mt-12">
            <form onSubmit={handleSearch} className="max-w-2xl mx-auto">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search comics, cards, or original art..."
                  className="w-full pl-12 pr-4 py-4 rounded-xl border-2 border-border bg-card text-lg focus:border-primary focus:outline-none"
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
