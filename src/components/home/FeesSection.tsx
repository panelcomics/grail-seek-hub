import { DollarSign } from "lucide-react";

export function FeesSection() {
  return (
    <section className="py-12 px-4">
      <div className="container mx-auto max-w-4xl">
        <div className="bg-card border-2 border-border rounded-lg p-8">
          <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
            <DollarSign className="h-6 w-6 text-primary" />
            How GrailSeeker Fees Work
          </h2>
          <div className="space-y-4">
            <div className="flex justify-between items-center pb-3 border-b border-border">
              <span className="font-medium">Listing Fee</span>
              <span className="font-bold text-lg text-primary">$0</span>
            </div>
            <div className="flex justify-between items-center pb-3 border-b border-border">
              <span className="font-medium">GrailSeeker Fee</span>
              <span className="font-bold text-lg">2-3.75%*</span>
            </div>
            <div className="flex justify-between items-center pb-3 border-b border-border">
              <span className="font-medium">Payment Processing (Stripe)</span>
              <span className="font-bold text-lg">2.9% + $0.30</span>
            </div>
            <div className="flex justify-between items-center pt-2">
              <span className="font-bold text-lg">Typical Total Fee</span>
              <span className="font-bold text-2xl text-primary">~4.9-6.6%</span>
            </div>
            <p className="text-xs text-center pt-4 text-muted-foreground">
              *First 100 sellers get lifetime 2% rate. Standard rate is 3.75%.<br/>
              vs. 13–15% on big marketplaces
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
