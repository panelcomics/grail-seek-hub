import { Quote } from "lucide-react";

export function SocialProof() {
  return (
    <section className="py-8 px-4">
      <div className="container mx-auto max-w-4xl">
        <div className="relative bg-card border-2 border-border rounded-lg p-8 text-center">
          <Quote className="absolute top-4 left-4 h-8 w-8 text-primary/20" />
          <p className="text-lg md:text-xl font-medium mb-3">
            "Sold my ASM #300 in 11 minutes and kept <span className="text-primary font-bold">$94 more</span> than eBay would've let me."
          </p>
          <div className="flex items-center justify-center gap-2">
            <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
              <span className="text-xs font-bold">KK</span>
            </div>
            <p className="text-sm text-muted-foreground">— @kisskomixx</p>
          </div>
        </div>
      </div>
    </section>
  );
}
