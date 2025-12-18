/**
 * Built for Collectors Section
 * 
 * Grounding section that appears directly under the hero.
 * Communicates the core value props in 3 concise bullets.
 */

import { Eye, Camera, Wallet } from "lucide-react";

export function BuiltForCollectorsSection() {
  return (
    <section className="py-2 sm:py-6 px-4 bg-muted/30 border-y border-border/50">
      <div className="container mx-auto max-w-4xl">
        <h2 className="text-base sm:text-xl font-bold text-center mb-2 sm:mb-4">
          Built for Collectors
        </h2>
        
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-1 sm:gap-4">
          <div className="flex items-center sm:flex-col sm:text-center gap-2 sm:gap-0 py-1 px-2 sm:p-3">
            <div className="h-7 w-7 sm:h-9 sm:w-9 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 sm:mb-2">
              <Eye className="h-3.5 w-3.5 sm:h-5 sm:w-5 text-primary" />
            </div>
            <p className="text-xs sm:text-sm text-foreground">
              Discover books collectors are actively watching
            </p>
          </div>
          
          <div className="flex items-center sm:flex-col sm:text-center gap-2 sm:gap-0 py-1 px-2 sm:p-3">
            <div className="h-7 w-7 sm:h-9 sm:w-9 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 sm:mb-2">
              <Camera className="h-3.5 w-3.5 sm:h-5 sm:w-5 text-primary" />
            </div>
            <p className="text-xs sm:text-sm text-foreground">
              Scan comics instantly with Scanner Assist
            </p>
          </div>
          
          <div className="flex items-center sm:flex-col sm:text-center gap-2 sm:gap-0 py-1 px-2 sm:p-3">
            <div className="h-7 w-7 sm:h-9 sm:w-9 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 sm:mb-2">
              <Wallet className="h-3.5 w-3.5 sm:h-5 sm:w-5 text-primary" />
            </div>
            <p className="text-xs sm:text-sm text-foreground">
              Buy and sell with transparent, collector-friendly fees
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
