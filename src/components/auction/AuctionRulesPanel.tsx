import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ShieldCheck } from "lucide-react";

export function AuctionRulesPanel() {
  return (
    <Card className="border-border/50">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-bold flex items-center gap-2 text-foreground">
          <ShieldCheck className="h-4 w-4 text-primary" />
          Auction Rules (Preview)
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-xs text-muted-foreground leading-relaxed">
        <ul className="space-y-2.5">
          <li className="flex gap-2">
            <span className="text-primary font-bold mt-0.5">•</span>
            <span>Auctions end at the scheduled time (hard close)</span>
          </li>
          <li className="flex gap-2">
            <span className="text-primary font-bold mt-0.5">•</span>
            <span>No automatic extensions</span>
          </li>
          <li className="flex gap-2">
            <span className="text-primary font-bold mt-0.5">•</span>
            <span>Highest bid at closing time wins</span>
          </li>
          <li className="flex gap-2">
            <span className="text-primary font-bold mt-0.5">•</span>
            <span>Bids placed near the end may prevent other bidders from responding</span>
          </li>
          <li className="flex gap-2">
            <span className="text-primary font-bold mt-0.5">•</span>
            <span>All bids are binding when auctions are live</span>
          </li>
        </ul>
        <p className="text-[11px] text-muted-foreground/70 pt-1 border-t border-border/30">
          These rules apply once auctions are activated. Preview items are not yet accepting bids.
        </p>
      </CardContent>
    </Card>
  );
}
