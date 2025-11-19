import { DollarSign, TrendingDown, Zap, MapPin, Shield, Heart } from "lucide-react";

export function BenefitBlocks() {
  const benefits = [
    {
      icon: DollarSign,
      title: "No Listing Fees",
      description: "List as many comics as you want.",
    },
    {
      icon: TrendingDown,
      title: "Lower Fees Than eBay & Whatnot",
      description: "Transparent, simple seller fees.",
    },
    {
      icon: Zap,
      title: "List a Comic in Under 60 Seconds",
      description: "Use our scanner + auto-fill data.",
    },
    {
      icon: MapPin,
      title: "Local or Shipped Deals",
      description: "Choose meet-ups or discounted shipping labels.",
    },
    {
      icon: Shield,
      title: "Verified Sellers & Shops",
      description: "Build trust with badges & history.",
    },
    {
      icon: Heart,
      title: "Built By Collectors, For Collectors",
      description: "Designed for slabs, keys, sketches, and runs.",
    },
  ];

  return (
    <section className="py-20 px-4 bg-muted/20">
      <div className="container mx-auto max-w-6xl">
        <h2 className="text-3xl md:text-4xl font-bold text-center mb-12">
          Why GrailSeeker?
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {benefits.map((benefit, index) => {
            const Icon = benefit.icon;
            return (
              <div key={index} className="flex flex-col items-center text-center p-6 rounded-lg bg-card border">
                <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                  <Icon className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-xl font-semibold mb-2">{benefit.title}</h3>
                <p className="text-muted-foreground">{benefit.description}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
