import { Helmet } from "react-helmet-async";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { Camera, TrendingUp } from "lucide-react";
import { BenefitBlocks } from "@/components/home/BenefitBlocks";
import { FeeBreakdown } from "@/components/home/FeeBreakdown";

export default function Sell() {
  const navigate = useNavigate();

  return (
    <>
      <Helmet>
        <title>Start Selling on GrailSeeker - List Your Comics</title>
        <meta 
          name="description" 
          content="Start selling your comics, keys, and grails on GrailSeeker. Lower fees, faster listings, and reach collectors nationwide." 
        />
      </Helmet>

      <main className="min-h-screen">
        {/* Hero Section */}
        <section className="bg-gradient-to-b from-primary/10 to-background py-20 px-4">
          <div className="container mx-auto max-w-4xl text-center">
            <h1 className="text-4xl md:text-6xl font-bold mb-6">
              Sell Comics on Your Terms
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground mb-4 max-w-2xl mx-auto">
              List when you want. Keep more of every sale.
            </p>
            <p className="text-base text-muted-foreground mb-8 max-w-xl mx-auto">
              No monthly seller fees. No exclusivity.
            </p>
            
            {/* Key Benefits - Bullet Points */}
            <div className="flex flex-wrap justify-center gap-x-6 gap-y-2 mb-12 text-sm text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-primary"></span>
                Set your own prices
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-primary"></span>
                Edit or remove listings anytime
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-primary"></span>
                Nothing goes live without your approval
              </span>
            </div>

            {/* Fee Cards */}
            <div className="grid md:grid-cols-3 gap-6 mb-12 max-w-3xl mx-auto text-left">
              <div className="bg-card border border-border rounded-lg p-4">
                <div className="text-2xl font-bold text-primary mb-2">0%</div>
                <div className="text-sm font-semibold mb-1">Listing Fees</div>
                <div className="text-xs text-muted-foreground">No upfront costs to list</div>
              </div>
              <div className="bg-card border border-border rounded-lg p-4">
                <div className="text-2xl font-bold text-primary mb-2">3.75%</div>
                <div className="text-sm font-semibold mb-1">Marketplace Fee</div>
                <div className="text-xs text-muted-foreground">Lower than eBay, Mercari, etc.</div>
              </div>
              <div className="bg-card border border-border rounded-lg p-4">
                <div className="text-2xl font-bold text-primary mb-2">&lt;60s</div>
                <div className="text-sm font-semibold mb-1">List a Comic</div>
                <div className="text-xs text-muted-foreground">AI scanner auto-fills details</div>
              </div>
            </div>

            <Button 
              size="lg" 
              className="text-xl px-10 py-7 font-black shadow-lg hover:shadow-xl transition-all"
              onClick={() => navigate("/scanner")}
            >
              Start Listing – Open Scanner
            </Button>
          </div>
        </section>

        {/* 3 Step Process */}
        <section className="py-20 px-4">
          <div className="container mx-auto max-w-5xl">
            <h2 className="text-3xl md:text-4xl font-bold text-center mb-16">
              List in 3 Simple Steps
            </h2>
            <div className="grid md:grid-cols-3 gap-12">
              <div className="text-center">
                <div className="h-20 w-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-6">
                  <span className="text-3xl font-bold text-primary">1</span>
                </div>
                <h3 className="text-2xl font-semibold mb-4">Create Your Account</h3>
                <p className="text-muted-foreground">
                  Quick and easy signup. No upfront costs.
                </p>
              </div>

              <div className="text-center">
                <div className="h-20 w-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-6">
                  <Camera className="h-10 w-10 text-primary" />
                </div>
                <h3 className="text-2xl font-semibold mb-4">Scan or Add Your Comic</h3>
                <p className="text-muted-foreground">
                  Use our smart scanner or manual entry. We auto-fill the details.
                </p>
              </div>

              <div className="text-center">
                <div className="h-20 w-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-6">
                  <TrendingUp className="h-10 w-10 text-primary" />
                </div>
                <h3 className="text-2xl font-semibold mb-4">Choose Auction or Buy Now</h3>
                <p className="text-muted-foreground">
                  Set your price or let buyers make offers. You're in control.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Benefits */}
        <BenefitBlocks />

        {/* Fee Breakdown */}
        <FeeBreakdown />

        {/* CTA */}
        <section className="py-20 px-4 bg-primary/5">
          <div className="container mx-auto max-w-4xl text-center">
            <h2 className="text-3xl md:text-4xl font-bold mb-6">
              Ready to Start Selling?
            </h2>
            <p className="text-sm text-muted-foreground mb-8">
              GrailSeeker is built for collectors and sellers — not volume resellers.
            </p>
            <Button 
              size="lg" 
              className="text-lg px-8 py-6"
              onClick={() => navigate("/scanner")}
            >
              List Your First Comic Now
            </Button>
          </div>
        </section>
      </main>
    </>
  );
}
