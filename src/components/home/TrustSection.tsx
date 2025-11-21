import { DollarSign, ShieldCheck, MapPin } from "lucide-react";

export function TrustSection() {
  return (
    <section className="py-6 md:py-10 px-4 bg-muted/20 border-y border-border/40">
      <div className="container mx-auto max-w-6xl">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 md:gap-6">
          {/* Low Seller Fees */}
          <div className="flex flex-col items-center text-center space-y-1.5">
            <div className="h-10 w-10 rounded-full bg-primary/5 flex items-center justify-center mb-1">
              <DollarSign className="h-5 w-5 text-primary/80" />
            </div>
            <h3 className="font-semibold text-base">Low Seller Fees</h3>
            <p className="text-xs text-muted-foreground leading-snug">
              Lifetime 2% fee for first 100 sellers
            </p>
          </div>

          {/* Collector-First Security */}
          <div className="flex flex-col items-center text-center space-y-1.5">
            <div className="h-10 w-10 rounded-full bg-primary/5 flex items-center justify-center mb-1">
              <ShieldCheck className="h-5 w-5 text-primary/80" />
            </div>
            <h3 className="font-semibold text-base">Collector-First Security</h3>
            <p className="text-xs text-muted-foreground leading-snug">
              Verified users and dispute support
            </p>
          </div>

          {/* Local & Shipped Deals */}
          <div className="flex flex-col items-center text-center space-y-1.5">
            <div className="h-10 w-10 rounded-full bg-primary/5 flex items-center justify-center mb-1">
              <MapPin className="h-5 w-5 text-primary/80" />
            </div>
            <h3 className="font-semibold text-base">Local & Shipped Deals</h3>
            <p className="text-xs text-muted-foreground leading-snug">
              Meet up locally or ship with tracking
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
