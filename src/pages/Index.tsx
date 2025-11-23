import { useState } from "react";
import { Helmet } from "react-helmet-async";
import { HeroSection } from "@/components/home/HeroSection";
import { SocialProof } from "@/components/home/SocialProof";
import { FeesSection } from "@/components/home/FeesSection";
import { CategoryFilter } from "@/components/home/CategoryFilter";
import { ListingsCarousel } from "@/components/home/ListingsCarousel";
import { BenefitBlocks } from "@/components/home/BenefitBlocks";
import { TrustSection } from "@/components/home/TrustSection";
import { PremiumDealerCarousel } from "@/components/home/PremiumDealerCarousel";

import { FoundingSellersBanner } from "@/components/home/FoundingSellersBanner";
import FeaturedShops from "@/components/FeaturedShops";
import { SafetySection } from "@/components/home/SafetySection";

export default function Index() {
  const [activeCategory, setActiveCategory] = useState("all");

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
        {/* 1. Founding Sellers Banner */}
        <FoundingSellersBanner />
        
        {/* 2. Comic Stack Hero */}
        <HeroSection />
        
        {/* 3. Featured Grails — Buy It Now */}
        <ListingsCarousel title="✨ Featured Grails — Buy It Now" filterType="featured-grails" />
        
        {/* 4. Start Hunting Grails / Browse Local Deals buttons + search */}
        <TrustSection />
        
        {/* 5. Stats row (500+ / New / Verified) */}
        <SocialProof />

        {/* 6. Hot Auctions Ending Soon */}
        <ListingsCarousel title="Ending Soon — Last Chance to Bid" filterType="ending-soon" />
        
        {/* 7. Local Deals Near You */}
        <ListingsCarousel title="Local Deals Near You" filterType="local" />
        
        {/* 8. Newly Listed */}
        <ListingsCarousel title="Newly Listed" filterType="newly-listed" />
        
        {/* Everything else */}
        <SafetySection />
        
        <FeesSection />
        
        <CategoryFilter 
          activeCategory={activeCategory} 
          onCategoryChange={setActiveCategory} 
        />

        {/* Featured Shop - Premium Dealer */}
        <PremiumDealerCarousel sellerName="Panel Comics" />

        <PremiumDealerCarousel sellerName="Kiss Komixx" />

        <FeaturedShops />

        <BenefitBlocks />
      </main>
    </>
  );
}
