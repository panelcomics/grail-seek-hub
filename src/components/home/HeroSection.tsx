import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Search } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { WaitlistModal } from "./WaitlistModal";
import { supabase } from "@/integrations/supabase/client";
import { getListingImageUrl } from "@/lib/sellerUtils";

// Fallback comic cover images
const FALLBACK_COVERS = [
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
  const [collageImages, setCollageImages] = useState<string[]>(FALLBACK_COVERS);
  const navigate = useNavigate();

  useEffect(() => {
    fetchPanelComicsListings();
  }, []);

  const fetchPanelComicsListings = async () => {
    try {
      // Find Panel Comics seller
      const { data: sellerData } = await supabase
        .from("profiles")
        .select("user_id")
        .or("username.ilike.%Panel Comics%,display_name.ilike.%Panel Comics%")
        .maybeSingle();

      if (!sellerData) {
        return; // Use fallback covers
      }

      // Fetch their active listings
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

        // Only use live images if we have at least 4
        if (images.length >= 4) {
          setCollageImages(images);
        }
      }
    } catch (error) {
      console.error("Error fetching Panel Comics listings:", error);
      // Continue with fallback covers
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery)}`);
    }
  };

  return (
    <>
      <section className="relative py-16 px-4 bg-gradient-to-b from-primary/5 via-background to-background overflow-hidden">
        {/* Comic Collage Background */}
        <div className="absolute inset-0 opacity-10 pointer-events-none">
          <div className="absolute top-0 right-0 w-1/3 h-full hidden lg:flex flex-col gap-4 p-8">
            <div className="grid grid-cols-2 gap-4">
              <img src={collageImages[0]} alt="" className="w-full h-48 object-cover rounded-lg shadow-lg rotate-3" />
              <img src={collageImages[1]} alt="" className="w-full h-48 object-cover rounded-lg shadow-lg -rotate-2" />
              <img src={collageImages[2]} alt="" className="w-full h-48 object-cover rounded-lg shadow-lg -rotate-3" />
              <img src={collageImages[3]} alt="" className="w-full h-48 object-cover rounded-lg shadow-lg rotate-2" />
            </div>
          </div>
          <div className="absolute top-0 left-0 w-1/4 h-full hidden xl:flex flex-col gap-4 p-8 opacity-70">
            <img src={collageImages[4] || collageImages[0]} alt="" className="w-full h-40 object-cover rounded-lg shadow-lg -rotate-6" />
            <img src={collageImages[5] || collageImages[1]} alt="" className="w-full h-40 object-cover rounded-lg shadow-lg rotate-3" />
          </div>
        </div>
        
        {/* Comic Halftone Texture */}
        <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{
          backgroundImage: 'radial-gradient(circle, currentColor 1px, transparent 1px)',
          backgroundSize: '8px 8px'
        }} />
        
        <div className="container mx-auto max-w-6xl relative z-10">
          <div className="text-center mb-8">
            <div className="relative inline-block mb-6">
              <h1 className="text-4xl md:text-6xl lg:text-7xl font-black mb-4 text-primary leading-tight">
                The Trusted Marketplace for<br />Comic Grails & Keys
              </h1>
              <div className="absolute -top-4 -right-4 md:-right-8">
                <div className="bg-primary text-primary-foreground rounded-full w-20 h-20 md:w-24 md:h-24 flex flex-col items-center justify-center rotate-12 shadow-lg border-4 border-background">
                  <span className="text-2xl md:text-3xl font-black">0%</span>
                  <span className="text-[10px] md:text-xs font-bold">fees on first</span>
                  <span className="text-[10px] md:text-xs font-bold">3 sales!</span>
                </div>
              </div>
            </div>
            
            <p className="text-lg md:text-2xl font-semibold mb-8 text-foreground/90">
              Powered by AI that identifies any comic in under 3 seconds.
            </p>
            
            <Button 
              size="lg" 
              className="text-xl px-10 py-7 font-black mb-8 shadow-lg hover:shadow-xl transition-all"
              onClick={() => setShowWaitlistModal(true)}
            >
              Claim Your GrailSeeker Handle
            </Button>
          </div>

          {/* Sticky Search Bar */}
          <div className="md:static sticky top-0 z-40 bg-background/95 backdrop-blur-sm py-4 -mx-4 px-4 md:mx-0 md:px-0 md:py-0 md:bg-transparent md:backdrop-blur-none">
            <form onSubmit={handleSearch} className="max-w-3xl mx-auto">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-6 w-6 text-muted-foreground" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search Grails, keys, runs, slabs, sellers..."
                className="w-full pl-14 pr-4 py-5 rounded-lg border-2 border-border bg-card text-foreground text-lg font-medium focus:outline-none focus:ring-2 focus:ring-primary shadow-md"
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
