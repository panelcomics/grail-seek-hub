import { Helmet } from "react-helmet-async";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { Zap, Camera, TrendingUp } from "lucide-react";
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
              Start Selling Your Grails
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground mb-12 max-w-2xl mx-auto">
              Join GrailSeeker and connect with collectors who appreciate your comics as much as you do.
            </p>
            <Button 
              size="lg" 
              className="text-lg px-8 py-6"
              onClick={() => navigate("/scanner")}
            >
              Start Your First Listing
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
            <p className="text-lg text-muted-foreground mb-8">
              Join thousands of collectors and shops already on GrailSeeker.
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
