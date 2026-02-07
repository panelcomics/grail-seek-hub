import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ShieldCheck, Clock, Lock } from "lucide-react";

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
        {/* Close rules */}
        <div className="space-y-2">
          <div className="flex items-center gap-1.5 text-[11px] font-semibold text-foreground uppercase tracking-wide">
            <Lock className="h-3 w-3" />
            Closing Policy
          </div>
          <ul className="space-y-2">
            <RuleItem>Auctions end at the scheduled time (hard close)</RuleItem>
            <RuleItem>No automatic extensions</RuleItem>
            <RuleItem>Highest bid at closing time wins</RuleItem>
          </ul>
        </div>

        {/* Stagger rules */}
        <div className="space-y-2 pt-1 border-t border-border/30">
          <div className="flex items-center gap-1.5 text-[11px] font-semibold text-foreground uppercase tracking-wide">
            <Clock className="h-3 w-3" />
            Staggered Lot Close
          </div>
          <ul className="space-y-2">
            <RuleItem>Event auctions close lots sequentially (e.g., 20 seconds apart)</RuleItem>
            <RuleItem>Each lot's exact close time is shown on its detail page</RuleItem>
            <RuleItem>Bids placed near the end may prevent other bidders from responding</RuleItem>
          </ul>
        </div>

        {/* Binding */}
        <div className="space-y-2 pt-1 border-t border-border/30">
          <ul className="space-y-2">
            <RuleItem>All bids are binding when auctions are live</RuleItem>
          </ul>
        </div>

        <p className="text-[11px] text-muted-foreground/70 pt-1 border-t border-border/30">
          These rules apply once auctions are activated. Preview items are not yet accepting bids.
        </p>
      </CardContent>
    </Card>
  );
}

function RuleItem({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex gap-2">
      <span className="text-primary font-bold mt-0.5">•</span>
      <span>{children}</span>
    </li>
  );
}
