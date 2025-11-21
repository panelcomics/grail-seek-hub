import { DollarSign, ShieldCheck, MapPin } from "lucide-react";

export function TrustSection() {
  return (
    <section className="py-8 md:py-12 px-4 bg-background border-y">
      <div className="container mx-auto max-w-6xl">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
          {/* Low Seller Fees */}
          <div className="flex flex-col items-center text-center space-y-2">
            <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mb-2">
              <DollarSign className="h-6 w-6 text-primary" />
            </div>
            <h3 className="font-bold text-lg">Low Seller Fees</h3>
            <p className="text-sm text-muted-foreground">
              Lifetime 2% fee for first 100 sellers
            </p>
          </div>

          {/* Collector-First Security */}
          <div className="flex flex-col items-center text-center space-y-2">
            <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mb-2">
              <ShieldCheck className="h-6 w-6 text-primary" />
            </div>
            <h3 className="font-bold text-lg">Collector-First Security</h3>
            <p className="text-sm text-muted-foreground">
              Verified users and dispute support
            </p>
          </div>

          {/* Local & Shipped Deals */}
          <div className="flex flex-col items-center text-center space-y-2">
            <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mb-2">
              <MapPin className="h-6 w-6 text-primary" />
            </div>
            <h3 className="font-bold text-lg">Local & Shipped Deals</h3>
            <p className="text-sm text-muted-foreground">
              Meet up locally or ship with tracking
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
