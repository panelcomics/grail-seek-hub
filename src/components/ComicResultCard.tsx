import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { DollarSign, TrendingUp, Users } from "lucide-react";

interface ComicResultCardProps {
  comic: {
    comicvine_id: number;
    title: string;
    issue_number: string;
    full_title: string;
    publisher: string;
    year: number | null;
    cover_image: string;
    cover_thumb: string;
    description: string;
    characters: string[];
    ebay_avg_price: number;
    trade_fee_total: number;
    trade_fee_each: number;
    fee_tier: string;
  };
  userImage?: string | null; // User's captured/uploaded image
  onListForSwap: () => void;
}

export function ComicResultCard({ comic, userImage, onListForSwap }: ComicResultCardProps) {
  // Strip HTML from description
  const cleanDescription = comic.description
    ? comic.description.replace(/<[^>]*>/g, '').slice(0, 200) + '...'
    : '';

  // Use user's image as primary, ComicVine as fallback
  const primaryImage = userImage || comic.cover_image;
  const hasReferenceCover = userImage && comic.cover_image;

  return (
    <Card className="overflow-hidden border-2 border-primary/20 shadow-lg">
      {/* Comic Panel Header */}
      <div className="bg-gradient-to-r from-primary/10 via-accent/10 to-primary/10 p-4 border-b-4 border-primary">
        <h3 className="text-xl font-bold tracking-tight">
          {comic.title} #{comic.issue_number}
        </h3>
        {comic.year && (
          <p className="text-sm text-muted-foreground font-semibold">
            {comic.publisher} • {comic.year}
          </p>
        )}
      </div>

      <div className="grid md:grid-cols-2 gap-6 p-6">
        {/* Primary Image (user's photo) */}
        <div className="space-y-3">
          <div className="relative">
            <div className="aspect-[2/3] bg-muted rounded-lg overflow-hidden border-4 border-primary/30 shadow-lg">
              <img
                src={primaryImage}
                alt={comic.full_title}
                className="h-full w-full object-cover"
              />
            </div>
            <div className="absolute -bottom-3 -right-3 bg-primary text-primary-foreground rounded-full w-16 h-16 flex items-center justify-center border-4 border-background font-bold shadow-xl">
              #{comic.issue_number}
            </div>
          </div>

          {/* Reference cover thumbnail */}
          {hasReferenceCover && (
            <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg border border-border">
              <div className="w-16 h-24 rounded overflow-hidden border-2 border-border flex-shrink-0">
                <img
                  src={comic.cover_image}
                  alt="Reference cover"
                  className="h-full w-full object-cover"
                />
              </div>
              <div className="text-xs text-muted-foreground">
                <p className="font-semibold mb-1">ComicVine Reference</p>
                <p>Official cover for comparison</p>
              </div>
            </div>
          )}
        </div>

        {/* Details */}
        <div className="space-y-4">
          {/* Characters */}
          {comic.characters.length > 0 && (
            <div>
              <div className="flex items-center gap-2 text-sm font-semibold mb-2">
                <Users className="h-4 w-4 text-accent" />
                Featured Characters
              </div>
              <div className="flex flex-wrap gap-1.5">
                {comic.characters.map((char) => (
                  <Badge key={char} variant="secondary" className="text-xs">
                    {char}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {cleanDescription && (
            <p className="text-sm text-muted-foreground leading-relaxed">
              {cleanDescription}
            </p>
          )}

          <Separator />

          {/* Pricing Info */}
          <div className="space-y-3 bg-muted/50 rounded-lg p-4 border-2 border-accent/30">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-success" />
                <span className="font-semibold">eBay Sold Avg:</span>
              </div>
              <span className="text-2xl font-bold text-success">
                ${comic.ebay_avg_price.toLocaleString()}
              </span>
            </div>

            <Separator className="bg-border/50" />

            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <TrendingUp className="h-4 w-4 text-primary" />
                <span className="font-semibold">Swap Fee Breakdown</span>
              </div>
              
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="bg-background/80 p-2 rounded border">
                  <div className="text-muted-foreground text-xs">Total Fee</div>
                  <div className="font-bold text-primary">${comic.trade_fee_total}</div>
                </div>
                <div className="bg-background/80 p-2 rounded border">
                  <div className="text-muted-foreground text-xs">Your Share</div>
                  <div className="font-bold text-primary">${comic.trade_fee_each}</div>
                </div>
              </div>

              <div className="text-xs text-muted-foreground bg-accent/10 p-2 rounded border border-accent/30">
                <span className="font-semibold">Fee Tier:</span> {comic.fee_tier}
              </div>
            </div>
          </div>

          {/* Action Button */}
          <Button 
            onClick={onListForSwap}
            className="w-full h-12 text-lg font-bold shadow-lg hover:shadow-xl transition-all"
            size="lg"
          >
            Save to Collection
          </Button>

          <p className="text-xs text-center text-muted-foreground">
            Powered by Comic Vine & eBay data
          </p>
        </div>
      </div>
    </Card>
  );
}
