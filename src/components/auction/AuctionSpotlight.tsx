import { Gavel, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";
import { SAMPLE_AUCTIONS } from "@/config/auctionConfig";
import { AuctionPreviewCard } from "./AuctionPreviewCard";

export function AuctionSpotlight() {
  const displayAuctions = SAMPLE_AUCTIONS.slice(0, 8);

  if (displayAuctions.length === 0) {
    return (
      <section className="py-10 px-4">
        <div className="container mx-auto text-center">
          <div className="flex items-center justify-center gap-2 mb-3">
            <Gavel className="h-6 w-6 text-primary" />
            <h2 className="text-2xl font-black text-foreground">Auction Preview — Coming Soon</h2>
          </div>
           <p className="text-muted-foreground">
             See how curated auction events will work on GrailSeeker. Bidding opens after beta.
           </p>
        </div>
      </section>
    );
  }

  return (
    <section className="py-10 bg-muted/30">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center h-10 w-10 rounded-lg bg-primary/10">
              <Gavel className="h-5 w-5 text-primary" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-2xl md:text-3xl font-black text-foreground">
                  Auction Preview — Coming Soon
                </h2>
                <Badge variant="outline" className="text-[10px] font-semibold text-muted-foreground border-muted-foreground/30">
                  Preview
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                See how curated auction events will work on GrailSeeker. Bidding opens after beta.
              </p>
            </div>
          </div>
          <Link to="/auction/auction-preview-1" className="hidden sm:block">
            <Button variant="link" className="gap-1 text-primary hover:text-primary/80">
              See all auction previews <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>

        {/* Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 md:gap-4">
          {displayAuctions.slice(0, 4).map((auction) => (
            <AuctionPreviewCard key={auction.id} auction={auction} />
          ))}
        </div>

        {/* Show more on larger screens */}
        <div className="hidden lg:grid lg:grid-cols-4 gap-4 mt-4">
          {displayAuctions.slice(4, 8).map((auction) => (
            <AuctionPreviewCard key={auction.id} auction={auction} />
          ))}
        </div>

        {/* Mobile CTA */}
        <div className="sm:hidden mt-4 text-center">
          <Link to="/auction/auction-preview-1">
            <Button variant="outline" size="sm" className="gap-1">
              See all auction previews <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>

        {/* Seller CTA */}
        <div className="mt-6 rounded-lg border border-border/50 bg-background/50 p-4 text-center space-y-2">
          <p className="text-sm text-foreground font-medium">
            Want to run an auction event on GrailSeeker?
          </p>
          <p className="text-xs text-muted-foreground">
            Curated seller shows and auction houses are opening soon.
          </p>
          <Link to="/seller/onboarding">
            <Button variant="destructive" size="sm" className="mt-1 text-xs font-bold gap-1.5">
              <Gavel className="h-3.5 w-3.5" />
              Apply to Run an Auction Show
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
}
