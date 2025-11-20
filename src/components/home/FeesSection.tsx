import { DollarSign } from "lucide-react";

export function FeesSection() {
  return (
    <section className="py-12 px-4">
      <div className="container mx-auto max-w-6xl">
        <div className="grid md:grid-cols-2 gap-6">
          {/* Fees Box */}
          <div className="bg-card border-2 border-border rounded-lg p-6">
            <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
              <DollarSign className="h-6 w-6 text-primary" />
              How GrailSeeker Fees Work
            </h2>
            <div className="space-y-4">
              <div className="flex justify-between items-center pb-3 border-b border-border">
                <span className="font-medium">Marketplace Fee</span>
                <span className="font-bold text-lg">3.75%</span>
              </div>
              <div className="flex justify-between items-center pb-3 border-b border-border">
                <span className="font-medium">Payment Processing (Stripe)</span>
                <span className="font-bold text-lg">2.9% + $0.30</span>
              </div>
              <div className="flex justify-between items-center pt-2">
                <span className="font-bold text-lg">Total Estimated Fee</span>
                <span className="font-bold text-2xl text-primary">~6.6%</span>
              </div>
              <p className="text-sm text-center pt-4 font-medium">
                Save 40–60% vs eBay & Whatnot
              </p>
            </div>
          </div>

          {/* Featured Sellers Preview */}
          <div className="bg-card border-2 border-border rounded-lg p-6">
            <h2 className="text-2xl font-bold mb-4">Featured Sellers</h2>
            <div className="space-y-3">
              <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg hover:bg-muted transition-colors">
                <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
                  <span className="text-lg font-bold text-primary">CV</span>
                </div>
                <div className="flex-1">
                  <p className="font-semibold">Comix Vault</p>
                  <div className="flex text-yellow-500 text-sm">
                    {"★★★★★"}
                  </div>
                </div>
                <span className="text-2xl">→</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
