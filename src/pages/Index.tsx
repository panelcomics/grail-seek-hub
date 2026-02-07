import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { HeroSection } from "@/components/home/HeroSection";
import { ListingsCarousel } from "@/components/home/ListingsCarousel";
import { PremiumDealerCarousel } from "@/components/home/PremiumDealerCarousel";
import { FEATURED_SELLERS } from "@/config/featuredSellers";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Check, Camera } from "lucide-react";
import { useOnboardingCheck } from "@/hooks/useOnboardingCheck";
import { FoundingSellersBanner } from "@/components/home/FoundingSellersBanner";
import { LazyCarousel } from "@/components/LazyCarousel";
import { AuctionEndingNextHourStrip } from "@/components/auction/AuctionEndingNextHourStrip";
import { OriginalArtSection } from "@/components/home/OriginalArtSection";

export default function Index() {
  useOnboardingCheck();
  
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
        <title>GrailSeeker - Find the Comics Collectors Are Chasing</title>
        <meta 
          name="description" 
          content="Search, scan, and track comics using real collector activity. Discover books collectors are watching, scan instantly with Scanner Assist, and buy/sell with transparent fees." 
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
        
        {/* 2. Hero Section - Primary Identity */}
        <HeroSection />
        
        {/* 3. Featured Grails — Buy It Now */}
        <ListingsCarousel
          title="✨ Featured Grails — Buy It Now" 
          filterType="featured-grails"
          useCache
          cacheKey="featured-grails"
        />
        
        {/* 4. Featured Shop: Panel Comics */}
        <LazyCarousel>
          <PremiumDealerCarousel 
            sellerId={FEATURED_SELLERS.PANEL_COMICS.sellerId}
            sellerName={FEATURED_SELLERS.PANEL_COMICS.displayName}
            useCache
            cacheKey="featured-shop-panel-comics"
          />
        </LazyCarousel>
        
        {/* 5. Newly Listed */}
        <LazyCarousel>
          <ListingsCarousel 
            title="Newly Listed" 
            filterType="newly-listed"
            useCache
            cacheKey="newly-listed"
          />
        </LazyCarousel>

        {/* 6. Auction Preview — Ending Soon (preview-only) */}
        <AuctionEndingNextHourStrip />

        {/* 7. Original Art (Curated) */}
        <LazyCarousel>
          <OriginalArtSection />
        </LazyCarousel>
      </main>
    </>
  );
}
