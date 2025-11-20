import { useState } from "react";
import { Helmet } from "react-helmet-async";
import { HeroSection } from "@/components/home/HeroSection";
import { SocialProof } from "@/components/home/SocialProof";
import { FeesSection } from "@/components/home/FeesSection";
import { CategoryFilter } from "@/components/home/CategoryFilter";
import { ListingsCarousel } from "@/components/home/ListingsCarousel";
import { BenefitBlocks } from "@/components/home/BenefitBlocks";
import { TrustSection } from "@/components/home/TrustSection";

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
        {/* Hero Section */}
        <HeroSection />
        
        {/* Social Proof */}
        <SocialProof />
        
        {/* Fees Section */}
        <FeesSection />
        
        {/* Category Filter */}
        <CategoryFilter 
          activeCategory={activeCategory} 
          onCategoryChange={setActiveCategory} 
        />
        
        {/* Listings Sections */}
        <ListingsCarousel title="Newly Listed" filterType="newly-listed" />
        
        <ListingsCarousel title="Ending Soon — Last Chance to Bid" filterType="ending-soon" />
        
        <ListingsCarousel title="Hot This Week" filterType="hot-week" />
        
        <ListingsCarousel title="Local Deals Near You" filterType="local" />

        {/* Why GrailSeeker */}
        <BenefitBlocks />
        
        {/* Trust & Safety */}
        <TrustSection />
      </main>
    </>
  );
}
