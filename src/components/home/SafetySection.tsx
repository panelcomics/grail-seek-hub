import { ShieldCheck, Star, MapPin } from "lucide-react";
import { Card } from "@/components/ui/card";

export function SafetySection() {
  const features = [
    {
      icon: ShieldCheck,
      title: "Verified Sellers (Coming Online in Beta)",
      description: "We're rolling out verification for trusted sellers so you can buy grails with confidence."
    },
    {
      icon: Star,
      title: "Pro Sellers & Ratings",
      description: "See experience badges based on successful sales."
    },
    {
      icon: MapPin,
      title: "Local & Shipped Deals with Protection",
      description: "Meet locally on your terms or ship with tracking for safer transactions."
    }
  ];

  return (
    <section className="py-12 md:py-16 px-4 bg-muted/30">
      <div className="container mx-auto max-w-6xl">
        <div className="text-center mb-8 md:mb-12">
          <h2 className="text-2xl md:text-3xl lg:text-4xl font-black mb-3 text-foreground">
            Buy & Sell with Confidence
          </h2>
          <p className="text-sm md:text-base text-muted-foreground max-w-2xl mx-auto">
            Trust and safety features designed to protect collectors
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {features.map((feature) => (
            <Card key={feature.title} className="p-6 bg-card border-2 hover:border-primary/30 transition-colors">
              <div className="flex flex-col items-center text-center space-y-3">
                <div className="p-3 rounded-full bg-primary/10">
                  <feature.icon className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-bold text-base text-foreground">
                  {feature.title}
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {feature.description}
                </p>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
