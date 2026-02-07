import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ArrowDownToLine, Clock, CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { formatCents } from "@/lib/fees";
import { PayoutRequest } from "@/hooks/useSellerWallet";

interface PayoutRequestsListProps {
  requests: PayoutRequest[];
  loading?: boolean;
}

const STATUS_CONFIG: Record<string, {
  label: string;
  variant: "default" | "secondary" | "destructive" | "outline";
  icon: React.ElementType;
}> = {
  requested: { label: "Pending", variant: "secondary", icon: Clock },
  approved: { label: "Approved", variant: "default", icon: Loader2 },
  paid: { label: "Paid", variant: "default", icon: CheckCircle2 },
  rejected: { label: "Rejected", variant: "destructive", icon: XCircle },
};

export function PayoutRequestsList({ requests, loading }: PayoutRequestsListProps) {
  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Payout Requests</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-3">
            {[1, 2].map(i => (
              <div key={i} className="p-4 bg-muted rounded-lg">
                <div className="h-4 w-32 bg-muted-foreground/20 rounded mb-2" />
                <div className="h-3 w-24 bg-muted-foreground/20 rounded" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (requests.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Payout Requests</CardTitle>
          <CardDescription>Your payout history will appear here</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center py-10 px-4">
            <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-3">
              <ArrowDownToLine className="h-6 w-6 text-muted-foreground" />
            </div>
            <p className="text-sm font-medium mb-1">No payout requests yet</p>
            <p className="text-xs text-muted-foreground text-center max-w-xs">
              When you request a payout, it'll appear here so you can track its status.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Payout Requests</CardTitle>
        <CardDescription>Track the status of your payout requests</CardDescription>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[300px] pr-4">
          <div className="space-y-3">
            {requests.map((request) => {
              const config = STATUS_CONFIG[request.status] || STATUS_CONFIG.requested;
              const Icon = config.icon;

              return (
                <div
                  key={request.id}
                  className="p-4 rounded-lg border bg-card"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-lg font-bold">
                      {formatCents(request.amount_cents)}
                    </span>
                    <Badge variant={config.variant} className="flex items-center gap-1">
                      <Icon className={`h-3 w-3 ${request.status === "approved" ? "animate-spin" : ""}`} />
                      {config.label}
                    </Badge>
                  </div>
                  
                  <p className="text-sm text-muted-foreground">
                    Requested on {format(new Date(request.created_at), "MMM d, yyyy")}
                  </p>
                  
                  {request.note && (
                    <p className="text-sm text-muted-foreground mt-1 italic">
                      "{request.note}"
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
