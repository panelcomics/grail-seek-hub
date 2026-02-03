import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  ArrowUpRight, 
  ArrowDownLeft, 
  Clock, 
  CheckCircle2, 
  AlertTriangle,
  Ban,
  Receipt
} from "lucide-react";
import { format } from "date-fns";
import { formatCents } from "@/lib/fees";
import { LedgerEntry } from "@/hooks/useSellerWallet";

interface WalletLedgerProps {
  entries: LedgerEntry[];
  loading?: boolean;
}

const ENTRY_TYPE_CONFIG: Record<string, { 
  label: string; 
  icon: React.ElementType; 
  colorClass: string;
  isCredit: boolean;
}> = {
  pending_credit: { 
    label: "Sale Pending", 
    icon: Clock, 
    colorClass: "text-muted-foreground",
    isCredit: true,
  },
  available_credit: { 
    label: "Funds Available", 
    icon: CheckCircle2, 
    colorClass: "text-green-600",
    isCredit: true,
  },
  hold: { 
    label: "Hold Applied", 
    icon: AlertTriangle, 
    colorClass: "text-amber-600",
    isCredit: false,
  },
  release_hold: { 
    label: "Hold Released", 
    icon: CheckCircle2, 
    colorClass: "text-green-600",
    isCredit: true,
  },
  fee: { 
    label: "Platform Fee", 
    icon: Receipt, 
    colorClass: "text-red-600",
    isCredit: false,
  },
  payout: { 
    label: "Payout", 
    icon: ArrowUpRight, 
    colorClass: "text-blue-600",
    isCredit: false,
  },
};

export function WalletLedger({ entries, loading }: WalletLedgerProps) {
  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-3">
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                <div className="h-8 w-8 bg-muted-foreground/20 rounded-full" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-32 bg-muted-foreground/20 rounded" />
                  <div className="h-3 w-24 bg-muted-foreground/20 rounded" />
                </div>
                <div className="h-5 w-16 bg-muted-foreground/20 rounded" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (entries.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Recent Activity</CardTitle>
          <CardDescription>Your transaction history will appear here</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <Receipt className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
            <p className="text-sm text-muted-foreground">
              No transactions yet. Complete your first sale to see activity.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Recent Activity</CardTitle>
        <CardDescription>Your latest wallet transactions</CardDescription>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[400px] pr-4">
          <div className="space-y-2">
            {entries.map((entry) => {
              const config = ENTRY_TYPE_CONFIG[entry.entry_type] || {
                label: entry.entry_type,
                icon: Receipt,
                colorClass: "text-muted-foreground",
                isCredit: entry.amount_cents > 0,
              };
              const Icon = config.icon;

              return (
                <div
                  key={entry.id}
                  className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className={`p-2 rounded-full bg-muted ${config.colorClass}`}>
                    <Icon className="h-4 w-4" />
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">{config.label}</span>
                    </div>
                    {entry.description && (
                      <p className="text-xs text-muted-foreground truncate">
                        {entry.description}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(entry.created_at), "MMM d, yyyy 'at' h:mm a")}
                    </p>
                  </div>

                  <div className={`text-right ${config.colorClass}`}>
                    <span className="font-semibold">
                      {config.isCredit ? "+" : "-"}
                      {formatCents(Math.abs(entry.amount_cents))}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
