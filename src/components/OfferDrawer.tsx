import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Calendar, MessageSquare, DollarSign, Loader2 } from "lucide-react";
import { updateOfferStatus, type OfferStatus } from "@/lib/offers/updateOfferStatus";
import { sendOfferNotification } from "@/lib/notifications/sendOfferNotification";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface OfferDrawerProps {
  offer: {
    id: string;
    listing_id: string;
    buyer_id: string;
    offer_amount: number;
    status: string;
    created_at: string;
    message?: string | null;
    listing_title?: string;
    listing_image?: string | null;
    buyer_username?: string;
    buyer_avatar?: string | null;
  } | null;
  open: boolean;
  onClose: () => void;
  onOfferUpdated?: () => void;
}

export function OfferDrawer({ offer, open, onClose, onOfferUpdated }: OfferDrawerProps) {
  const [isUpdating, setIsUpdating] = useState(false);

  if (!offer) return null;

  const handleUpdateStatus = async (newStatus: OfferStatus) => {
    setIsUpdating(true);
    
    const result = await updateOfferStatus(offer.id, newStatus);
    
    setIsUpdating(false);

    if (result.ok) {
      const message = newStatus === "accepted" 
        ? "Offer accepted — buyer will be notified."
        : "Offer declined.";
      toast.success(message);
      
      // Send email notification (best-effort, non-blocking)
      if (newStatus === "accepted") {
        try {
          // Fetch buyer's email
          const { data: buyerProfile } = await supabase
            .from("profiles")
            .select("user_id")
            .eq("user_id", offer.buyer_id)
            .single();

          if (buyerProfile) {
            const { data: authData } = await supabase.auth.admin.getUserById(offer.buyer_id);
            
            if (authData?.user?.email) {
              sendOfferNotification({
                buyerEmail: authData.user.email,
                buyerName: offer.buyer_username,
                listingTitle: offer.listing_title || "Untitled Listing",
                offerAmount: offer.offer_amount,
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
      if (onOfferUpdated) {
        onOfferUpdated();
      }
    } else {
      toast.error(result.error || "Unable to update offer status.");
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
      case "accepted":
        return <Badge className="bg-green-500 hover:bg-green-600">Accepted</Badge>;
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
          <SheetTitle>Offer Details</SheetTitle>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {/* Status */}
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Status</span>
            {getStatusBadge(offer.status)}
          </div>

          <Separator />

          {/* Buyer Info */}
          <div>
            <h3 className="text-sm font-medium mb-3">Buyer</h3>
            <div className="flex items-center gap-3">
              <Avatar>
                <AvatarImage src={offer.buyer_avatar || undefined} />
                <AvatarFallback>{getBuyerInitials(offer.buyer_username)}</AvatarFallback>
              </Avatar>
              <div>
                <p className="font-medium">{offer.buyer_username || "Anonymous"}</p>
                <p className="text-sm text-muted-foreground">Buyer</p>
              </div>
            </div>
          </div>

          <Separator />

          {/* Offer Amount */}
          <div>
            <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Offer Amount
            </h3>
            <p className="text-2xl font-bold text-primary">
              ${offer.offer_amount.toFixed(2)}
            </p>
          </div>

          <Separator />

          {/* Buyer Message */}
          {offer.message && (
            <>
              <div>
                <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
                  <MessageSquare className="h-4 w-4" />
                  Buyer Message
                </h3>
                <p className="text-sm bg-muted p-3 rounded-md">{offer.message}</p>
              </div>
              <Separator />
            </>
          )}

          {/* Listing Info */}
          <div>
            <h3 className="text-sm font-medium mb-3">Listing</h3>
            <div className="flex gap-3">
              {offer.listing_image && (
                <img
                  src={offer.listing_image}
                  alt={offer.listing_title || "Listing"}
                  className="h-24 w-16 object-cover rounded border"
                />
              )}
              <div className="flex-1">
                <p className="font-medium">{offer.listing_title || "Untitled Listing"}</p>
              </div>
            </div>
          </div>

          <Separator />

          {/* Timestamp */}
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Calendar className="h-4 w-4" />
            <span>Received {new Date(offer.created_at).toLocaleString()}</span>
          </div>

          {/* Action Buttons */}
          {offer.status.toLowerCase() === "pending" && (
            <div className="flex gap-3 pt-4">
              <Button
                className="flex-1 bg-green-600 hover:bg-green-700"
                disabled={isUpdating}
                onClick={() => handleUpdateStatus("accepted")}
              >
                {isUpdating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Updating...
                  </>
                ) : (
                  "Accept Offer"
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
                  "Decline Offer"
                )}
              </Button>
            </div>
          )}

          {offer.status.toLowerCase() !== "pending" && (
            <p className="text-sm text-muted-foreground text-center">
              This offer has already been {offer.status.toLowerCase()}.
            </p>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
