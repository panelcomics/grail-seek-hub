/**
 * Built for Collectors Section
 * 
 * Grounding section that appears directly under the hero.
 * Communicates the core value props in 3 concise bullets.
 */

import { Eye, Camera, Wallet } from "lucide-react";

export function BuiltForCollectorsSection() {
  return (
    <section className="py-8 sm:py-12 px-4 bg-muted/30 border-y border-border/50">
      <div className="container mx-auto max-w-4xl">
        <h2 className="text-xl sm:text-2xl font-bold text-center mb-6 sm:mb-8">
          Built for Collectors
        </h2>
        
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
          <div className="flex flex-col items-center text-center p-4">
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center mb-3">
              <Eye className="h-5 w-5 text-primary" />
            </div>
            <p className="text-sm sm:text-base text-foreground">
              Discover books collectors are actively watching
            </p>
          </div>
          
          <div className="flex flex-col items-center text-center p-4">
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center mb-3">
              <Camera className="h-5 w-5 text-primary" />
            </div>
            <p className="text-sm sm:text-base text-foreground">
              Scan comics instantly with Scanner Assist
            </p>
          </div>
          
          <div className="flex flex-col items-center text-center p-4">
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center mb-3">
              <Wallet className="h-5 w-5 text-primary" />
            </div>
            <p className="text-sm sm:text-base text-foreground">
              Buy and sell with transparent, collector-friendly fees
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
