import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface MakeOfferModalProps {
  isOpen: boolean;
  onClose: () => void;
  itemId: string;
  itemTitle: string;
  ownerId: string;
  currentUserId: string;
}

export const MakeOfferModal = ({
  isOpen,
  onClose,
  itemId,
  itemTitle,
  ownerId,
  currentUserId,
}: MakeOfferModalProps) => {
  const [message, setMessage] = useState("");
  const [cashOffer, setCashOffer] = useState("");
  const [itemsOffered, setItemsOffered] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!message.trim()) {
      toast.error("Please add a message");
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.from("trade_offers").insert({
        from_user_id: currentUserId,
        to_user_id: ownerId,
        item_id: itemId,
        message: message.trim(),
        cash_offer: cashOffer ? parseFloat(cashOffer) : null,
        items_offered: itemsOffered.trim() || null,
      });

      if (error) throw error;

      // Create notification for owner
      await supabase.from("notifications").insert({
        user_id: ownerId,
        type: "trade_offer",
        message: `New trade offer on ${itemTitle}`,
        link: `/trade/${itemId}`,
      });

      toast.success("Offer sent successfully!");
      onClose();
      setMessage("");
      setCashOffer("");
      setItemsOffered("");
    } catch (error: any) {
      console.error("Error sending offer:", error);
      toast.error(error.message || "Failed to send offer");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Make Trade Offer</DialogTitle>
          <DialogDescription>
            Send an offer for {itemTitle}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="message">Message to Seller *</Label>
            <Textarea
              id="message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Hi, I'm interested in your trade listing..."
              required
              rows={4}
              className="mt-1"
            />
          </div>
          
          <div>
            <Label htmlFor="cashOffer">Cash Offer (optional)</Label>
            <Input
              id="cashOffer"
              type="number"
              min="0"
              step="0.01"
              value={cashOffer}
              onChange={(e) => setCashOffer(e.target.value)}
              placeholder="0.00"
              className="mt-1"
            />
          </div>

          <div>
            <Label htmlFor="itemsOffered">Items You're Offering (optional)</Label>
            <Textarea
              id="itemsOffered"
              value={itemsOffered}
              onChange={(e) => setItemsOffered(e.target.value)}
              placeholder="Example: ASM #300 NM, Hulk #181 VG+, or link to your collection"
              rows={3}
              className="mt-1"
            />
          </div>

          <div className="flex gap-2 justify-end">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Sending..." : "Send Offer"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
