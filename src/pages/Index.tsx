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
import { LiveAuctionsStrip } from "@/components/home/LiveAuctionsStrip";
import { FoundingSellersBanner } from "@/components/home/FoundingSellersBanner";
import { HotAuctionsCarousel } from "@/components/home/HotAuctionsCarousel";
import FeaturedShops from "@/components/FeaturedShops";

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
        {/* Founding Sellers Banner */}
        <FoundingSellersBanner />
        
        {/* Hero Section */}
        <HeroSection />
        
        {/* Fees Section - Moved to appear right after hero */}
        <FeesSection />
        
        {/* Live Right Now - Hot Auctions */}
        <section className="py-4 md:py-8 px-4 bg-gradient-to-b from-primary/5 to-background">
          <div className="container mx-auto max-w-6xl">
            <h2 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-black text-center mb-4 md:mb-6 text-primary">
              🔥 Live Right Now — Hot Auctions
            </h2>
            <HotAuctionsCarousel />
          </div>
        </section>
        
        {/* Live Auctions Strip */}
        <LiveAuctionsStrip />
        
        {/* Category Filter */}
        <CategoryFilter 
          activeCategory={activeCategory} 
          onCategoryChange={setActiveCategory} 
        />
        
        {/* Social Proof */}
        <SocialProof />

        {/* Premium Featured Dealers */}
        <PremiumDealerCarousel sellerName="Panel Comics" />
        <PremiumDealerCarousel sellerName="Kiss Komixx" />

        {/* Featured Sellers */}
        <FeaturedShops />
        
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
