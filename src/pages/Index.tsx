import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { HeroSection } from "@/components/home/HeroSection";
import { SocialProof } from "@/components/home/SocialProof";
import { FeesSection } from "@/components/home/FeesSection";
import { CategoryFilter } from "@/components/home/CategoryFilter";
import { ListingsCarousel } from "@/components/home/ListingsCarousel";
import { LocalDealsCarousel } from "@/components/home/LocalDealsCarousel";
import { BenefitBlocks } from "@/components/home/BenefitBlocks";
import { TrustSection } from "@/components/home/TrustSection";
import { PremiumDealerCarousel } from "@/components/home/PremiumDealerCarousel";
import { FEATURED_SELLERS } from "@/config/featuredSellers";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Check, Camera } from "lucide-react";
import { useOnboardingCheck } from "@/hooks/useOnboardingCheck";
import { FoundingSellersBanner } from "@/components/home/FoundingSellersBanner";
import FeaturedShops from "@/components/FeaturedShops";
import { SafetySection } from "@/components/home/SafetySection";
import { LazyCarousel } from "@/components/LazyCarousel";
import { EventsLane } from "@/components/home/EventsLane";

export default function Index() {
  useOnboardingCheck(); // Check if user needs onboarding
  
  const [activeCategory, setActiveCategory] = useState("all");
  const [searchParams, setSearchParams] = useSearchParams();
  const [showWelcomeBanner, setShowWelcomeBanner] = useState(false);

  useEffect(() => {
    // Check if user just completed onboarding
    if (searchParams.get('onboarding_complete') === 'true') {
      setShowWelcomeBanner(true);
      // Clear the query param after a short delay
      setTimeout(() => {
        setSearchParams({});
      }, 100);
    }
  }, [searchParams, setSearchParams]);

  return (
    <>
      <Helmet>
        <title>GrailSeeker - The Trusted Marketplace for Comic Grails & Keys</title>
        <meta 
          name="description" 
          content="Buy, sell, and trade comics, slabs, keys, and original art from verified collectors. Lower fees, faster listings, built by collectors for collectors." 
        />
      </Helmet>

      <main className="min-h-screen">
        {/* Welcome Banner after Onboarding */}
        {showWelcomeBanner && (
          <div className="bg-background border-b">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
              <Alert className="border-primary/20 bg-primary/5">
                <Check className="h-5 w-5 text-primary" />
                <AlertDescription className="flex items-center justify-between flex-wrap gap-2">
                  <span className="font-medium">
                    Welcome to GrailSeeker! Your account is ready. Start listing your grails now!
                  </span>
                  <Button
                    size="sm"
                    className="ml-auto"
                    onClick={() => window.location.href = '/scanner'}
                  >
                    <Camera className="mr-2 h-4 w-4" />
                    Start Listing
                  </Button>
                </AlertDescription>
              </Alert>
            </div>
          </div>
        )}
        
        {/* 1. Founding Sellers Banner */}
        <FoundingSellersBanner />
        
        {/* 2. Comic Stack Hero */}
        <HeroSection />
        
        {/* 
          Event Lane Lite: Shows live/upcoming seller events
          Only renders if events array has items, hides completely otherwise.
          Position: After hero, before listings for visibility.
        */}
        <EventsLane />
        
        {/* 3. Featured Grails — Buy It Now (lazy load with priority for first 3 images) */}
        <ListingsCarousel
          title="✨ Featured Grails — Buy It Now" 
          filterType="featured-grails"
          useCache
          cacheKey="featured-grails"
        />
        
        {/* 4. Featured Shop: Panel Comics (lazy) */}
        <LazyCarousel>
          <PremiumDealerCarousel 
            sellerId={FEATURED_SELLERS.PANEL_COMICS.sellerId}
            sellerName={FEATURED_SELLERS.PANEL_COMICS.displayName}
            useCache
            cacheKey="featured-shop-panel-comics"
          />
        </LazyCarousel>
        
        {/* 5. Newly Listed (lazy) */}
        <LazyCarousel>
          <ListingsCarousel 
            title="Newly Listed" 
            filterType="newly-listed"
            useCache
            cacheKey="newly-listed"
          />
        </LazyCarousel>
        
        {/* Ending Soon carousel removed for beta to reduce load */}
        
        {/* Additional sections - Commented out for now */}
        {/* <PremiumDealerCarousel 
          sellerId={FEATURED_SELLERS.KISS_KOMIXX.sellerId}
          sellerName={FEATURED_SELLERS.KISS_KOMIXX.displayName}
          useCache
          cacheKey="featured-shop-kiss-komixx"
        /> */}
        
        {/* <TrustSection /> */}
        
        {/* <SocialProof /> */}
        
        {/* Everything else - Commented out for now */}
        {/* <SafetySection /> */}
        
        {/* <FeesSection /> */}
        
        {/* <CategoryFilter 
          activeCategory={activeCategory} 
          onCategoryChange={setActiveCategory} 
        /> */}

        {/* <FeaturedShops /> */}

        {/* <BenefitBlocks /> */}
      </main>
    </>
  );
}
