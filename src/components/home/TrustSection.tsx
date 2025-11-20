import { Shield, Lock, Package } from "lucide-react";

export function TrustSection() {
  return (
    <section className="py-12 px-4 bg-card">
      <div className="container mx-auto max-w-4xl text-center">
        <h2 className="text-2xl font-bold mb-6">Secure & Trusted</h2>
        <div className="flex flex-wrap justify-center items-center gap-8">
          <div className="flex items-center gap-2">
            <Shield className="h-6 w-6 text-primary" />
            <span className="font-medium">Stripe Payments</span>
          </div>
          <div className="flex items-center gap-2">
            <Package className="h-6 w-6 text-primary" />
            <span className="font-medium">Shippo Shipping</span>
          </div>
          <div className="flex items-center gap-2">
            <Lock className="h-6 w-6 text-primary" />
            <span className="font-medium">Secure Checkout</span>
          </div>
        </div>
        <p className="text-sm text-muted-foreground mt-4">
          Secure payments powered by Stripe. Discounted shipping via Shippo.
        </p>
      </div>
    </section>
  );
}
