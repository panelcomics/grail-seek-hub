import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Calendar, MessageSquare, ArrowRightLeft, Loader2 } from "lucide-react";
import { updateTradeStatus, type TradeStatus } from "@/lib/trades/updateTradeStatus";
import { sendTradeNotification } from "@/lib/notifications/sendTradeNotification";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { TradeMessageThread } from "./TradeMessageThread";

interface TradeDrawerProps {
  trade: {
    id: string;
    listing_id: string;
    buyer_id: string;
    seller_id: string;
    status: string;
    created_at: string;
    message?: string | null;
    offer_title?: string;
    offer_issue?: string | null;
    listing_title?: string;
    listing_image?: string | null;
    buyer_username?: string;
    buyer_avatar?: string | null;
  } | null;
  open: boolean;
  onClose: () => void;
  onTradeUpdated?: () => void;
}

export function TradeDrawer({ trade, open, onClose, onTradeUpdated }: TradeDrawerProps) {
  const [isUpdating, setIsUpdating] = useState(false);

  if (!trade) return null;

  const handleUpdateStatus = async (newStatus: TradeStatus) => {
    setIsUpdating(true);
    
    const result = await updateTradeStatus(trade.id, newStatus);
    
    setIsUpdating(false);

    if (result.ok) {
      const message = newStatus === "approved" 
        ? "Trade approved — buyer will be notified."
        : "Trade declined.";
      toast.success(message);
      
      // Send email notification (best-effort, non-blocking)
      if (newStatus === "approved") {
        try {
          // Fetch buyer's email
          const { data: buyerProfile } = await supabase
            .from("profiles")
            .select("user_id")
            .eq("user_id", trade.buyer_id)
            .single();

          if (buyerProfile) {
            const { data: authData } = await supabase.auth.admin.getUserById(trade.buyer_id);
            
            if (authData?.user?.email) {
              sendTradeNotification({
                buyerEmail: authData.user.email,
                buyerName: trade.buyer_username,
                listingTitle: trade.listing_title || "Untitled Listing",
                offerTitle: trade.offer_title || "Unknown Item",
                offerIssue: trade.offer_issue,
                status: newStatus,
              }).catch(err => {
                console.error("[NOTIFICATIONS] Email notification failed (non-blocking):", err);
              });
            }
          }
        } catch (err) {
          console.error("[NOTIFICATIONS] Error fetching buyer info (non-blocking):", err);
        }
      }
      
      // Close drawer and trigger refresh
      onClose();
      if (onTradeUpdated) {
        onTradeUpdated();
      }
    } else {
      toast.error(result.error || "Unable to update trade status.");
    }
  };

  const getBuyerInitials = (username?: string) => {
    if (!username) return "B";
    return username.charAt(0).toUpperCase();
  };

  const getStatusBadge = (status: string) => {
    switch (status.toLowerCase()) {
      case "pending":
        return <Badge variant="outline">Pending</Badge>;
      case "approved":
        return <Badge className="bg-green-500 hover:bg-green-600">Approved</Badge>;
      case "declined":
        return <Badge variant="destructive">Declined</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Trade Request Details</SheetTitle>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {/* Status */}
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Status</span>
            {getStatusBadge(trade.status)}
          </div>

          <Separator />

          {/* Buyer Info */}
          <div>
            <h3 className="text-sm font-medium mb-3">From Buyer</h3>
            <div className="flex items-center gap-3">
              <Avatar>
                <AvatarImage src={trade.buyer_avatar || undefined} />
                <AvatarFallback>{getBuyerInitials(trade.buyer_username)}</AvatarFallback>
              </Avatar>
              <div>
                <p className="font-medium">{trade.buyer_username || "Anonymous"}</p>
                <p className="text-sm text-muted-foreground">Buyer</p>
              </div>
            </div>
          </div>

          <Separator />

          {/* Trade Details */}
          <div>
            <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
              <ArrowRightLeft className="h-4 w-4" />
              Trade Proposal
            </h3>
            
            <div className="space-y-4">
              {/* What they want */}
              <div className="bg-muted/50 p-4 rounded-md">
                <p className="text-xs text-muted-foreground mb-2">They want your:</p>
                <div className="flex gap-3">
                  {trade.listing_image && (
                    <img
                      src={trade.listing_image}
                      alt={trade.listing_title || "Your listing"}
                      className="h-20 w-14 object-cover rounded border"
                    />
                  )}
                  <div className="flex-1">
                    <p className="font-medium text-sm">{trade.listing_title || "Your Listing"}</p>
                  </div>
                </div>
              </div>

              {/* What they offer */}
              <div className="bg-primary/5 p-4 rounded-md border border-primary/20">
                <p className="text-xs text-muted-foreground mb-2">They offer:</p>
                <div>
                  <p className="font-medium text-sm">
                    {trade.offer_title}
                    {trade.offer_issue && ` #${trade.offer_issue}`}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    (Item from their collection)
                  </p>
                </div>
              </div>
            </div>
          </div>

          <Separator />

          {/* Buyer Message */}
          {trade.message && (
            <>
              <div>
                <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
                  <MessageSquare className="h-4 w-4" />
                  Buyer Message
                </h3>
                <p className="text-sm bg-muted p-3 rounded-md">{trade.message}</p>
              </div>
              <Separator />
            </>
          )}

          {/* Timestamp */}
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Calendar className="h-4 w-4" />
            <span>Received {new Date(trade.created_at).toLocaleString()}</span>
          </div>

          <Separator />

          {/* Message Thread */}
          <TradeMessageThread 
            tradeId={trade.id}
            buyerId={trade.buyer_id}
            sellerId={trade.seller_id}
          />

          <Separator />

          {/* Action Buttons */}
          {trade.status.toLowerCase() === "pending" && (
            <div className="flex gap-3 pt-4">
              <Button
                className="flex-1 bg-green-600 hover:bg-green-700"
                disabled={isUpdating}
                onClick={() => handleUpdateStatus("approved")}
              >
                {isUpdating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Updating...
                  </>
                ) : (
                  "Approve Trade"
                )}
              </Button>
              <Button
                variant="destructive"
                className="flex-1"
                disabled={isUpdating}
                onClick={() => handleUpdateStatus("declined")}
              >
                {isUpdating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Updating...
                  </>
                ) : (
                  "Decline Trade"
                )}
              </Button>
            </div>
          )}

          {trade.status.toLowerCase() !== "pending" && (
            <p className="text-sm text-muted-foreground text-center">
              This trade has already been {trade.status.toLowerCase()}.
            </p>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
