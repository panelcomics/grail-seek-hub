import { useState } from "react";
import { Helmet } from "react-helmet-async";
import { HeroSection } from "@/components/home/HeroSection";
import { MarketplaceTabs } from "@/components/home/MarketplaceTabs";
import { ListingsGrid } from "@/components/home/ListingsGrid";
import { BenefitBlocks } from "@/components/home/BenefitBlocks";
import { FeeBreakdown } from "@/components/home/FeeBreakdown";

export default function Index() {
  const [activeTab, setActiveTab] = useState("featured");

  return (
    <>
      <Helmet>
        <title>GrailSeeker - The Trusted Marketplace for Comic Grails & Keys</title>
        <meta 
          name="description" 
          content="Buy, sell, and trade comics, slabs, keys, and original art from verified collectors. Lower fees, faster listings, built by collectors for collectors." 
        />
      </Helmet>

      <main>
        <HeroSection />
        
        <MarketplaceTabs activeTab={activeTab} onTabChange={setActiveTab} />
        
        <section className="py-12 px-4">
          <div className="container mx-auto">
            <ListingsGrid filterType={activeTab} />
          </div>
        </section>

        <BenefitBlocks />
        
        <FeeBreakdown />
      </main>
    </>
  );
}
